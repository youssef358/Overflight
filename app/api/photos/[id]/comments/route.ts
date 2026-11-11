import type { NextRequest } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { commentBodySchema } from "@/lib/comments";
import { createComment, listComments } from "@/lib/comments-repo";
import { photoIdSchema } from "@/lib/photos";
import { photoExists } from "@/lib/photos-repo";

type Context = RouteContext<"/api/photos/[id]/comments">;

const badId = () => Response.json({ error: "The photo id must be a positive integer." }, { status: 400 });
const noPhoto = () => Response.json({ error: "This photo does not exist." }, { status: 404 });

// GET /api/photos/42/comments: the photo's comments, oldest first.
export async function GET(request: NextRequest, ctx: Context) {
  if (!(await getSessionUser(request))) return unauthorized();
  const id = photoIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return badId();
  if (!(await photoExists(id.data))) return noPhoto();
  return Response.json(await listComments(id.data));
}

// POST /api/photos/42/comments  body: { "body": "..." }. The author is the session's user.
export async function POST(request: NextRequest, ctx: Context) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  const id = photoIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return badId();

  const input = commentBodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return Response.json({ error: "A comment must be 1 to 1000 characters.", issues: input.error.issues }, { status: 400 });
  }

  const comment = await createComment(id.data, user.id, input.data.body);
  return comment ? Response.json(comment, { status: 201 }) : noPhoto();
}
