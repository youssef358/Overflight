// Server only: the one module that knows where photo files live.
// Moving to S3 means rewriting these functions, nothing else.
import { readFile } from "node:fs/promises";
import path from "node:path";

// Read on every call, not once at import, so tests can point it at a temporary folder.
function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

// Keys come from the database (uuid + .jpg), but a key with a folder in it
// could read outside uploads/, so refuse it here too.
function filePath(storageKey: string): string {
  if (path.basename(storageKey) !== storageKey) throw new Error(`invalid storage key: ${storageKey}`);
  return path.join(uploadDir(), storageKey);
}

// Returns null when the file is not on disk.
export async function readPhotoFile(storageKey: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath(storageKey));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}
