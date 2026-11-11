import type { NextRequest } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { photoIdSchema } from "@/lib/photos";
import { deleteOwnPhoto, photoExists } from "@/lib/photos-repo";
import { deletePhotoFile } from "@/lib/storage";

// DELETE /api/photos/42: only the person who uploaded a photo may delete it; its comments go with it.
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/photos/[id]">) {
  const user = await getSessionUser(request);
  if (!user) return unauthorized();
  const id = photoIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return Response.json({ error: "The photo id must be a positive integer." }, { status: 400 });

  const storageKey = await deleteOwnPhoto(id.data, user.id);
  if (!storageKey) {
    // Nothing was deleted: the photo does not exist, or it is someone else's.
    return (await photoExists(id.data))
      ? Response.json({ error: "Only the person who uploaded this photo can delete it." }, { status: 403 })
      : Response.json({ error: "This photo does not exist." }, { status: 404 });
  }

  // Row first, then the file (the reverse of the upload): if this fails, an unused file stays
  // on disk, but the map never shows a photo whose image is gone.
  await deletePhotoFile(storageKey).catch((err) => console.error("could not delete file", storageKey, err));
  return new Response(null, { status: 204 });
}
