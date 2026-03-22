import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getForms } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "@/lib/date";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/");

  const { forms } = await getForms(session.access_token);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Forms</h1>
          <p className="text-sm text-muted-foreground">
            {forms.length === 0
              ? "No forms yet."
              : `${forms.length} form${forms.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/forms/new">New form</Link>
        </Button>
      </div>

      {forms.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Create your first form to get started.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/forms/new">Create form</Link>
          </Button>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {forms.map((form) => (
            <div key={form.id} className="flex items-center justify-between p-4">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{form.title}</span>
                  <Badge variant={form.isPublished ? "default" : "secondary"}>
                    {form.isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {form._count.responses} response
                  {form._count.responses === 1 ? "" : "s"} ·{" "}
                  {formatDistanceToNow(form.updatedAt)}
                </p>
              </div>
              <div className="ml-4 flex shrink-0 gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/dashboard/forms/${form.id}/analytics`}>
                    Analytics
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/forms/${form.id}`}>Edit</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
