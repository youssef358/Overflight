import { randomBytes, randomUUID } from "node:crypto";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/sessions-repo";
import { DELETE } from "./route";

let dir: string;
let ownerId: number;
let ownerCookie: string;
let otherId: number;
let otherCookie: string;
let photoId: number;
let storageKey: string;

async function insertUser(): Promise<number> {
  const { rows } = await pool.query(
    "insert into users (email, password_hash) values ($1, 'scrypt$salt$hash') returning id",
    [`delete-${randomUUID()}@example.test`],
  );
  return rows[0].id;
}

const del = (id: string, cookie?: string) =>
  DELETE(new NextRequest(`http://test/api/photos/${id}`, { method: "DELETE", headers: cookie ? { cookie } : {} }), {
    params: Promise.resolve({ id }),
  });

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "delete-"));
  process.env.UPLOAD_DIR = dir;
  ownerId = await insertUser();
  otherId = await insertUser();
  ownerCookie = `session=${await createSession(ownerId)}`;
  otherCookie = `session=${await createSession(otherId)}`;
  storageKey = `${randomUUID()}.jpg`;
  await writeFile(path.join(dir, storageKey), Buffer.from([0xff, 0xd8, 0xff]));
  const { rows } = await pool.query(
    `insert into photos (user_id, storage_key, sha256, original_name, lat, lng, location_source)
     values ($1, $2, $3, 'mine.jpg', 48.87, 6.78, 'exif') returning id`,
    [ownerId, storageKey, randomBytes(32).toString("hex")],
  );
  photoId = rows[0].id;
  await pool.query("insert into comments (photo_id, user_id, body) values ($1, $2, 'looks fine')", [photoId, otherId]);
});

afterAll(async () => {
  await pool.query("delete from photos where user_id = any($1)", [[ownerId, otherId]]);
  await pool.query("delete from users where id = any($1)", [[ownerId, otherId]]);
  await pool.end();
  await rm(dir, { recursive: true });
  delete process.env.UPLOAD_DIR;
});

const photoRows = async () => (await pool.query("select 1 from photos where id = $1", [photoId])).rowCount;

describe("DELETE /api/photos/:id", () => {
  it("answers 401 without a session, 400 for a bad id and 404 for an unknown photo", async () => {
    expect((await del(String(photoId))).status).toBe(401);
    expect((await del("abc", ownerCookie)).status).toBe(400);
    expect((await del("2147483647", ownerCookie)).status).toBe(404);
  });

  it("refuses someone else's photo (403) and keeps it", async () => {
    expect((await del(String(photoId), otherCookie)).status).toBe(403);
    expect(await photoRows()).toBe(1);
  });

  it("lets the uploader delete it: row, comments and file are gone (204)", async () => {
    expect((await del(String(photoId), ownerCookie)).status).toBe(204);
    expect(await photoRows()).toBe(0);
    const comments = await pool.query("select 1 from comments where photo_id = $1", [photoId]);
    expect(comments.rowCount).toBe(0);
    await expect(access(path.join(dir, storageKey))).rejects.toThrow();
  });
});
