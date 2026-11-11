import { describe, expect, it } from "vitest";
import { pylonsToGeoJSON } from "./geojson";
import type { Pylon } from "./pylons";

const pylon = (over: Partial<Pylon>): Pylon => ({
  id: 1, lineCode: "L1", seq: 1, code: "P1", lat: 48.6, lng: 2.3,
  condition: "ok", lastInspectedAt: null, ...over,
});

describe("pylonsToGeoJSON", () => {
  it("puts longitude first", () => {
    const fc = pylonsToGeoJSON([pylon({ lat: 48.6, lng: 2.3 })]);
    expect(fc.features[0].geometry).toEqual({ type: "Point", coordinates: [2.3, 48.6] });
  });

  it("draws each line in seq order, even if rows arrive shuffled", () => {
    const fc = pylonsToGeoJSON([
      pylon({ id: 2, seq: 2, lng: 2.2 }),
      pylon({ id: 1, seq: 1, lng: 2.1 }),
      pylon({ id: 3, seq: 3, lng: 2.3 }),
    ]);
    const line = fc.features.find((f) => f.geometry.type === "LineString");
    expect(line?.geometry.coordinates).toEqual([[2.1, 48.6], [2.2, 48.6], [2.3, 48.6]]);
  });

  it("draws no line for a single pylon", () => {
    const fc = pylonsToGeoJSON([pylon({})]);
    expect(fc.features.filter((f) => f.geometry.type === "LineString")).toHaveLength(0);
  });
});
