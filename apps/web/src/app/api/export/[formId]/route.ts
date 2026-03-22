import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function csvCell(value: string): string {
  // RFC 4180: wrap in quotes if value contains comma, quote, or newline
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiRes = await fetch(`${API_URL}/api/v1/forms/${formId}/responses`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!apiRes.ok) {
    const status = apiRes.status === 403 ? 403 : apiRes.status === 404 ? 404 : 502;
    return NextResponse.json({ error: "Failed to fetch responses" }, { status });
  }

  const data = (await apiRes.json()) as {
    formTitle: string;
    questions: { id: string; label: string; type: string }[];
    responses: {
      id: string;
      submittedAt: string;
      answers: Record<string, string | string[]>;
    }[];
  };

  // Build CSV
  const rows: string[] = [];

  // Header row
  const header = [
    "Response ID",
    "Submitted At",
    ...data.questions.map((q) => q.label),
  ]
    .map(csvCell)
    .join(",");
  rows.push(header);

  // Data rows
  for (const response of data.responses) {
    const cells = [
      response.id,
      response.submittedAt,
      ...data.questions.map((q) => {
        const answer = response.answers[q.id];
        if (answer === undefined || answer === null) return "";
        if (Array.isArray(answer)) return answer.join(" | ");
        return answer;
      }),
    ].map(csvCell);
    rows.push(cells.join(","));
  }

  // UTF-8 BOM + CRLF line endings (Excel compatibility)
  const csv = "\uFEFF" + rows.join("\r\n");
  const filename = `${slugify(data.formTitle) || "responses"}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
