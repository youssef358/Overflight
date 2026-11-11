// Signup, login and logout together: they share accounts and cookies.
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { pool } from "@/lib/db";
import { findSessionUser } from "@/lib/sessions-repo";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { GET as me } from "./me/route";
import { POST as signup } from "./signup/route";

const email = `auth-${randomUUID()}@example.test`;

const call = (handler: (r: NextRequest) => Promise<Response>, body: unknown, cookie?: string) =>
  handler(
    new NextRequest("http://test/api/auth", {
      method: "POST",
      body: JSON.stringify(body),
      headers: cookie ? { cookie: `session=${cookie}` } : {},
    }),
  );

// The token the server put in the Set-Cookie header ("" when it clears the cookie).
const sessionToken = (res: Response) => /session=([^;]*)/.exec(res.headers.get("set-cookie") ?? "")?.[1];

afterAll(async () => {
  await pool.query("delete from users where email = $1", [email]); // sessions cascade
  await pool.end();
});

describe("auth routes", () => {
  it("signs up with a lowercased email and logs the new account in (httpOnly cookie)", async () => {
    const res = await call(signup, { email: `  ${email.toUpperCase()} `, password: "long enough" });
    expect(res.status).toBe(201);
    expect((await res.json()).email).toBe(email);
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(await findSessionUser(sessionToken(res)!)).toMatchObject({ email });
  });

  it("refuses a second account for the same email, whatever its case (409)", async () => {
    expect((await call(signup, { email: email.toUpperCase(), password: "long enough" })).status).toBe(409);
  });

  it.each([
    ["a bad email", { email: "not-an-email", password: "long enough" }],
    ["a short password", { email: `x-${email}`, password: "short" }],
    ["no body", null],
  ])("refuses a signup with %s (400)", async (_label, body) => {
    expect((await call(signup, body)).status).toBe(400);
  });

  it("logs in with the right password, and gives one answer for a wrong password or an unknown email", async () => {
    expect((await call(login, { email, password: "long enough" })).status).toBe(200);
    const wrong = await call(login, { email, password: "wrong password" });
    const unknown = await call(login, { email: `nobody-${email}`, password: "long enough" });
    expect([wrong.status, unknown.status]).toEqual([401, 401]);
    expect(await wrong.json()).toEqual(await unknown.json());
  });

  it("logs in the seeded demo account", async () => {
    expect((await call(login, { email: "demo@hylight.test", password: "hylight-demo" })).status).toBe(200);
  });

  it("logs out: deletes the session and clears the cookie, so /me answers 401 again", async () => {
    const token = sessionToken(await call(login, { email, password: "long enough" }))!;
    const whoAmI = () => me(new NextRequest("http://test/api/auth/me", { headers: { cookie: `session=${token}` } }));
    expect(await (await whoAmI()).json()).toMatchObject({ email });

    const res = await call(logout, null, token);
    expect(res.status).toBe(204);
    expect(sessionToken(res)).toBe("");
    expect(await findSessionUser(token)).toBeNull();
    expect((await whoAmI()).status).toBe(401);
  });
});
