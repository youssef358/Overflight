// Server only: the session cookie and the signup/login body.
import type { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_DAYS } from "./sessions-repo";

export const SESSION_COOKIE = "session";

// Emails are trimmed and lowercased before anything else, so "Bob@X.com " and
// "bob@x.com" are the same account (the database refuses anything not lowercase).
// The upper limit keeps a huge string from being sent to scrypt.
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(200),
});

// httpOnly: page scripts cannot read the cookie, so an XSS bug cannot steal it.
// sameSite "lax": not sent with POSTs coming from another site, so that site cannot act as the user.
// secure in production: sent over HTTPS only.
export function setSessionCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
