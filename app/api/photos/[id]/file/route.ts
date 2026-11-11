import type { NextRequest } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { photoIdSchema } from "@/lib/photos";
import { getStorageKey } from "@/lib/photos-repo";
import { readPhotoFile } from "@/lib/storage";

// GET /api/photos/42/file: the JPEG itself, for <img src> (the browser sends the cookie).
export async function GET(request: NextRequest, ctx: RouteContext<"/api/photos/[id]/file">) {
  if (!(await getSessionUser(request))) return unauthorized();
  const id = photoIdSchema.safeParse((await ctx.params).id);
  if (!id.success) {
    return Response.json({ error: "id must be a positive integer" }, { status: 400 });
  }

  const storageKey = await getStorageKey(id.data);
  const bytes = storageKey ? await readPhotoFile(storageKey) : null;
  if (!bytes) return Response.json({ error: "photo not found" }, { status: 404 });

  // Uint8Array: TypeScript does not accept a Node Buffer as a Response body.
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      // The browser must trust Content-Type and never guess another type from the bytes.
      "X-Content-Type-Options": "nosniff",
      // A photo's file never changes, so the browser can keep it. "private": shared
      // caches (proxies, CDNs) must not store a file that will need a login.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
