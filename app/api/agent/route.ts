import { NextRequest, NextResponse } from "next/server";
import { generateText, tool, isStepCount } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { describeIngredient, lookupIngredient } from "@/lib/cosing";
import { findListedAllergens } from "@/lib/allergens";
import { lookupBarcode } from "@/lib/openbeautyfacts";
import { composeProductRead } from "@/lib/spoken-read";

const SYSTEM = [
  "You are Aloud, a voice assistant helping a blind or low-vision person shop for skincare.",
  "Answers are spoken aloud: short, warm, plain sentences. No lists, no markdown, no emoji.",
  "Language rules, absolute: describe appearance and listed functions only.",
  "No medical or treatment language of any kind. Never assess, name, or imply any health condition.",
  "If asked a medical question, say you can only describe what labels list, and that a pharmacist or doctor is the right person for health questions.",
  "Ground every ingredient statement in the tools. If a tool has no answer, say you do not know rather than guessing.",
  "Allergen phrasing: say what the label lists, never whether something is safe for the person.",
  "State uncertainty in plain words when data is thin.",
].join(" ");

export async function POST(request: NextRequest) {
  try {
    const { question, context } = (await request.json()) as {
      question: string;
      context?: { productTitle?: string; ingredients?: string[] };
    };
    if (!question || question.length > 500) {
      return NextResponse.json({ error: "missing or oversized question" }, { status: 400 });
    }

    const contextIngredients = context?.ingredients ?? [];
    const contextBlock =
      contextIngredients.length > 0
        ? `The user just scanned: ${context?.productTitle ?? "a product"}. Its label lists: ${contextIngredients.join(", ")}.`
        : "No product has been scanned yet in this session.";

    const result = await generateText({
      model: openai("gpt-5-mini"),
      system: SYSTEM,
      stopWhen: isStepCount(4),
      tools: {
        ingredientInfo: tool({
          description:
            "Look up an ingredient's EU CosIng listed functions and a spoken description",
          inputSchema: z.object({
            name: z.string().describe("Ingredient name as on the label"),
          }),
          execute: async ({ name }) => {
            const hit = lookupIngredient(name);
            if (!hit) return { found: false };
            return {
              found: true,
              functions: hit.functions,
              spoken: describeIngredient(name),
            };
          },
        }),
        allergenCheck: tool({
          description:
            "Check which EU-flagged fragrance allergens appear in a list of ingredient names",
          inputSchema: z.object({ ingredients: z.array(z.string()).max(120) }),
          execute: async ({ ingredients }) => ({
            listedAllergens: findListedAllergens(ingredients),
          }),
        }),
        productLookup: tool({
          description: "Look up a product by barcode in Open Beauty Facts",
          inputSchema: z.object({
            barcode: z.string().regex(/^\d{6,14}$/),
          }),
          execute: async ({ barcode }) => {
            const lookup = await lookupBarcode(barcode);
            return { status: lookup.status, read: composeProductRead(lookup).summary };
          },
        }),
      },
      prompt: `${contextBlock}\n\nThe user asks: ${question}`,
    });

    return NextResponse.json({ answer: result.text });
  } catch (err) {
    console.error("agent failed", err);
    return NextResponse.json(
      { error: "I could not think that through just now. Try again in a moment." },
      { status: 502 },
    );
  }
}
