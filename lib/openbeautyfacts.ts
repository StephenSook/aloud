/**
 * Open Beauty Facts lookup (server-side). A miss returns HTTP 200 with
 * status 0, and products with a record but no parsed ingredients are common
 * (US coverage is thin). Both are normal states with spoken fallbacks,
 * never errors.
 */

const USER_AGENT =
  "Aloud/0.1 (voice-first accessible skincare assistant; https://github.com/StephenSook/aloud)";

export type ObfIngredient = {
  id?: string;
  text: string;
  percent_estimate?: number;
};

export type ProductLookup =
  | { status: "not_found" }
  | { status: "no_ingredients"; name: string; brand: string }
  | {
      status: "found";
      name: string;
      brand: string;
      ingredients: ObfIngredient[];
      ingredientsText: string;
    };

type ObfResponse = {
  status: 0 | 1;
  product?: {
    product_name?: string;
    brands?: string;
    ingredients_text?: string;
    ingredients?: ObfIngredient[];
    states_tags?: string[];
  };
};

export async function lookupBarcode(barcode: string): Promise<ProductLookup> {
  const res = await fetch(
    `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
    { headers: { "User-Agent": USER_AGENT }, cache: "no-store" },
  );
  if (!res.ok && res.status !== 404) {
    throw new Error(`Open Beauty Facts returned HTTP ${res.status}`);
  }
  const body = (await res.json()) as ObfResponse;
  if (body.status === 0 || !body.product) return { status: "not_found" };

  const p = body.product;
  const name = p.product_name?.trim() ?? "";
  const brand = p.brands?.split(",")[0]?.trim() ?? "";
  const complete = p.states_tags?.includes("en:ingredients-completed") ?? false;
  const text = p.ingredients_text?.trim() ?? "";

  if (!complete || text.length === 0) {
    return { status: "no_ingredients", name, brand };
  }
  return {
    status: "found",
    name,
    brand,
    ingredients: p.ingredients ?? [],
    ingredientsText: text,
  };
}

/** Split a raw INCI label string into individual ingredient names. */
export function splitIngredientsText(text: string): string[] {
  return text
    .split(/[,•·]/)
    .map((s) => s.replace(/\.$/, "").trim())
    .filter((s) => s.length > 0);
}
