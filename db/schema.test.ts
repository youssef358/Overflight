// The database constraints are the last line of defence, so they get their own tests.
// Each test runs in a transaction that is rolled back: nothing is left behind.
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { pool } from "@/lib/db";

let client: PoolClient;

beforeEach(async () => {
  client = await pool.connect();
  await client.query("begin");
});
afterEach(async () => {
  await client.query("rollback");
  client.release();
});
afterAll(() => pool.end());

async function insertUser(email = "test@example.test"): Promise<number> {
  const { rows } = await client.query(
    "insert into users (email, password_hash) values ($1, 'scrypt$salt$hash') returning id",
    [email],
  );
  return rows[0].id;
}

function insertPhoto(userId: number, { lat = 48.87, lng = 6.78, sha256 = "a".repeat(64) } = {}) {
  return client.query(
    `insert into photos (user_id, storage_key, sha256, original_name, lat, lng, location_source)
     values ($1, $2, $3, 'DSC00751.JPG', $4, $5, 'exif') returning id`,
    [userId, `${randomUUID()}.jpg`, sha256, lat, lng],
  );
}

// Postgres error codes: 23514 = check violation, 23505 = unique violation.
describe("database constraints", () => {
  it("rejects an email that is not lowercase", async () => {
    await expect(insertUser("Bob@Example.test")).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects a photo at 0,0", async () => {
    const userId = await insertUser();
    await expect(insertPhoto(userId, { lat: 0, lng: 0 })).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects the same file uploaded twice", async () => {
    const userId = await insertUser();
    await insertPhoto(userId);
    await expect(insertPhoto(userId)).rejects.toMatchObject({ code: "23505" });
  });

  it("rejects a comment with surrounding spaces", async () => {
    const userId = await insertUser();
    const photo = await insertPhoto(userId);
    await expect(
      client.query("insert into comments (photo_id, user_id, body) values ($1, $2, ' hi ')", [photo.rows[0].id, userId]),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("deletes the comments of a deleted photo", async () => {
    const userId = await insertUser();
    const photoId = (await insertPhoto(userId)).rows[0].id;
    await client.query("insert into comments (photo_id, user_id, body) values ($1, $2, 'hi')", [photoId, userId]);
    await client.query("delete from photos where id = $1", [photoId]);
    const { rowCount } = await client.query("select 1 from comments where photo_id = $1", [photoId]);
    expect(rowCount).toBe(0);
  });
});
