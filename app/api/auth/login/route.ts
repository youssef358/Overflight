import { NextResponse, type NextRequest } from "next/server";
import { credentialsSchema, setSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/sessions-repo";
import { findUserByEmail } from "@/lib/users-repo";

// POST /api/auth/login  body: { "email": "...", "password": "..." }
export async function POST(request: NextRequest) {
  const body = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  // One answer for an unknown email and for a wrong password: the login form
  // does not tell anyone which emails have an account.
  const user = await findUserByEmail(body.data.email);
  if (!user || !(await verifyPassword(body.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }

  return setSessionCookie(NextResponse.json({ id: user.id, email: user.email }), await createSession(user.id));
}
