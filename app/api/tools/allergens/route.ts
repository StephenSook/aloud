import { NextRequest, NextResponse } from "next/server";
import { findListedAllergens } from "@/lib/allergens";

/** Voice-tool endpoint: EU fragrance-allergen check over ingredient names. */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { ingredients?: string[] };
  const ingredients = (body.ingredients ?? []).slice(0, 120);
  return NextResponse.json({ listedAllergens: findListedAllergens(ingredients) });
}
