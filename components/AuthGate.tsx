"use client";
import { useEffect, useState } from "react";
import { LoginForm } from "@/components/LoginForm";
import { PhotoApp } from "@/components/PhotoApp";
import type { User } from "@/lib/users";

// Shows the login form or the app. The page itself is the same for everyone and holds
// no data: every API route checks the session, so this only decides what to display.
export function AuthGate() {
  // undefined: still asking the server; null: not logged in.
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setUser(null);
  }

  if (user === undefined) return <p className="p-6 text-muted">Loading…</p>;
  if (user === null) return <LoginForm onLoggedIn={setUser} />;
  return <PhotoApp user={user} onLogout={logout} />;
}
