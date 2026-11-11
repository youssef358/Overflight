import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@/lib/db";
import { GET } from "./route";

// Not a real image: the route never decodes the bytes, it only serves them.
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

let dir: string;
let userId: number;
let photoId: number;
let missingFileId: number;

async function insertPhoto(storageKey: string): Promise<number> {
  const { rows } = await pool.query(
    `insert into photos (user_id, storage_key, sha256, original_name, lat, lng, location_source)
     values ($1, $2, $3, 'test.jpg', 48.87, 6.78, 'exif') returning id`,
    [userId, storageKey, randomBytes(32).toString("hex")],
  );
  return rows[0].id;
}

const get = (id: string) =>
  GET(new NextRequest(`http://test/api/photos/${id}/file`), { params: Promise.resolve({ id }) });

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "photos-"));
  process.env.UPLOAD_DIR = dir;
  const { rows } = await pool.query(
    "insert into users (email, password_hash) values ($1, 'scrypt$salt$hash') returning id",
    [`file-${randomUUID()}@example.test`],
  );
  userId = rows[0].id;
  const key = `${randomUUID()}.jpg`;
  await writeFile(path.join(dir, key), JPEG_BYTES);
  photoId = await insertPhoto(key);
  missingFileId = await insertPhoto(`${randomUUID()}.jpg`); // row without a file on disk
});

afterAll(async () => {
  await pool.query("delete from photos where user_id = $1", [userId]);
  await pool.query("delete from users where id = $1", [userId]);
  await pool.end();
  await rm(dir, { recursive: true });
  delete process.env.UPLOAD_DIR;
});

describe("GET /api/photos/:id/file", () => {
  it("serves the bytes as a JPEG the browser may cache privately", async () => {
    const res = await get(String(photoId));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toContain("private");
    expect(Buffer.from(await res.arrayBuffer())).toEqual(JPEG_BYTES);
  });

  it.each(["abc", "0", "-1", "1.5", "99999999999"])("rejects the id %s with 400", async (id) => {
    expect((await get(id)).status).toBe(400);
  });

  it("answers 404 for an unknown photo and for a missing file", async () => {
    expect((await get("2147483647")).status).toBe(404);
    expect((await get(String(missingFileId))).status).toBe(404);
  });
});
