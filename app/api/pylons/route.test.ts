// Route handlers are plain async functions: call them with a Request, no server needed.
// These tests need the database: docker compose up -d --wait && npm run db:seed
import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import type { Pylon } from "@/lib/pylons";
import { GET } from "./route";

const get = (qs: string) => GET(new NextRequest(`http://test/api/pylons${qs}`));

afterAll(() => pool.end());

describe("GET /api/pylons", () => {
  it("rejects an unknown condition with 400", async () => {
    const res = await get("?condition=broken");
    expect(res.status).toBe(400);
  });

  it("filters by condition", async () => {
    const res = await get("?condition=defect");
    expect(res.status).toBe(200);
    const pylons: Pylon[] = await res.json();
    expect(pylons.length).toBeGreaterThan(0);
    expect(pylons.every((p) => p.condition === "defect")).toBe(true);
  });
});
