import type { NextRequest } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/auth";

// GET /api/auth/me: who is logged in. The page asks this first to show the app or the login form.
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  return user ? Response.json(user) : unauthorized();
}
