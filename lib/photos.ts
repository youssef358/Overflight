// Shared by the browser and the server: types and validation only, no database code here.

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
