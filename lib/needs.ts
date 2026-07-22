/**
 * Match a product to the shopper's stated needs, in appearance and
 * label-listed-function language only. Deterministic and grounded in the
 * ingredient list and CosIng functions: a blind user cannot catch a wrong
 * match, so this never guesses and never makes a treatment claim.
 */
import { lookupIngredient, titleCase } from "@/lib/cosing";
import { findListedAllergens, listsFragrance } from "@/lib/allergens";

export type Needs = {
  avoidFragrance: boolean;
  wantHydration: boolean;
  wantOilControl: boolean;
  wantMinimal: boolean;
};

export function parseNeeds(text: string): Needs {
  const t = text.toLowerCase();
  const any = (words: string[]) => words.some((w) => t.includes(w));
  return {
    avoidFragrance: any(["fragrance", "perfume", "scent", "unscented", "itch", "irritat", "sensitive"]),
    wantHydration: any(["dry", "dryness", "hydrat", "moistur", "flaky", "flak", "tight"]),
    wantOilControl: any(["oily", "oil", "shine", "shiny", "greasy", "matte", "mattif", "t-zone", "t zone", "pores"]),
    wantMinimal: any(["minimal", "simple", "short list", "few ingredients", "clean", "fewer"]),
  };
}

export function hasNeed(needs: Needs): boolean {
  return needs.avoidFragrance || needs.wantHydration || needs.wantOilControl || needs.wantMinimal;
}

function ingredientHasFunction(name: string, fns: string[]): boolean {
  const hit = lookupIngredient(name);
  if (!hit) return false;
  return hit.functions.some((f) => fns.includes(f));
}

/** Appearance-language notes relating the product to the stated needs. */
export function matchNotes(needs: Needs, ingredientNames: string[]): string[] {
  const notes: string[] = [];

  if (needs.avoidFragrance) {
    const allergens = findListedAllergens(ingredientNames);
    if (allergens.length > 0) {
      notes.push(
        `You mentioned avoiding fragrance. Worth knowing: this one lists ${allergens
          .slice(0, 2)
          .map(titleCase)
          .join(", ")}, which the EU flags as fragrance allergens.`,
      );
    } else if (listsFragrance(ingredientNames)) {
      notes.push("You mentioned avoiding fragrance. This one lists fragrance, though no allergen is named individually.");
    } else {
      notes.push("You mentioned avoiding fragrance. This label does not list fragrance or an EU-flagged allergen.");
    }
  }

  if (needs.wantHydration) {
    const humectants = ingredientNames.filter((n) =>
      ingredientHasFunction(n, ["HUMECTANT", "SKIN CONDITIONING - HUMECTANT", "MOISTURISING"]),
    );
    if (humectants.length > 0) {
      notes.push(
        `You mentioned dryness. This one lists ${humectants
          .slice(0, 2)
          .map((n) => titleCase(n.trim().toUpperCase()))
          .join(" and ")}, described as humectants that help skin hold surface moisture.`,
      );
    }
  }

  if (needs.wantOilControl) {
    const absorbents = ingredientNames.filter((n) =>
      ingredientHasFunction(n, ["ABSORBENT", "MATTIFYING", "ANTI-SEBUM"]),
    );
    if (absorbents.length > 0) {
      notes.push(
        `You mentioned shine. This one lists ${absorbents
          .slice(0, 2)
          .map((n) => titleCase(n.trim().toUpperCase()))
          .join(" and ")}, listed as oil-absorbing.`,
      );
    }
  }

  if (needs.wantMinimal) {
    notes.push(
      `You wanted a shorter list. This one has ${ingredientNames.length} ingredients.`,
    );
  }

  return notes;
}
