/**
 * Spoken-read composition: every judged sentence the app says about products
 * and skin comes from here, so guardrail-lint on this file covers the app's
 * voice. Rules: appearance and listed-function language only, honest
 * uncertainty in plain words, never blame the user.
 */
import { describeIngredient } from "@/lib/cosing";
import { findListedAllergens, listsFragrance } from "@/lib/allergens";
import { splitIngredientsText, type ProductLookup } from "@/lib/openbeautyfacts";
import { titleCase } from "@/lib/cosing";

/** Ingredients shoppers ask about by name; lead the highlights with these. */
const MARQUEE = new Set([
  "NIACINAMIDE",
  "RETINOL",
  "SODIUM HYALURONATE",
  "HYALURONIC ACID",
  "SALICYLIC ACID",
  "GLYCOLIC ACID",
  "LACTIC ACID",
  "ASCORBIC ACID",
  "TOCOPHEROL",
  "CERAMIDE NP",
  "GLYCERIN",
  "PANTHENOL",
  "AZELAIC ACID",
  "ZINC OXIDE",
  "TITANIUM DIOXIDE",
]);

export type ProductRead = {
  /** Layer 1: identity plus the highlights a shopper needs first. */
  summary: string;
  /** Layer 2: the full list, spoken on request. */
  fullList: string | null;
};

export function composeProductRead(lookup: ProductLookup): ProductRead {
  if (lookup.status === "not_found") {
    return {
      summary:
        "I could not find this product by its barcode. We can try the label instead: point the camera at the ingredients panel, or tell me the product name.",
      fullList: null,
    };
  }

  const title = [lookup.brand, lookup.name].filter(Boolean).join(" ") || "This product";

  if (lookup.status === "no_ingredients") {
    return {
      summary: `I found ${title}, but its ingredient list is not in the database yet. Point the camera at the ingredients panel and I will read it from the label.`,
      fullList: null,
    };
  }

  const names =
    lookup.ingredients.length > 0
      ? lookup.ingredients.map((i) => i.text)
      : splitIngredientsText(lookup.ingredientsText);

  const allergens = findListedAllergens(names);
  const fragrance = listsFragrance(names);

  const parts: string[] = [`${title}.`];

  if (allergens.length > 0) {
    const spoken = allergens.slice(0, 3).map(titleCase).join(", ");
    const more = allergens.length > 3 ? `, and ${allergens.length - 3} more` : "";
    parts.push(`The label lists ${spoken}${more}, which the EU flags as fragrance allergens.`);
  } else if (fragrance) {
    parts.push(
      "The label lists fragrance, and no EU-flagged fragrance allergens are named individually.",
    );
  } else {
    parts.push(
      "The label does not list fragrance or any EU-flagged fragrance allergen. That is what the label says, not a guarantee about the formula.",
    );
  }

  const marqueeHits = names
    .map((n) => n.trim().toUpperCase())
    .filter((n) => MARQUEE.has(n))
    .slice(0, 3);
  for (const hit of marqueeHits) {
    const described = describeIngredient(hit);
    if (described) parts.push(described);
  }

  parts.push(
    `${names.length} ingredients in total. Say "read the full list" to hear all of them, or ask about any ingredient by name.`,
  );

  return {
    summary: parts.join(" "),
    fullList: names.map((n) => titleCase(n.trim().toUpperCase())).join(", "),
  };
}

export { composeSkinRead } from "@/lib/skin-read";
