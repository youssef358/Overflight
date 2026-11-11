import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Comment } from "@/lib/comments";
import { pool } from "@/lib/db";
import { createSession } from "@/lib/sessions-repo";
import { GET, POST } from "./route";

const email = `comments-${randomUUID()}@example.test`;
let userId: number;
let photoId: number;
let cookie: string;

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const list = (id: string, headers: Record<string, string> = { cookie }) =>
  GET(new NextRequest(`http://test/api/photos/${id}/comments`, { headers }), params(id));
const post = (id: string, body: unknown, headers: Record<string, string> = { cookie }) =>
  POST(
    new NextRequest(`http://test/api/photos/${id}/comments`, { method: "POST", body: JSON.stringify(body), headers }),
    params(id),
  );

beforeAll(async () => {
  const user = await pool.query(
    "insert into users (email, password_hash) values ($1, 'scrypt$salt$hash') returning id",
    [email],
  );
  userId = user.rows[0].id;
  cookie = `session=${await createSession(userId)}`;
  const photo = await pool.query(
    `insert into photos (user_id, storage_key, sha256, original_name, lat, lng, location_source)
     values ($1, $2, $3, 'test.jpg', 48.87, 6.78, 'exif') returning id`,
    [userId, `${randomUUID()}.jpg`, randomBytes(32).toString("hex")],
  );
  photoId = photo.rows[0].id;
});

afterAll(async () => {
  await pool.query("delete from photos where id = $1", [photoId]); // comments cascade
  await pool.query("delete from users where id = $1", [userId]);
  await pool.end();
});

describe("/api/photos/:id/comments", () => {
  it("answers 401 without a session", async () => {
    expect((await list(String(photoId), {})).status).toBe(401);
    expect((await post(String(photoId), { body: "hi" }, {})).status).toBe(401);
  });

  it("answers 400 for a bad id and 404 for a photo that does not exist", async () => {
    expect((await list("abc")).status).toBe(400);
    expect((await list("2147483647")).status).toBe(404);
    expect((await post("2147483647", { body: "hi" })).status).toBe(404);
  });

  it("stores a trimmed comment by the logged-in user (201)", async () => {
    const res = await post(String(photoId), { body: "  Pylon 12 looks bent  " });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ body: "Pylon 12 looks bent", authorEmail: email });
  });

  it.each([
    ["only spaces", { body: "   " }],
    ["1001 characters", { body: "x".repeat(1001) }],
    ["no body field", {}],
  ])("refuses a comment with %s (400)", async (_label, body) => {
    expect((await post(String(photoId), body)).status).toBe(400);
  });

  it("accepts exactly 1000 characters and lists comments oldest first", async () => {
    expect((await post(String(photoId), { body: "x".repeat(1000) })).status).toBe(201);
    expect((await post(String(photoId), { body: "last one" })).status).toBe(201);
    const comments: Comment[] = await (await list(String(photoId))).json();
    expect(comments.map((c) => c.body.slice(0, 19))).toEqual(["Pylon 12 looks bent", "x".repeat(19), "last one"]);
  });
});
