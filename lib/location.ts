// The core rule: every photo gets exactly one valid position. Pure functions,
// shared by the upload form (browser) and the upload route (server).
import type { LocationSource } from "./photos";

// What exifr reads from a photo's EXIF metadata (signed decimal degrees).
export type GpsTags = { latitude?: number; longitude?: number };
export type Position = { lat: number; lng: number };
export type LocationResult =
  | { ok: true; lat: number; lng: number; source: LocationSource }
  | { ok: false; error: "no_position" | "invalid_position" };

// Real numbers, inside the globe's ranges, and not 0,0: devices write 0,0 when
// they had no GPS fix. The database checks the same three things.
export function isValidPosition(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

// A position placed by hand wins: the user saw the photo's GPS and chose to correct it.
// Otherwise the photo's own GPS is used, and unusable GPS counts as no GPS at all.
export function resolveLocation({ gps, manual }: { gps?: GpsTags | null; manual?: Position | null }): LocationResult {
  if (manual) {
    return isValidPosition(manual.lat, manual.lng)
      ? { ok: true, lat: manual.lat, lng: manual.lng, source: "manual" }
      : { ok: false, error: "invalid_position" };
  }
  const lat = gps?.latitude ?? Number.NaN;
  const lng = gps?.longitude ?? Number.NaN;
  return isValidPosition(lat, lng) ? { ok: true, lat, lng, source: "exif" } : { ok: false, error: "no_position" };
}
