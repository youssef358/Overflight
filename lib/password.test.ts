import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

// The hash stored for the seeded demo account (db/seed.sql), whose password is in that file.
const DEMO_HASH =
  "scrypt$055c5863272eca852198d1482701b9d9$4389b6dad46e417135c207abd234eda845ca4b10e8f2f02b710e2ade4ec96fe4a9eab66100c6ed24383272e5b3e5e22877e3ad4ef270a04c23f8909524af355f";

describe("password hashing", () => {
  it("stores scrypt$salt$hash, never the password itself", async () => {
    const stored = await hashPassword("correct horse");
    expect(stored).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(stored).not.toContain("correct horse");
  });

  it("accepts the right password and refuses a wrong one", async () => {
    const stored = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("Correct horse", stored)).toBe(false);
  });

  it("gives two different hashes for the same password (random salt)", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("accepts the seeded demo account's password", async () => {
    expect(await verifyPassword("hylight-demo", DEMO_HASH)).toBe(true);
  });

  // An empty hash part ("zz" is not hex) must not compare two empty buffers as equal.
  it.each(["plain-text", "scrypt$abc$zz", "bcrypt$abc$def", ""])("refuses the stored value %j", async (stored) => {
    expect(await verifyPassword("anything", stored)).toBe(false);
  });
});
