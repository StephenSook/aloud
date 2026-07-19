/**
 * EU fragrance-allergen matching (Reg 1223/2009 Annex III as amended by
 * 2023/1545). Phrasing rule: say what the label LISTS, never what is safe
 * for the person. Absence of a listed allergen is not proof of a
 * fragrance-free formula.
 */
import data from "@/data/allergens.json";

const ALLERGENS = new Set((data as { names: string[] }).names);

function normalize(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, " ").replace(/[*.]+$/, "");
}

/** Returns the EU-listed fragrance allergens present in an ingredient list. */
export function findListedAllergens(ingredientNames: string[]): string[] {
  const hits: string[] = [];
  for (const raw of ingredientNames) {
    const name = normalize(raw);
    if (ALLERGENS.has(name) && !hits.includes(name)) hits.push(name);
  }
  return hits;
}

/** True when the label lists Parfum/Fragrance/Aroma as an ingredient. */
export function listsFragrance(ingredientNames: string[]): boolean {
  return ingredientNames.some((raw) => {
    const name = normalize(raw);
    return name === "PARFUM" || name === "FRAGRANCE" || name === "AROMA" ||
      name.startsWith("PARFUM (") || name.startsWith("FRAGRANCE (");
  });
}

export function allergenListSize(): number {
  return ALLERGENS.size;
}
