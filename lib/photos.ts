// Shared by the browser and the server: types and validation only, no database code here.
import { z } from "zod";
import { isValidPosition, LOCATION_SOURCES, type LocationSource } from "./location";

// An id from the URL ("42"). The upper bound is Postgres's int limit: a bigger number
// would make the query fail with a 500 instead of a clean 400.
export const photoIdSchema = z.coerce.number().int().min(1).max(2_147_483_647);

// Camera JPEGs here are about 5 MB; 15 MB leaves room for bigger phone photos.
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// A coordinate from a form field. It must be present first: Number(null) and Number("")
// are 0, which would silently become a real latitude.
const coordinate = z.string().trim().min(1).pipe(z.coerce.number());

// POST /api/photos (multipart form): the text fields sent with the file.
export const uploadFieldsSchema = z
  .object({ lat: coordinate, lng: coordinate, locationSource: z.enum(LOCATION_SOURCES) })
  .refine((f) => isValidPosition(f.lat, f.lng), { message: "position out of range or 0,0", path: ["lat"] });

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
