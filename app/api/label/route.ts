import { NextRequest, NextResponse } from "next/server";
import { composeLabelRead } from "@/lib/label-read";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

const PROMPT = [
  "This is a photo of a cosmetic or skincare product label.",
  "The text may be rotated, sideways, on a curved bottle, or partly in shadow: read it carefully anyway.",
  "Extract the full ingredient list. Include the active ingredient if a Drug Facts panel lists one, then the inactive or main ingredients (the INCI names).",
  'Return a strict JSON object: {"ingredients": ["NAME", ...]} in the order printed.',
  "Do not include quantities, warnings, directions, or marketing text.",
  'Only if there is genuinely no readable ingredient list, return {"ingredients": []}.',
].join(" ");

async function readIngredients(dataUrl: string): Promise<string[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`vision HTTP ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content ?? "";
  try {
    const match = /\{[\s\S]*\}/.exec(text);
    const parsed = JSON.parse(match ? match[0] : text) as { ingredients?: unknown };
    if (Array.isArray(parsed.ingredients)) {
      return parsed.ingredients.filter((n): n is string => typeof n === "string");
    }
  } catch {
    // fall through to empty
  }
  return [];
}

/**
 * Reads ingredients off a label photo. Calls OpenAI vision directly with
 * detail:"high" (verified essential: at the default detail the model
 * downscales the image and reads nothing off small, curved real-world labels).
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "missing image file" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(image.type)) {
      return NextResponse.json({ error: "image must be jpeg or png" }, { status: 400 });
    }
    if (image.size > MAX_BYTES) {
      return NextResponse.json({ error: "image exceeds 10MB" }, { status: 400 });
    }

    const b64 = Buffer.from(await image.arrayBuffer()).toString("base64");
    const dataUrl = `data:${image.type};base64,${b64}`;

    // Real-world label reads are occasionally flaky (rotation, curve, glare);
    // one retry turns a stray empty read into a hit at trivial cost.
    let names = await readIngredients(dataUrl);
    if (names.length === 0) names = await readIngredients(dataUrl);

    return NextResponse.json({ read: composeLabelRead(names) });
  } catch (err) {
    console.error("label read failed", err);
    return NextResponse.json(
      { error: "I could not read the label just now. Try again in a moment." },
      { status: 502 },
    );
  }
}
