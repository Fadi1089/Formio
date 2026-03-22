"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu } from "@base-ui/react";
import { createClient } from "@/lib/supabase/client";

function Avatar({ email }: { email: string }) {
  const initial = email ? email[0].toUpperCase() : "?";
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground select-none">
      {initial}
    </span>
  );
}

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Account menu"
        className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors"
      >
        <Avatar email={email} />
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className="text-muted-foreground"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6}>
          <Menu.Popup className="z-50 min-w-48 rounded-lg border bg-background shadow-md outline-none data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-100">
            {/* Email header — non-interactive */}
            <div className="px-3 py-2.5 border-b">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium truncate max-w-48">{email}</p>
            </div>

            <div className="p-1">
              <Menu.Item
                className="flex w-full items-center rounded-md px-2 py-1.5 text-sm outline-none cursor-pointer hover:bg-muted focus-visible:bg-muted"
                render={<Link href="/dashboard/profile" />}
              >
                Profile
              </Menu.Item>

              <Menu.Item
                className="flex w-full items-center rounded-md px-2 py-1.5 text-sm text-destructive outline-none cursor-pointer hover:bg-destructive/10 focus-visible:bg-destructive/10"
                onClick={handleSignOut}
              >
                Sign out
              </Menu.Item>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
