// The text fields sent with an uploaded file. Form fields always arrive as strings
// (or null when missing), so the schema must turn them into numbers safely.
import { describe, expect, it } from "vitest";
import { uploadFieldsSchema } from "./photos";

const VALID = { lat: "48.869498", lng: "6.782213", locationSource: "exif" };

describe("uploadFieldsSchema", () => {
  it("turns valid fields into numbers", () => {
    expect(uploadFieldsSchema.parse(VALID)).toEqual({ lat: 48.869498, lng: 6.782213, locationSource: "exif" });
  });

  // Number(null) and Number("") are 0: a missing field must not become latitude 0.
  it.each([
    ["a missing latitude", { ...VALID, lat: null }],
    ["an empty longitude", { ...VALID, lng: " " }],
    ["a latitude that is not a number", { ...VALID, lat: "north" }],
    ["a position at 0,0", { ...VALID, lat: "0", lng: "0" }],
    ["a latitude of 91", { ...VALID, lat: "91" }],
    ["an unknown source", { ...VALID, locationSource: "gps" }],
  ])("rejects %s", (_label, fields) => {
    expect(uploadFieldsSchema.safeParse(fields).success).toBe(false);
  });
});
