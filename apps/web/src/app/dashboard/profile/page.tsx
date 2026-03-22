import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCreator } from "@/lib/api";
import { SignOutButton } from "../_components/sign-out-button";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/");

  let creator;
  try {
    creator = await getCreator(session.access_token);
  } catch {
    // Creator record may not exist yet — fall back to session data.
    creator = null;
  }

  const email = creator?.email ?? session.user.email ?? "";
  const name = creator?.name ?? null;
  const memberSince = creator?.createdAt
    ? new Date(creator.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const initial = email ? email[0].toUpperCase() : "?";

  return (
    <div className="max-w-sm space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Your account details.</p>
      </div>

      <div className="rounded-lg border p-6 space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground select-none">
            {initial}
          </span>
          <div className="min-w-0">
            {name && <p className="font-medium truncate">{name}</p>}
            <p className="text-sm text-muted-foreground truncate">{email}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium truncate">{email}</span>
          </div>
          {memberSince && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-medium">{memberSince}</span>
            </div>
          )}
        </div>
      </div>

      <SignOutButton />
    </div>
  );
}
