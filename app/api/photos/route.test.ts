// Route handlers are plain async functions: call them directly, no server needed.
// The route reads through its own connection, so the test data is committed
// and removed in afterAll (a rolled-back transaction would be invisible to it).
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@/lib/db";
import type { Photo } from "@/lib/photos";
import { GET } from "./route";

const email = `list-${randomUUID()}@example.test`;
let userId: number;
let olderId: number;
let newerId: number;

async function insertPhoto(): Promise<number> {
  const { rows } = await pool.query(
    `insert into photos (user_id, storage_key, sha256, original_name, lat, lng, location_source)
     values ($1, $2, $3, 'DSC00751.JPG', 48.87, 6.78, 'exif') returning id`,
    [userId, `${randomUUID()}.jpg`, randomBytes(32).toString("hex")],
  );
  return rows[0].id;
}

beforeAll(async () => {
  const { rows } = await pool.query(
    "insert into users (email, password_hash) values ($1, 'scrypt$salt$hash') returning id",
    [email],
  );
  userId = rows[0].id;
  olderId = await insertPhoto();
  newerId = await insertPhoto();
  await pool.query("insert into comments (photo_id, user_id, body) values ($1, $2, 'one'), ($1, $2, 'two')", [olderId, userId]);
});

afterAll(async () => {
  await pool.query("delete from photos where user_id = $1", [userId]); // comments cascade
  await pool.query("delete from users where id = $1", [userId]);
  await pool.end();
});

describe("GET /api/photos", () => {
  it("lists photos newest first, with uploader and comment count", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const photos: Photo[] = await res.json();
    const ids = photos.map((p) => p.id);
    expect(ids.indexOf(newerId)).toBeLessThan(ids.indexOf(olderId));

    const older = photos.find((p) => p.id === olderId);
    expect(older).toMatchObject({ uploaderEmail: email, commentCount: 2, lat: 48.87, lng: 6.78 });
    expect(photos.find((p) => p.id === newerId)?.commentCount).toBe(0);
  });

  it("returns only the public fields (no storage key, no SHA-256)", async () => {
    const photos: Photo[] = await (await GET()).json();
    expect(Object.keys(photos[0]).sort()).toEqual([
      "commentCount", "createdAt", "description", "id", "lat", "lng",
      "locationSource", "originalName", "uploaderEmail",
    ]);
  });
});
