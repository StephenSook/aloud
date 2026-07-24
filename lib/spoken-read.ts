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
import { hasNeed, matchNotes, parseNeeds } from "@/lib/needs";

/**
 * Build a clean spoken title. Open Beauty Facts often repeats the brand inside
 * the product name ("Nivea" + "Nivea creme"), so drop the brand prefix when
 * the product name already starts with it.
 */
function productTitle(brand: string, name: string): string {
  const b = brand.trim();
  const n = name.trim();
  if (!b) return n;
  if (!n) return b;
  if (n.toLowerCase().startsWith(b.toLowerCase())) return n;
  return `${b} ${n}`;
}

/** Ingredients shoppers ask about by name; lead the highlights with these. */
export const MARQUEE = new Set([
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

export function composeProductRead(lookup: ProductLookup, needsText?: string): ProductRead {
  if (lookup.status === "not_found") {
    return {
      summary:
        "This barcode is not in the free product database yet, which is common for many products. No problem: point the camera at the ingredients panel and I will read it straight off the label.",
      fullList: null,
    };
  }

  const title = productTitle(lookup.brand, lookup.name) || "This product";

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

  if (needsText && needsText.trim().length > 0) {
    const needs = parseNeeds(needsText);
    if (hasNeed(needs)) {
      parts.push(...matchNotes(needs, names));
    }
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

/**
 * Two-product spoken comparison: identity, fragrance and allergen contrast,
 * shared and distinct marquee ingredients. Appearance language only; the
 * assistant contrasts labels, it never ranks products as better or worse.
 */
export function composeComparisonRead(a: ProductLookup, b: ProductLookup): string {
  if (a.status !== "found" || b.status !== "found") {
    return "I need both products' ingredient lists to compare them, and one of them is not in the database. We can read the missing label with the camera instead.";
  }
  const nameA = productTitle(a.brand, a.name) || "the first product";
  const nameB = productTitle(b.brand, b.name) || "the second product";
  const namesA = a.ingredients.length > 0 ? a.ingredients.map((i) => i.text) : splitIngredientsText(a.ingredientsText);
  const namesB = b.ingredients.length > 0 ? b.ingredients.map((i) => i.text) : splitIngredientsText(b.ingredientsText);

  const allergensA = findListedAllergens(namesA);
  const allergensB = findListedAllergens(namesB);

  const parts: string[] = [`Comparing ${nameA} with ${nameB}.`];

  if (allergensA.length === 0 && allergensB.length === 0) {
    parts.push("Neither label lists an EU-flagged fragrance allergen.");
  } else if (allergensA.length > 0 && allergensB.length === 0) {
    parts.push(
      `${nameA} lists ${allergensA.slice(0, 3).map(titleCase).join(", ")}${allergensA.length > 3 ? " and more" : ""}, which the EU flags as fragrance allergens. ${nameB} lists none.`,
    );
  } else if (allergensA.length === 0 && allergensB.length > 0) {
    parts.push(
      `${nameB} lists ${allergensB.slice(0, 3).map(titleCase).join(", ")}${allergensB.length > 3 ? " and more" : ""}, which the EU flags as fragrance allergens. ${nameA} lists none.`,
    );
  } else {
    parts.push(
      `Both list EU-flagged fragrance allergens: ${allergensA.length} in the first, ${allergensB.length} in the second.`,
    );
  }

  const setA = new Set(namesA.map((n) => n.trim().toUpperCase()));
  const setB = new Set(namesB.map((n) => n.trim().toUpperCase()));
  const sharedMarquee = [...MARQUEE].filter((m) => setA.has(m) && setB.has(m));
  const onlyA = [...MARQUEE].filter((m) => setA.has(m) && !setB.has(m));
  const onlyB = [...MARQUEE].filter((m) => setB.has(m) && !setA.has(m));

  if (sharedMarquee.length > 0) {
    parts.push(`Both lists include ${sharedMarquee.map(titleCase).join(", ")}.`);
  }
  if (onlyA.length > 0) {
    parts.push(`Only ${nameA} lists ${onlyA.map(titleCase).join(", ")}.`);
  }
  if (onlyB.length > 0) {
    parts.push(`Only ${nameB} lists ${onlyB.map(titleCase).join(", ")}.`);
  }

  parts.push(
    `${namesA.length} ingredients versus ${namesB.length}. I compare what the labels list, and the choice stays yours. Ask me about any ingredient by name.`,
  );
  return parts.join(" ");
}
