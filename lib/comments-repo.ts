// Server only: every SQL query for comments lives here.
import type { Comment } from "./comments";
import { pool } from "./db";

const COLUMNS = `c.id, c.body, c.created_at as "createdAt", u.email as "authorEmail"`;

// Oldest first, like a conversation. The (photo_id, created_at) index serves both
// the filter and the order, so no table scan and no sort.
export async function listComments(photoId: number): Promise<Comment[]> {
  const { rows } = await pool.query<Comment>(
    `select ${COLUMNS}
       from comments c
       join users u on u.id = c.user_id
      where c.photo_id = $1
      order by c.created_at, c.id`,
    [photoId],
  );
  return rows;
}

// Returns null when the photo does not exist: the foreign key refuses the insert (23503).
// No "check, then insert", so a photo deleted a moment before is handled too.
export async function createComment(photoId: number, userId: number, body: string): Promise<Comment | null> {
  try {
    const { rows } = await pool.query<Comment>(
      `with c as (
         insert into comments (photo_id, user_id, body) values ($1, $2, $3)
         returning *
       )
       select ${COLUMNS} from c join users u on u.id = c.user_id`,
      [photoId, userId, body],
    );
    return rows[0];
  } catch (err) {
    if ((err as { code?: string }).code === "23503") return null;
    throw err;
  }
}
