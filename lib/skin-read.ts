/**
 * Grounded skin read (client-safe: no data imports). Only the structured
 * scores, spoken in bands with the numbers, honest uncertainty in plain
 * words, never blame, always a human-assist reminder.
 */

export type ScoredOutput = { type: string; ui_score?: number };

const CONCERN_SPOKEN: Record<string, string> = {
  redness: "the look of redness",
  oiliness: "the look of shine",
  moisture: "how hydrated your skin looks",
  texture: "how smooth your skin looks",
};

function band(score: number): string {
  if (score >= 80) return "looking strong";
  if (score >= 60) return "in a middle range";
  return "on the lower side";
}

export function composeSkinRead(outputs: ScoredOutput[]): string {
  const scored = outputs.filter(
    (o): o is Required<ScoredOutput> => typeof o.ui_score === "number",
  );
  if (scored.length === 0) {
    return "The analysis finished but returned no scores I can read reliably. Let us try another photo.";
  }
  const parts = scored.map((o) => {
    const label = CONCERN_SPOKEN[o.type] ?? o.type.replace(/_/g, " ");
    return `${label} scored ${o.ui_score} out of 100, ${band(o.ui_score)}`;
  });
  return (
    `Here is what the analysis found. ${parts.join(". ")}. ` +
    "Higher numbers mean healthier looking. These scores describe how your skin looks in this one photo, not a medical assessment, and lighting can shift them. " +
    "If anything sounds off, a second opinion from someone you trust is always a good check."
  );
}
