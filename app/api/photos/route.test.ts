// Route handlers are plain async functions: call them directly, no server needed.
// The route reads through its own connection, so the test data is committed
// and removed in afterAll (a rolled-back transaction would be invisible to it).
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@/lib/db";
import type { Photo } from "@/lib/photos";
import { GET, POST } from "./route";

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

describe("POST /api/photos", () => {
  const FIELDS = { lat: "48.869498", lng: "6.782213", locationSource: "exif" };
  const created: number[] = [];
  let dir: string;

  // Random bytes after the JPEG signature: every call is a different file (different SHA-256).
  const jpeg = (bytes = randomBytes(32)) =>
    new File([Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), bytes])], "DSC00751.JPG", { type: "image/jpeg" });

  async function upload(fields: Record<string, string | File>, headers?: Record<string, string>) {
    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) form.append(name, value);
    const res = await POST(new NextRequest("http://test/api/photos", { method: "POST", body: form, headers }));
    if (res.status === 201) created.push((await res.clone().json()).id);
    return res;
  }

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "uploads-"));
    process.env.UPLOAD_DIR = dir;
  });

  afterAll(async () => {
    await pool.query("delete from photos where id = any($1)", [created]);
    await rm(dir, { recursive: true });
    delete process.env.UPLOAD_DIR;
  });

  it("stores the file and answers 201 with the new photo", async () => {
    const res = await upload({ ...FIELDS, file: jpeg() });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      lat: 48.869498, lng: 6.782213, locationSource: "exif",
      originalName: "DSC00751.JPG", uploaderEmail: "demo@hylight.test", commentCount: 0,
    });
    expect(await readdir(dir)).toHaveLength(1);
  });

  it("answers 409 for the same file twice and leaves no extra file on disk", async () => {
    const bytes = randomBytes(32);
    expect((await upload({ ...FIELDS, file: jpeg(bytes) })).status).toBe(201);
    const filesBefore = (await readdir(dir)).length;
    expect((await upload({ ...FIELDS, locationSource: "manual", file: jpeg(bytes) })).status).toBe(409);
    expect(await readdir(dir)).toHaveLength(filesBefore);
  });

  it("answers 415 for a file that is not a JPEG, whatever its name", async () => {
    const png = new File([Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])], "fake.jpg", { type: "image/jpeg" });
    expect((await upload({ ...FIELDS, file: png })).status).toBe(415);
  });

  it("answers 413 for a file over 15 MB, and for a body that declares more", async () => {
    expect((await upload({ ...FIELDS, file: jpeg(Buffer.alloc(15 * 1024 * 1024)) })).status).toBe(413);
    expect((await upload({ ...FIELDS, file: jpeg() }, { "content-length": "99999999" })).status).toBe(413);
  });

  it("answers 400 without a file or without a latitude", async () => {
    expect((await upload(FIELDS)).status).toBe(400);
    expect((await upload({ lng: FIELDS.lng, locationSource: "exif", file: jpeg() })).status).toBe(400);
  });
});
