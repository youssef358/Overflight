import type { NextRequest } from "next/server";
import { listQuerySchema } from "@/lib/pylons";
import { listPylons } from "@/lib/pylons-repo";

// GET /api/pylons?condition=defect&line=L-ESS-01
export async function GET(request: NextRequest) {
  const query = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = listQuerySchema.safeParse(query);
  if (!parsed.success) {
    return Response.json({ error: "invalid query", issues: parsed.error.issues }, { status: 400 });
  }
  return Response.json(await listPylons(parsed.data));
}
