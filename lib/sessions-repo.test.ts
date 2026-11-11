import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "./db";
import { createSession, deleteSession, findSessionUser } from "./sessions-repo";
import { createUser, type User } from "./users-repo";

let user: User;

beforeAll(async () => {
  user = (await createUser(`session-${randomUUID()}@example.test`, "scrypt$salt$hash"))!;
});

afterAll(async () => {
  await pool.query("delete from users where id = $1", [user.id]); // sessions cascade
  await pool.end();
});

describe("sessions", () => {
  it("finds the user behind a new token, and stores only the token's hash", async () => {
    const token = await createSession(user.id);
    expect(await findSessionUser(token)).toEqual(user);
    const { rowCount } = await pool.query("select 1 from sessions where id = $1", [token]);
    expect(rowCount).toBe(0);
  });

  it("forgets a deleted session (logout) and an unknown token", async () => {
    const token = await createSession(user.id);
    await deleteSession(token);
    expect(await findSessionUser(token)).toBeNull();
    expect(await findSessionUser("made-up-token")).toBeNull();
  });

  it("refuses an expired session", async () => {
    const token = await createSession(user.id);
    await pool.query(
      "update sessions set created_at = now() - interval '8 days', expires_at = now() - interval '1 day' where user_id = $1",
      [user.id],
    );
    expect(await findSessionUser(token)).toBeNull();
  });

  it("refuses a second account with the same email", async () => {
    expect(await createUser(user.email, "scrypt$salt$hash")).toBeNull();
  });
});
