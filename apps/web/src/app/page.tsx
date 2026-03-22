import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInForm } from "./_components/sign-in-form";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Formio</h1>
          <p className="text-sm text-muted-foreground">
            Build and share forms. Collect responses. Understand your audience.
          </p>
        </div>

        {error === "auth" && (
          <p className="text-sm text-destructive">
            Sign-in failed. Please try again.
          </p>
        )}

        <SignInForm />

        <p className="text-xs text-muted-foreground">
          Signing in creates a creator account. Respondents never need to sign
          in.
        </p>
      </div>
    </div>
  );
}
