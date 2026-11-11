// Server only: the one module that knows where photo files live.
// Moving to S3 means rewriting these functions, nothing else.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Read on every call, not once at import, so tests can point it at a temporary folder.
function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

// Keys come from the database (uuid + .jpg), but a key with a folder in it
// could read outside uploads/, so refuse it here too.
// turbopackIgnore: these paths are only known at run time (uploaded photos), so the build
// must not try to bundle the files they point to (it would trace the whole project).
function filePath(storageKey: string): string {
  if (path.basename(storageKey) !== storageKey) throw new Error(`invalid storage key: ${storageKey}`);
  return path.join(/*turbopackIgnore: true*/ uploadDir(), storageKey);
}

// flag "wx": fail instead of overwriting if a file with this key already exists.
export async function savePhotoFile(storageKey: string, bytes: Uint8Array): Promise<void> {
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(filePath(storageKey), bytes, { flag: "wx" });
}

// force: no error if the file is already gone.
export async function deletePhotoFile(storageKey: string): Promise<void> {
  await rm(filePath(storageKey), { force: true });
}

// Returns null when the file is not on disk.
export async function readPhotoFile(storageKey: string): Promise<Buffer | null> {
  try {
    return await readFile(/*turbopackIgnore: true*/ filePath(storageKey));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}
