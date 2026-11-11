// Server only. Describes a photo with a vision model on Amazon Bedrock (Converse API, plain fetch).
// Off when AWS_BEARER_TOKEN_BEDROCK is not set: uploads then work the same, without a description.

const PROMPT =
  "This photo was taken from an airship by an operations team. In one or two short sentences, " +
  "describe what it shows: infrastructure, terrain and anything notable. No introduction.";

// Returns null when the feature is off or the call fails: a description is a bonus,
// never a reason to refuse an upload.
export async function describePhoto(jpeg: Uint8Array): Promise<string | null> {
  const key = process.env.AWS_BEARER_TOKEN_BEDROCK;
  if (!key) return null;
  const region = process.env.BEDROCK_REGION ?? "eu-north-1";
  const model = process.env.BEDROCK_MODEL_ID ?? "eu.amazon.nova-lite-v1:0";

  try {
    const res = await fetch(
      `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/converse`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                { image: { format: "jpeg", source: { bytes: Buffer.from(jpeg).toString("base64") } } },
                { text: PROMPT },
              ],
            },
          ],
          inferenceConfig: { maxTokens: 200, temperature: 0.2 },
        }),
        // The upload waits for this call, so it must not hang.
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!res.ok) {
      console.error(`Bedrock answered ${res.status}: ${await res.text()}`);
      return null;
    }
    const answer = await res.json();
    const text: unknown = answer?.output?.message?.content?.[0]?.text;
    // Same limit as the database check on photos.description.
    return typeof text === "string" && text.trim() ? text.trim().slice(0, 2000) : null;
  } catch (err) {
    console.error("Bedrock call failed:", err);
    return null;
  }
}
