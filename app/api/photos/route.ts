import { createHash, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { describePhoto } from "@/lib/ai";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, type Photo, uploadFieldsSchema } from "@/lib/photos";
import { createPhoto, listPhotos, setDescription } from "@/lib/photos-repo";
import { deletePhotoFile, savePhotoFile } from "@/lib/storage";

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

// Trust the bytes, not the file name or the type the browser claims: a JPEG starts with FF D8 FF.
const isJpeg = (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

// GET /api/photos: every photo, newest first (the team map is shared by all logged-in users).
export async function GET(request: NextRequest) {
  if (!(await getSessionUser(request))) return unauthorized();
  return Response.json(await listPhotos());
}

// POST /api/photos (multipart form): file, lat, lng, locationSource.
export async function POST(request: NextRequest) {
  // First, before reading anything: who is uploading.
  const user = await getSessionUser(request);
  if (!user) return unauthorized();

  // Refuse a body that says it is too big before reading it into memory
  // (64 KB of margin for the text fields and the multipart separators).
  if (Number(request.headers.get("content-length")) > MAX_UPLOAD_BYTES + 64 * 1024) {
    return error(413, "The photo is larger than 15 MB.");
  }

  const form = await request.formData().catch(() => null);
  if (!form) return error(400, "Expected a multipart form.");

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return error(400, "A photo file is required.");
  if (file.size > MAX_UPLOAD_BYTES) return error(413, "The photo is larger than 15 MB.");

  const fields = uploadFieldsSchema.safeParse({
    lat: form.get("lat"),
    lng: form.get("lng"),
    locationSource: form.get("locationSource"),
  });
  if (!fields.success) {
    return Response.json({ error: "Invalid position or source.", issues: fields.error.issues }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isJpeg(bytes)) {
    return error(415, "Only JPEG photos are accepted.");
  }

  // File first, then the row. If the insert fails, delete the file: never an orphan on disk.
  const storageKey = `${randomUUID()}.jpg`;
  await savePhotoFile(storageKey, bytes);
  let photo: Photo;
  try {
    photo = await createPhoto({
      userId: user.id,
      storageKey,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      originalName: file.name.trim().slice(0, 255) || "photo.jpg",
      ...fields.data,
    });
  } catch (err) {
    await deletePhotoFile(storageKey);
    // Postgres names the unique constraint on photos.sha256 "photos_sha256_key".
    if ((err as { constraint?: string }).constraint === "photos_sha256_key") {
      return error(409, "This photo was already uploaded.");
    }
    throw err;
  }

  // Optional AI description, from the small copy the browser sends: the originals are over
  // Bedrock's image size limit. No key, no copy or a failed call simply means no description.
  const preview = form.get("preview");
  if (preview instanceof File && preview.size > 0 && preview.size <= 1024 * 1024) {
    const previewBytes = new Uint8Array(await preview.arrayBuffer());
    const description = isJpeg(previewBytes) ? await describePhoto(previewBytes) : null;
    if (description) {
      await setDescription(photo.id, description);
      photo = { ...photo, description };
    }
  }
  return Response.json(photo, { status: 201 });
}
