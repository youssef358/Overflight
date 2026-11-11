// Server only: every SQL query for users lives here.
import { pool } from "./db";

export type User = { id: number; email: string };

// Returns null when the email is already taken. The unique constraint decides, not a
// "select, then insert": two signups at the same moment cannot both succeed.
export async function createUser(email: string, passwordHash: string): Promise<User | null> {
  try {
    const { rows } = await pool.query<User>(
      "insert into users (email, password_hash) values ($1, $2) returning id, email",
      [email, passwordHash],
    );
    return rows[0];
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return null;
    throw err;
  }
}

// For login only: the one query that reads a password hash.
export async function findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  const { rows } = await pool.query<User & { passwordHash: string }>(
    `select id, email, password_hash as "passwordHash" from users where email = $1`,
    [email],
  );
  return rows[0] ?? null;
}
