import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "./_components/user-menu";

// getSession() reads from cookies — no network call, so this stays fast.
// The proxy already validated the session before this layout runs.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const email = session?.user?.email ?? "";

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-12 max-w-4xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-sm font-semibold">
            Formio
          </Link>
          <UserMenu email={email} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
