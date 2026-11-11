// The core rule: every photo gets one valid position, from its GPS or placed by hand.
import { describe, expect, it } from "vitest";
import { resolveLocation } from "./location";

const GPS = { latitude: 48.869498, longitude: 6.782213 }; // DSC00751.JPG
const HAND = { lat: 48.87, lng: 6.77 };

describe("resolveLocation", () => {
  it("uses the photo's GPS when nothing was placed by hand", () => {
    expect(resolveLocation({ gps: GPS })).toEqual({ ok: true, lat: 48.869498, lng: 6.782213, source: "exif" });
  });

  it("lets a position placed by hand win over the photo's GPS", () => {
    expect(resolveLocation({ gps: GPS, manual: HAND })).toEqual({ ok: true, lat: 48.87, lng: 6.77, source: "manual" });
  });

  it("uses the position placed by hand when the photo has no GPS", () => {
    expect(resolveLocation({ gps: undefined, manual: HAND })).toMatchObject({ ok: true, source: "manual" });
  });

  it("asks for a position when there is neither GPS nor a hand-placed one", () => {
    expect(resolveLocation({ gps: undefined })).toEqual({ ok: false, error: "no_position" });
  });

  it.each([
    ["0,0 (device had no fix)", { latitude: 0, longitude: 0 }],
    ["a latitude above 90", { latitude: 91, longitude: 6.78 }],
    ["a longitude below -180", { latitude: 48.87, longitude: -181 }],
    ["a missing longitude", { latitude: 48.87 }],
    ["NaN", { latitude: Number.NaN, longitude: 6.78 }],
  ])("treats GPS with %s as no GPS", (_label, gps) => {
    expect(resolveLocation({ gps })).toEqual({ ok: false, error: "no_position" });
  });

  it.each([
    ["0,0", { lat: 0, lng: 0 }],
    ["a latitude of -91", { lat: -91, lng: 6.78 }],
    ["a longitude of 181", { lat: 48.87, lng: 181 }],
    ["Infinity", { lat: Number.POSITIVE_INFINITY, lng: 6.78 }],
  ])("rejects a hand-placed position with %s", (_label, manual) => {
    expect(resolveLocation({ gps: GPS, manual })).toEqual({ ok: false, error: "invalid_position" });
  });

  it("accepts the exact limits and both hemispheres", () => {
    expect(resolveLocation({ gps: { latitude: -90, longitude: 180 } })).toMatchObject({ ok: true });
    expect(resolveLocation({ gps: { latitude: 90, longitude: -180 } })).toMatchObject({ ok: true });
    expect(resolveLocation({ gps: { latitude: -33.8568, longitude: 151.2153 } })).toMatchObject({ ok: true });
  });
});
