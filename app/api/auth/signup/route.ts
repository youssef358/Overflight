import { NextResponse, type NextRequest } from "next/server";
import { credentialsSchema, setSessionCookie } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/sessions-repo";
import { createUser } from "@/lib/users-repo";

// POST /api/auth/signup  body: { "email": "...", "password": "..." }
// A new account is logged in straight away.
export async function POST(request: NextRequest) {
  const body = credentialsSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "A valid email and a password of 8 to 200 characters are required.", issues: body.error.issues },
      { status: 400 },
    );
  }

  const user = await createUser(body.data.email, await hashPassword(body.data.password));
  if (!user) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  return setSessionCookie(NextResponse.json(user, { status: 201 }), await createSession(user.id));
}
