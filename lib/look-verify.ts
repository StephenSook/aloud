/**
 * Makeup look-verification (client-safe, no data imports): compare the
 * post-makeup analysis against this session's bare-skin baseline and speak
 * the DELTAS. Grounded in scores only; heavy honest uncertainty, because a
 * blind user cannot double-check a confident wrong answer about their face.
 */

export type ScoredOutput = { type: string; ui_score?: number };

export type Baseline = { capturedAt: number; scores: Record<string, number> };

const DELTA_SPOKEN: Record<string, { covered: string; axis: string }> = {
  redness: { covered: "the look of redness appears more evened out", axis: "redness coverage" },
  texture: { covered: "skin texture looks smoother", axis: "smoothness" },
  moisture: { covered: "skin looks more hydrated", axis: "the hydrated look" },
  oiliness: { covered: "shine looks more controlled", axis: "the matte look" },
  // The 7-concern tier (PR #50) added these; without entries their deltas
  // were silently dropped from the before-and-after read.
  pore: { covered: "pores look less noticeable", axis: "the look of pores" },
  radiance: { covered: "skin looks more radiant", axis: "radiance" },
  firmness: { covered: "skin looks firmer to the eye", axis: "the look of firmness" },
};

export function toBaseline(outputs: ScoredOutput[], now: number): Baseline {
  const scores: Record<string, number> = {};
  for (const o of outputs) {
    if (typeof o.ui_score === "number") scores[o.type] = o.ui_score;
  }
  return { capturedAt: now, scores };
}

export function composeLookVerify(
  baseline: Baseline | null,
  outputs: ScoredOutput[],
): string {
  const current = toBaseline(outputs, 0).scores;
  const concerns = Object.keys(current);
  if (concerns.length === 0) {
    return "The analysis returned no scores I can compare reliably. Let us try another photo.";
  }

  if (!baseline || Object.keys(baseline.scores).length === 0) {
    return (
      "I do not have a bare-skin photo from this session to compare against, so I can only describe this photo on its own. " +
      "For a before-and-after read, do a skin capture before applying makeup next time. " +
      concerns
        .map((c) => `${c.replace(/_/g, " ")} scored ${current[c]} out of 100`)
        .join(", ") +
      ". Higher numbers mean healthier looking."
    );
  }

  const improved: string[] = [];
  const unchanged: string[] = [];
  const lower: string[] = [];
  for (const concern of concerns) {
    const before = baseline.scores[concern];
    if (typeof before !== "number") continue;
    const after = current[concern];
    const delta = after - before;
    const spoken = DELTA_SPOKEN[concern];
    if (!spoken) continue;
    // Threshold calibrated 2026-07-19: the API is deterministic on identical
    // input (repeat-run delta 0), and a controlled makeup edit moved scores
    // +2 to +4, so +-3 separates signal from capture variance.
    if (delta >= 3) improved.push(`${spoken.covered}, from ${before} to ${after}`);
    else if (delta <= -3) lower.push(`${spoken.axis} reads lower than before, ${before} down to ${after}`);
    else unchanged.push(spoken.axis);
  }

  const parts: string[] = ["Comparing with your bare-skin photo from this session."];
  if (improved.length > 0) parts.push(`After your makeup, ${improved.join("; and ")}.`);
  if (unchanged.length > 0) parts.push(`${joinList(unchanged)} read about the same as before.`);
  if (lower.length > 0) {
    parts.push(
      `One thing to know: ${lower.join("; and ")}. That can come from the makeup itself or from different lighting, I cannot be certain which.`,
    );
  }
  if (improved.length === 0 && lower.length === 0) {
    parts.push("Overall the scores read about the same as before your makeup.");
  }
  parts.push(
    "These numbers compare two photos, and light or angle can shift them. I can speak to the scores, not to artistry. If it matters today, a quick check with someone you trust is a good final step.",
  );
  return parts.join(" ");
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
