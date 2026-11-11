// Server only. Describes a photo with a vision model on Amazon Bedrock (Converse API, plain fetch).
// Off when AWS_BEARER_TOKEN_BEDROCK is not set: uploads then work the same, without a description.

// Written for HyLight's operations team, who inspect infrastructure from an airship:
// what is there, its apparent condition, and what an inspector should look at.
const PROMPT =
  "You help an airship operations team that inspects linear infrastructure (power lines, " +
  "railways, pipelines, roads) from the air. Describe this aerial photo in at most two short " +
  "sentences: first the infrastructure visible and its apparent condition, then anything an " +
  "inspector should check (vegetation close to the line or track, visible damage, works, " +
  "obstacles, people or vehicles nearby). If nothing needs attention, say so. " +
  "Only describe what is visible; do not guess. No introduction.";

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
