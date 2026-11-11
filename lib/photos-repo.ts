// Server only: every SQL query for photos lives here, so route handlers stay thin.
import { pool } from "./db";
import type { LocationSource } from "./location";
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

export type NewPhoto = {
  userId: number;
  storageKey: string;
  sha256: string;
  originalName: string;
  lat: number;
  lng: number;
  locationSource: LocationSource;
};

// One statement: insert, then read the new row back in the same shape as listPhotos
// (with the uploader's email). A duplicate sha256 makes Postgres raise 23505.
export async function createPhoto(p: NewPhoto): Promise<Photo> {
  const { rows } = await pool.query<Photo>(
    `with p as (
       insert into photos (user_id, storage_key, sha256, original_name, lat, lng, location_source)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *
     )
     select ${COLUMNS} from p join users u on u.id = p.user_id`,
    [p.userId, p.storageKey, p.sha256, p.originalName, p.lat, p.lng, p.locationSource],
  );
  return rows[0];
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
