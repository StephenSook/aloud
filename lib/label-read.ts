/**
 * Spoken read for ingredients recovered from a photo of the label (the
 * Open-Beauty-Facts-miss fallback). Same allergen and CosIng pipeline as a
 * database hit, but framed honestly: this was read from a photo, so it carries
 * a confidence caveat. Every string passes guardrail-lint.
 */
import { describeIngredient } from "@/lib/cosing";
import { findListedAllergens, listsFragrance } from "@/lib/allergens";
import { titleCase } from "@/lib/cosing";
// One shared marquee set; a second copy here had already begun to drift risk.
import { MARQUEE } from "@/lib/spoken-read";

export type LabelRead = { summary: string; fullList: string | null };

export function composeLabelRead(names: string[]): LabelRead {
  const cleaned = names.map((n) => n.trim()).filter((n) => n.length > 0);
  if (cleaned.length === 0) {
    return {
      summary:
        "I could not read the ingredients from that photo. Try again with the panel flat to the camera and good light, or say the product name and I will search for it.",
      fullList: null,
    };
  }

  const allergens = findListedAllergens(cleaned);
  const fragrance = listsFragrance(cleaned);
  const parts: string[] = [`I read ${cleaned.length} ingredients from the label.`];

  if (allergens.length > 0) {
    const spoken = allergens.slice(0, 3).map(titleCase).join(", ");
    const more = allergens.length > 3 ? `, and ${allergens.length - 3} more` : "";
    parts.push(`It lists ${spoken}${more}, which the EU flags as fragrance allergens.`);
  } else if (fragrance) {
    parts.push("It lists fragrance, and no EU-flagged fragrance allergens are named individually.");
  } else {
    // A false negative here is the dangerous direction for someone avoiding an
    // allergen, and a photo read is the least reliable path, so the caution is
    // bound to this exact claim, not left to the general trailing note.
    parts.push(
      "From this photo I did not read fragrance or an EU-flagged fragrance allergen, but a photo read can miss one. If avoiding an allergen matters to you, please double-check another way.",
    );
  }

  const marqueeHits = cleaned
    .map((n) => n.toUpperCase())
    .filter((n) => MARQUEE.has(n))
    .slice(0, 3);
  for (const hit of marqueeHits) {
    const described = describeIngredient(hit);
    if (described) parts.push(described);
  }

  parts.push(
    'I read this from a photo, so double-check anything critical to you. Say "read the full list" to hear all of them, or ask about any ingredient by name.',
  );

  return {
    summary: parts.join(" "),
    fullList: cleaned.map((n) => titleCase(n.toUpperCase())).join(", "),
  };
}
