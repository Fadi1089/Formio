"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { upsertCreator } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

export function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    if (mode === "signin") {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !data.session) {
        setError(authError?.message ?? "Sign-in failed. Please try again.");
        setLoading(false);
        return;
      }

      await upsertCreator(data.session.access_token, {
        email: data.user.email!,
        name: null,
        avatarUrl: null,
      }).catch(() => {});

      router.push("/dashboard");
      router.refresh();
    } else {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // If email confirmation is disabled, session is available immediately.
      if (data.session) {
        await upsertCreator(data.session.access_token, {
          email: data.user!.email!,
          name: null,
          avatarUrl: null,
        }).catch(() => {});

        router.push("/dashboard");
        router.refresh();
      } else {
        // Email confirmation required — tell the user to check their inbox.
        setCheckEmail(true);
        setLoading(false);
      }
    }
  }

  if (checkEmail) {
    return (
      <div className="space-y-3 rounded-lg border p-5 text-sm">
        <p className="font-medium">Check your email</p>
        <p className="text-muted-foreground">
          We sent a confirmation link to <span className="font-medium">{email}</span>.
          Click it to activate your account, then come back and sign in.
        </p>
        <button
          className="text-sm underline text-muted-foreground"
          onClick={() => { setCheckEmail(false); setMode("signin"); }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "signin" ? (
          <>
            No account?{" "}
            <button type="button" className="underline" onClick={() => switchMode("signup")}>
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" className="underline" onClick={() => switchMode("signin")}>
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  );
}
