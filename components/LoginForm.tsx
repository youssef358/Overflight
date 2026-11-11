"use client";
import { useState } from "react";
import { card, input as inputClass, primaryButton, secondaryButton } from "@/lib/ui";
import type { User } from "@/lib/users";

type Props = { onLoggedIn: (user: User) => void };

// One form, two actions: the button pressed picks /api/auth/login or /api/auth/signup.
// Both answer with the user and set the session cookie, so the next step is the same.
export function LoginForm({ onLoggedIn }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send(action: "login" | "signup") {
    setSending(true);
    setError(null);
    const res = await fetch(`/api/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);
    const answer = await res?.json().catch(() => null);
    setSending(false);
    if (res?.ok) return onLoggedIn(answer);
    setError(answer?.error ?? "Network error, try again.");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Photo map</h1>
        <p className="text-muted">Log in or create an account to see the team&apos;s photos.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send("login");
        }}
        className={`${card} space-y-3 p-5`}
      >
        <label className="block text-sm">
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm">
          Password <span className="text-muted">(at least 8 characters)</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={sending} className={primaryButton}>
            Log in
          </button>
          <button type="button" disabled={sending} onClick={() => send("signup")} className={secondaryButton}>
            Create account
          </button>
        </div>
      </form>
    </main>
  );
}
