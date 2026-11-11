import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie, SESSION_COOKIE } from "@/lib/auth";
import { deleteSession } from "@/lib/sessions-repo";

// POST /api/auth/logout: the session is deleted in the database, not only forgotten
// by the browser, so a copied cookie stops working too.
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  return clearSessionCookie(new NextResponse(null, { status: 204 }));
}
