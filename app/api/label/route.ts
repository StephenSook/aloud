import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { composeLabelRead } from "@/lib/label-read";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

const PROMPT = [
  "This is a photo of a cosmetic or skincare product label.",
  "Extract ONLY the ingredient list (the INCI names, usually after the word 'Ingredients').",
  "Return a strict JSON object: {\"ingredients\": [\"NAME\", ...]} in the order printed.",
  "Do not include quantities, warnings, directions, or marketing text.",
  "If you cannot read an ingredient list, return {\"ingredients\": []}.",
].join(" ");

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

    const bytes = new Uint8Array(await image.arrayBuffer());
    const { text } = await generateText({
      model: openai("gpt-5-mini"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image", image: bytes, mediaType: image.type },
          ],
        },
      ],
    });

    let names: string[] = [];
    try {
      const match = /\{[\s\S]*\}/.exec(text);
      const parsed = JSON.parse(match ? match[0] : text) as { ingredients?: unknown };
      if (Array.isArray(parsed.ingredients)) {
        names = parsed.ingredients.filter((n): n is string => typeof n === "string");
      }
    } catch {
      names = [];
    }

    return NextResponse.json({ read: composeLabelRead(names) });
  } catch (err) {
    console.error("label read failed", err);
    return NextResponse.json(
      { error: "I could not read the label just now. Try again in a moment." },
      { status: 502 },
    );
  }
}
