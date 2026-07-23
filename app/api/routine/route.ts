import { NextRequest, NextResponse } from "next/server";
import { generateText, tool, isStepCount } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { describeIngredient, lookupIngredient } from "@/lib/cosing";
import { findListedAllergens } from "@/lib/allergens";

// Safety phrasing deliberately avoids the guardrail-lint claim triggers, and
// no skin-condition name appears anywhere in this prompt.
const SYSTEM = [
  "You are Aloud, helping a blind or low-vision person put the skincare products they already own into a sensible order.",
  "Everything is spoken aloud: short, warm, plain sentences, no lists, no markdown, no emoji. Use 'first', 'then', 'after that', not numbers.",
  "Absolute language rules: describe only appearance and each product's own labeled cosmetic function. Do not claim a product acts on, fixes, changes, or improves any skin health matter, and never name a skin condition. If asked something medical, say a pharmacist or doctor is the right person.",
  "Build a suggested order, framed as a suggestion, not advice. Use the products' labeled roles: in the morning, a cleanser first, then any light leave-on, then a moisturizer, then a sun-protection product if one was scanned. In the evening, a cleanser, then leave-ons, then a moisturizer.",
  "Use the ingredientInfo tool to ground what a product does from its ingredients' listed functions. Use allergenCheck to mention when a product lists an EU-flagged fragrance allergen, always phrased as what the label lists, never as safe or unsafe.",
  "Relate the order to the person's skin read and stated needs in plain appearance words. For example, if oiliness reads high, favor the lighter moisturizer. If the data is thin, say so plainly.",
  "Keep it to a morning and an evening, roughly six sentences. End by noting this is a suggested order based on what the labels say.",
].join(" ");

export async function POST(request: NextRequest) {
  try {
    const { products, skin, needs } = (await request.json()) as {
      products?: { title: string; ingredients: string[] }[];
      skin?: { scores?: Record<string, number> };
      needs?: string;
    };

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "Scan a product or two first, then I can put them in order." },
        { status: 400 },
      );
    }

    const productBlock = products
      .slice(0, 8)
      .map(
        (p, i) =>
          `Product ${i + 1}: ${p.title}. Its label lists: ${(p.ingredients ?? []).slice(0, 40).join(", ")}.`,
      )
      .join("\n");
    const skinBlock =
      skin?.scores && Object.keys(skin.scores).length > 0
        ? `Their skin read, appearance scores from 0 to 100: ${Object.entries(skin.scores)
            .map(([k, v]) => `${k} ${v}`)
            .join(", ")}.`
        : "No skin read was captured this session.";
    const needsBlock = needs?.trim() ? `What they told us they want: ${needs.trim()}.` : "";

    const result = await generateText({
      model: openai("gpt-5-mini"),
      system: SYSTEM,
      stopWhen: isStepCount(8),
      tools: {
        ingredientInfo: tool({
          description: "Look up an ingredient's EU CosIng listed cosmetic functions",
          inputSchema: z.object({ name: z.string() }),
          execute: async ({ name }) => {
            const hit = lookupIngredient(name);
            return hit
              ? { found: true, functions: hit.functions, spoken: describeIngredient(name) }
              : { found: false };
          },
        }),
        allergenCheck: tool({
          description:
            "Which EU-flagged fragrance allergens a list of ingredient names contains",
          inputSchema: z.object({ ingredients: z.array(z.string()).max(120) }),
          execute: async ({ ingredients }) => ({
            listedAllergens: findListedAllergens(ingredients),
          }),
        }),
      },
      prompt: `${productBlock}\n\n${skinBlock}\n${needsBlock}\n\nPut these into a suggested morning and evening order.`,
    });

    return NextResponse.json({ routine: result.text });
  } catch (err) {
    console.error("routine failed", err);
    return NextResponse.json(
      { error: "I could not put the routine together just now. Try again in a moment." },
      { status: 502 },
    );
  }
}
