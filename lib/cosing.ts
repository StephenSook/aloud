/**
 * EU CosIng ingredient-function lookup (server-side; data/cosing.json is
 * ~2.4MB and must never enter a client bundle).
 *
 * Language rule: descriptions state the LISTED function in appearance terms.
 * Never efficacy, never treatment. Every string here passes guardrail-lint.
 */
import table from "@/data/cosing.json";

const COSING = table as Record<string, string[]>;

/** Plain cosmetic-language descriptions for common CosIng function terms. */
const FUNCTION_DESCRIPTIONS: Record<string, string> = {
  HUMECTANT: "a humectant, which helps skin hold surface moisture",
  "SKIN CONDITIONING": "a skin-conditioning ingredient",
  "SKIN CONDITIONING - EMOLLIENT": "an emollient, for a softer feel",
  "SKIN CONDITIONING - HUMECTANT": "a moisture-binding skin conditioner",
  "SKIN CONDITIONING - OCCLUSIVE": "an occlusive, which helps slow surface moisture loss",
  "SKIN CONDITIONING - MISCELLANEOUS": "a skin-conditioning ingredient",
  MOISTURISING: "moisturising",
  "SKIN PROTECTING": "skin-protecting",
  EMOLLIENT: "an emollient, for a softer feel",
  SOLVENT: "a solvent, which helps dissolve other ingredients",
  "VISCOSITY CONTROLLING": "a texture ingredient, adjusting thickness",
  "EMULSION STABILISING": "a texture ingredient, keeping the formula mixed",
  SURFACTANT: "a surfactant, which helps lift away oil and residue",
  "SURFACTANT - CLEANSING": "a cleansing agent",
  "SURFACTANT - EMULSIFYING": "an emulsifier, keeping oil and water mixed",
  "SURFACTANT - FOAM BOOSTING": "a foam booster",
  CLEANSING: "a cleansing agent",
  ANTIOXIDANT: "an antioxidant, which helps keep the formula fresh",
  PRESERVATIVE: "a preservative, which keeps the product from spoiling",
  FRAGRANCE: "a fragrance ingredient",
  PERFUMING: "a fragrance ingredient",
  COLORANT: "a colorant",
  OPACIFYING: "a texture ingredient, giving an opaque look",
  ABRASIVE: "a physical exfoliating particle",
  EXFOLIATING: "exfoliating",
  ASTRINGENT: "an astringent, for a tightened feel",
  SOOTHING: "soothing",
  REFRESHING: "refreshing",
  SMOOTHING: "smoothing",
  TONIC: "a tonic",
  "UV FILTER": "a UV filter",
  "UV ABSORBER": "a UV absorber, protecting the formula from light",
  "HAIR CONDITIONING": "a hair-conditioning ingredient",
  BUFFERING: "a pH-balancing ingredient",
  "pH ADJUSTERS": "a pH-balancing ingredient",
  CHELATING: "a stabilising ingredient",
  "FILM FORMING": "a film former, which leaves a smooth surface layer",
  OCCLUSIVE: "an occlusive, which helps slow surface moisture loss",
  DEODORANT: "a deodorant ingredient",
  ANTIPERSPIRANT: "an antiperspirant ingredient",
  BULKING: "a texture ingredient",
  BINDING: "a texture ingredient, holding the formula together",
  ABSORBENT: "an absorbent, which helps soak up oil",
  "ANTI-SEBUM": "for the look of excess oil",
  MATTIFYING: "for a matte finish",
};

function normalizeKey(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Look up an ingredient as it appears on a label. Labels write variants like
 * "Water (Aqua)" or "Parfum (Fragrance)", so parenthetical alternates are
 * tried as fallbacks.
 */
export function lookupIngredient(labelName: string): { name: string; functions: string[] } | null {
  const primary = normalizeKey(labelName);
  const candidates = [primary];

  const paren = /^([^(]+)\(([^)]+)\)$/.exec(primary);
  if (paren) {
    candidates.push(normalizeKey(paren[1]), normalizeKey(paren[2]));
  }

  for (const candidate of candidates) {
    const functions = COSING[candidate];
    if (functions) return { name: candidate, functions };
  }
  return null;
}

/**
 * Shopper-relevance order for the spoken summary: what the ingredient does
 * for skin feel comes before formulation roles like denaturant or solvent.
 */
const SPOKEN_PRIORITY = [
  "SKIN CONDITIONING - HUMECTANT",
  "HUMECTANT",
  "MOISTURISING",
  "SKIN CONDITIONING - EMOLLIENT",
  "SKIN CONDITIONING - OCCLUSIVE",
  "SKIN CONDITIONING",
  "SKIN CONDITIONING - MISCELLANEOUS",
  "SKIN PROTECTING",
  "SOOTHING",
  "SMOOTHING",
  "EXFOLIATING",
  "ABRASIVE",
  "UV FILTER",
  "CLEANSING",
  "SURFACTANT - CLEANSING",
  "ANTIOXIDANT",
  "PRESERVATIVE",
  "FRAGRANCE",
  "PERFUMING",
];

function spokenRank(fn: string): number {
  const i = SPOKEN_PRIORITY.indexOf(fn);
  return i === -1 ? SPOKEN_PRIORITY.length : i;
}

/** Speakable description of what an ingredient is LISTED as, never efficacy. */
export function describeIngredient(labelName: string): string | null {
  const hit = lookupIngredient(labelName);
  if (!hit) return null;
  const described = [...hit.functions]
    .sort((a, b) => spokenRank(a) - spokenRank(b))
    .map((f) => FUNCTION_DESCRIPTIONS[f])
    .filter((d): d is string => Boolean(d))
    .filter((d, i, all) => all.indexOf(d) === i);
  if (described.length === 0) {
    return `${titleCase(hit.name)} is listed in the EU ingredient inventory.`;
  }
  const top = described.slice(0, 2).join(", and ");
  return `${titleCase(hit.name)} is listed as ${top}.`;
}

export function titleCase(upper: string): string {
  return upper
    .toLowerCase()
    .replace(/(^|[\s/-])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}

export function tableSize(): number {
  return Object.keys(COSING).length;
}
