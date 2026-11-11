import type { NextRequest } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { commentExists, deleteOwnComment } from "@/lib/comments-repo";
import { photoIdSchema } from "@/lib/photos";

type Context = RouteContext<"/api/photos/[id]/comments/[commentId]">;

// DELETE /api/photos/42/comments/7: only the comment's author may delete it.
export async function DELETE(request: NextRequest, ctx: Context) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  const { id, commentId } = await ctx.params;
  // Same rule for both ids: a positive integer within Postgres's int range.
  const photo = photoIdSchema.safeParse(id);
  const comment = photoIdSchema.safeParse(commentId);
  if (!photo.success || !comment.success) {
    return Response.json({ error: "The photo and comment ids must be positive integers." }, { status: 400 });
  }

  if (await deleteOwnComment(photo.data, comment.data, user.id)) return new Response(null, { status: 204 });
  return (await commentExists(photo.data, comment.data))
    ? Response.json({ error: "Only the author of this comment can delete it." }, { status: 403 })
    : Response.json({ error: "This comment does not exist." }, { status: 404 });
}
