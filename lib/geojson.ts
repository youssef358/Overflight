import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type { Pylon } from "./pylons";

// GeoJSON coordinates are [longitude, latitude]: the reverse of how people say them.
export function pylonsToGeoJSON(pylons: Pylon[]): FeatureCollection<Point | LineString> {
  const byLine = new Map<string, Pylon[]>();
  for (const p of pylons) {
    byLine.set(p.lineCode, [...(byLine.get(p.lineCode) ?? []), p]);
  }

  const lines: Feature<LineString>[] = [];
  for (const [lineCode, linePylons] of byLine) {
    if (linePylons.length < 2) continue; // a line needs at least two points
    const ordered = [...linePylons].sort((a, b) => a.seq - b.seq);
    lines.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: ordered.map((p) => [p.lng, p.lat]) },
      properties: { lineCode },
    });
  }

  const points: Feature<Point>[] = pylons.map((p) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    properties: { id: p.id, code: p.code, condition: p.condition },
  }));

  return { type: "FeatureCollection", features: [...lines, ...points] };
}
