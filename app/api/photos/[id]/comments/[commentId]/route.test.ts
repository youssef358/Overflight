import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/sessions-repo";
import { DELETE } from "./route";

let authorId: number;
let otherId: number;
let authorCookie: string;
let otherCookie: string;
let photoId: number;
let otherPhotoId: number;
let commentId: number;

async function insertUser(): Promise<number> {
  const { rows } = await pool.query(
    "insert into users (email, password_hash) values ($1, 'scrypt$salt$hash') returning id",
    [`comment-delete-${randomUUID()}@example.test`],
  );
  return rows[0].id;
}

async function insertPhoto(userId: number): Promise<number> {
  const { rows } = await pool.query(
    `insert into photos (user_id, storage_key, sha256, original_name, lat, lng, location_source)
     values ($1, $2, $3, 'test.jpg', 48.87, 6.78, 'exif') returning id`,
    [userId, `${randomUUID()}.jpg`, randomBytes(32).toString("hex")],
  );
  return rows[0].id;
}

const del = (photo: number | string, comment: number | string, cookie?: string) =>
  DELETE(
    new NextRequest(`http://test/api/photos/${photo}/comments/${comment}`, {
      method: "DELETE",
      headers: cookie ? { cookie } : {},
    }),
    { params: Promise.resolve({ id: String(photo), commentId: String(comment) }) },
  );

beforeAll(async () => {
  authorId = await insertUser();
  otherId = await insertUser();
  authorCookie = `session=${await createSession(authorId)}`;
  otherCookie = `session=${await createSession(otherId)}`;
  photoId = await insertPhoto(otherId); // the photo belongs to someone else: only authorship counts
  otherPhotoId = await insertPhoto(otherId);
  const { rows } = await pool.query(
    "insert into comments (photo_id, user_id, body) values ($1, $2, 'mine') returning id",
    [photoId, authorId],
  );
  commentId = rows[0].id;
});

afterAll(async () => {
  await pool.query("delete from photos where user_id = any($1)", [[authorId, otherId]]); // comments cascade
  await pool.query("delete from users where id = any($1)", [[authorId, otherId]]);
  await pool.end();
});

const commentRows = async () => (await pool.query("select 1 from comments where id = $1", [commentId])).rowCount;

describe("DELETE /api/photos/:id/comments/:commentId", () => {
  it("answers 401 without a session and 400 for bad ids", async () => {
    expect((await del(photoId, commentId)).status).toBe(401);
    expect((await del("abc", commentId, authorCookie)).status).toBe(400);
    expect((await del(photoId, "0", authorCookie)).status).toBe(400);
  });

  it("answers 404 for an unknown comment, or one that belongs to another photo", async () => {
    expect((await del(photoId, 2147483647, authorCookie)).status).toBe(404);
    expect((await del(otherPhotoId, commentId, authorCookie)).status).toBe(404);
    expect(await commentRows()).toBe(1);
  });

  it("refuses someone else's comment (403), even the photo's owner", async () => {
    expect((await del(photoId, commentId, otherCookie)).status).toBe(403);
    expect(await commentRows()).toBe(1);
  });

  it("lets the author delete it (204)", async () => {
    expect((await del(photoId, commentId, authorCookie)).status).toBe(204);
    expect(await commentRows()).toBe(0);
  });
});
