import type { NextRequest } from "next/server";
import { patchPylonSchema } from "@/lib/pylons";
import { updatePylonCondition } from "@/lib/pylons-repo";

// PATCH /api/pylons/42   body: { "condition": "defect" }
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/pylons/[id]">) {
  const { id } = await ctx.params; // params is a Promise in Next 15+
  const pylonId = Number(id);
  if (!Number.isInteger(pylonId) || pylonId <= 0) {
    return Response.json({ error: "id must be a positive integer" }, { status: 400 });
  }

  const body = patchPylonSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "invalid body", issues: body.error.issues }, { status: 400 });
  }

  const updated = await updatePylonCondition(pylonId, body.data.condition);
  if (!updated) return Response.json({ error: "pylon not found" }, { status: 404 });
  return Response.json(updated);
}
