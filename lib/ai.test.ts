// Bedrock is an outside service, so fetch is replaced by a fake: these tests check what we
// send and how we read the answer, not the model itself.
import { afterEach, describe, expect, it, vi } from "vitest";
import { describePhoto } from "./ai";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("describePhoto", () => {
  it("is off without a key: no call at all, no description", async () => {
    vi.stubEnv("AWS_BEARER_TOKEN_BEDROCK", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await describePhoto(JPEG)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the image with the key to the Converse API and returns the text", async () => {
    vi.stubEnv("AWS_BEARER_TOKEN_BEDROCK", "test-key");
    const fetchSpy = vi.fn(async () =>
      Response.json({ output: { message: { content: [{ text: "  Railway tracks between fields.  " }] } } }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    expect(await describePhoto(JPEG)).toBe("Railway tracks between fields.");
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://bedrock-runtime.eu-north-1.amazonaws.com/model/eu.amazon.nova-lite-v1%3A0/converse");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const image = JSON.parse(init.body as string).messages[0].content[0].image;
    expect(image).toEqual({ format: "jpeg", source: { bytes: Buffer.from(JPEG).toString("base64") } });
  });

  it("gives no description when Bedrock refuses or the network fails", async () => {
    vi.stubEnv("AWS_BEARER_TOKEN_BEDROCK", "test-key");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response("model not enabled", { status: 403 })));
    expect(await describePhoto(JPEG)).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await describePhoto(JPEG)).toBeNull();
  });
});
