// Server only: every SQL query for photos lives here, so route handlers stay thin.
import { pool } from "./db";
import type { Photo } from "./photos";

// Aliases turn snake_case columns into the camelCase fields of the Photo type.
// count(*) is a bigint, which pg returns as a string: ::int makes it a number.
const COLUMNS = `p.id, p.lat, p.lng, p.location_source as "locationSource",
                 p.original_name as "originalName", p.description,
                 p.created_at as "createdAt", u.email as "uploaderEmail",
                 (select count(*) from comments c where c.photo_id = p.id)::int as "commentCount"`;

// Newest first; id breaks ties between photos created in the same instant.
export async function listPhotos(): Promise<Photo[]> {
  const { rows } = await pool.query<Photo>(
    `select ${COLUMNS}
       from photos p
       join users u on u.id = p.user_id
      order by p.created_at desc, p.id desc`,
  );
  return rows;
}

// Only the server ever needs the storage key, so it has its own query.
// Returns null when the photo does not exist, so the route can answer 404.
export async function getStorageKey(id: number): Promise<string | null> {
  const { rows } = await pool.query<{ storageKey: string }>(
    `select storage_key as "storageKey" from photos where id = $1`,
    [id],
  );
  return rows[0]?.storageKey ?? null;
}
