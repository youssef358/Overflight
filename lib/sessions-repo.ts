// Server only. The cookie holds a random token; the database stores only its SHA-256,
// so someone who reads the sessions table cannot use a session.
import { createHash, randomBytes } from "node:crypto";
import { pool } from "./db";
import type { User } from "./users-repo";

export const SESSION_DAYS = 7;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// 32 random bytes (256 bits): impossible to guess. Returns the token to put in the cookie.
export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await pool.query(
    "insert into sessions (id, user_id, expires_at) values ($1, $2, now() + make_interval(days => $3::int))",
    [hashToken(token), userId, SESSION_DAYS],
  );
  return token;
}

// The user behind a cookie token, or null if the session is unknown or expired.
export async function findSessionUser(token: string): Promise<User | null> {
  const { rows } = await pool.query<User>(
    `select u.id, u.email
       from sessions s
       join users u on u.id = s.user_id
      where s.id = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function deleteSession(token: string): Promise<void> {
  await pool.query("delete from sessions where id = $1", [hashToken(token)]);
}
