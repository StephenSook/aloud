/**
 * Realtime voice session configuration. Instructions mirror the agent route's
 * language rules; guardrail-lint enforces every string here.
 */

export const VOICE_INSTRUCTIONS = [
  "You are Aloud, a voice assistant helping a blind or low-vision person shop for skincare and understand how their skin looks.",
  "Speak in short, warm, plain sentences. One thought at a time. Pause naturally.",
  "Language rules, absolute: describe appearance and listed functions only.",
  "No medical or treatment language of any kind. Never assess, name, or imply any health condition.",
  "If asked a medical question, say you can only describe what labels list, and that a pharmacist or doctor is the right person for health questions.",
  "Ground every ingredient statement in the tools. If a tool has no answer, say you do not know rather than guessing.",
  "Allergen phrasing: say what the label lists, never whether something is safe for the person.",
  "State uncertainty in plain words when data is thin. Offer a human second opinion when it matters.",
].join(" ");

export const VOICE_TOOLS = [
  {
    type: "function",
    name: "ingredient_info",
    description:
      "Look up one cosmetic ingredient's EU-listed functions and a spoken description",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Ingredient name as on the label" },
      },
      required: ["name"],
    },
  },
  {
    type: "function",
    name: "allergen_check",
    description:
      "Check which EU-flagged fragrance allergens appear in a list of ingredient names",
    parameters: {
      type: "object",
      properties: {
        ingredients: { type: "array", items: { type: "string" } },
      },
      required: ["ingredients"],
    },
  },
  {
    type: "function",
    name: "product_lookup",
    description: "Look up a product by its barcode digits",
    parameters: {
      type: "object",
      properties: {
        barcode: { type: "string", description: "6 to 14 digit barcode" },
      },
      required: ["barcode"],
    },
  },
] as const;

export type LastScan = { title: string; ingredients: string[] };

export function contextInstructions(lastScan: LastScan | null): string {
  if (!lastScan || lastScan.ingredients.length === 0) {
    return `${VOICE_INSTRUCTIONS} No product has been scanned yet in this session.`;
  }
  return (
    `${VOICE_INSTRUCTIONS} The user's most recently scanned product is ${lastScan.title}. ` +
    `Its label lists: ${lastScan.ingredients.join(", ")}.`
  );
}

/** Executes a Realtime tool call against the app's own API routes. */
export async function executeVoiceTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  // Every branch checks res.ok: an HTTP error body fed to the model as tool
  // data reads as a confident-but-ungrounded answer, which a blind user
  // cannot catch. An explicit error engages the "say you do not know" rule.
  if (name === "ingredient_info") {
    const res = await fetch(
      `/api/tools/ingredient?name=${encodeURIComponent(String(args.name ?? ""))}`,
    );
    if (!res.ok) return { error: "ingredient lookup unavailable right now" };
    return res.json();
  }
  if (name === "allergen_check") {
    const res = await fetch("/api/tools/allergens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients: args.ingredients ?? [] }),
    });
    if (!res.ok) return { error: "allergen check unavailable right now" };
    return res.json();
  }
  if (name === "product_lookup") {
    const res = await fetch(`/api/product/${encodeURIComponent(String(args.barcode ?? ""))}`);
    if (!res.ok) return { error: "product lookup unavailable right now" };
    const body = (await res.json()) as { status: string; read?: { summary: string } };
    return { status: body.status, spoken: body.read?.summary };
  }
  return { error: "unknown tool" };
}
