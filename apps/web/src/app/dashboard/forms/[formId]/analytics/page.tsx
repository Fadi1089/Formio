import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAnalytics, getForm } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  LINEAR_SCALE: "Linear scale",
  DROPDOWN: "Dropdown",
  DATE: "Date",
  TIME: "Time",
};

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/");

  let form;
  let analytics;
  try {
    [form, analytics] = await Promise.all([
      getForm(session.access_token, formId),
      getAnalytics(session.access_token, formId),
    ]);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{form.title}</h1>
          <p className="text-sm text-muted-foreground">Analytics</p>
        </div>
        <div className="flex items-center gap-2">
          {analytics.totalResponses > 0 && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/export/${formId}`} download>
                Export CSV
              </a>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/forms/${formId}`}>← Builder</Link>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total responses</p>
          <p className="mt-1 text-3xl font-semibold">{analytics.totalResponses}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Questions</p>
          <p className="mt-1 text-3xl font-semibold">{analytics.questions.length}</p>
        </div>
        <div className="rounded-lg border p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-1">
            <Badge variant={form.isPublished ? "default" : "secondary"}>
              {form.isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {analytics.timeline.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium">Responses over time</h2>
          <div className="rounded-lg border divide-y">
            {analytics.timeline.map(({ date, count }) => (
              <div
                key={date}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span className="text-sm">{date}</span>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-question breakdown */}
      {analytics.questions.length > 0 && (
        <div className="space-y-6">
          <Separator />
          <h2 className="text-sm font-medium">Question breakdown</h2>

          {analytics.questions.map((q, i) => (
            <div key={q.questionId} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-medium text-sm">
                    {i + 1}. {q.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {QUESTION_TYPE_LABELS[q.type]} · {q.totalAnswers} answer
                    {q.totalAnswers === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {/* Choice distribution */}
              {q.distribution && q.distribution.length > 0 && (
                <div className="space-y-2">
                  {q.distribution.map((d) => (
                    <div key={d.optionId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{d.label}</span>
                        <span className="text-muted-foreground">
                          {d.count} ({d.percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-foreground/70"
                          style={{ width: `${d.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Linear scale */}
              {q.type === "LINEAR_SCALE" && (
                <div className="text-sm space-y-2">
                  {q.average !== null && q.average !== undefined && (
                    <p>
                      Average:{" "}
                      <span className="font-medium">{q.average}</span>
                    </p>
                  )}
                  {q.scaleCounts && q.scaleCounts.length > 0 && (
                    <div className="flex gap-3">
                      {q.scaleCounts.map(({ value, count }) => (
                        <div
                          key={value}
                          className="text-center text-xs text-muted-foreground"
                        >
                          <div className="font-medium text-foreground">{count}</div>
                          <div>{value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Text responses */}
              {q.textResponses && q.textResponses.length > 0 && (
                <div className="space-y-1.5 rounded-lg border p-3">
                  {q.textResponses.slice(0, 10).map((text, j) => (
                    <p key={j} className="text-xs text-muted-foreground">
                      "{text}"
                    </p>
                  ))}
                  {q.textResponses.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      +{q.textResponses.length - 10} more
                    </p>
                  )}
                </div>
              )}

              {q.totalAnswers === 0 && (
                <p className="text-xs text-muted-foreground">No answers yet.</p>
              )}

              {i < analytics.questions.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      )}

      {analytics.totalResponses === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No responses yet.</p>
          {form.isPublished && (
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href={`/f/${form.publicId}`} target="_blank">
                Open public form ↗
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
