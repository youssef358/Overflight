import { listPhotos } from "@/lib/photos-repo";

// GET /api/photos: every photo, newest first (the team map is shared).
export async function GET() {
  return Response.json(await listPhotos());
}
