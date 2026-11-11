// Shared by the browser and the server: types and validation only, no database code here.
import { z } from "zod";

// An id from the URL ("42"). The upper bound is Postgres's int limit: a bigger number
// would make the query fail with a 500 instead of a clean 400.
export const photoIdSchema = z.coerce.number().int().min(1).max(2_147_483_647);

export const LOCATION_SOURCES = ["exif", "manual"] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

// One photo as the API returns it. The file itself is served by
// GET /api/photos/:id/file; the storage key and SHA-256 stay on the server.
export type Photo = {
  id: number;
  lat: number;
  lng: number;
  locationSource: LocationSource;
  originalName: string;
  description: string | null;
  createdAt: string;
  uploaderEmail: string;
  commentCount: number;
};
