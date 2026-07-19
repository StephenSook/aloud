import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { composeLookVerify, toBaseline, type Baseline } from "@/lib/look-verify";

const baseline: Baseline = {
  capturedAt: 1,
  scores: { redness: 62, oiliness: 70, moisture: 69, texture: 66 },
};

describe("composeLookVerify", () => {
  it("speaks improvements as before-to-after deltas", () => {
    const read = composeLookVerify(baseline, [
      { type: "redness", ui_score: 78 },
      { type: "texture", ui_score: 75 },
      { type: "oiliness", ui_score: 72 },
      { type: "moisture", ui_score: 70 },
    ]);
    expect(read).toMatch(/redness.*62 to 78/i);
    expect(read).toMatch(/smoother.*66 to 75/i);
    expect(read).toMatch(/about the same/i);
    expect(read).toMatch(/cannot be certain|can shift them/i);
    expect(read).toMatch(/someone you trust/i);
  });

  it("attributes lower scores to makeup OR lighting, never blame", () => {
    const read = composeLookVerify(baseline, [
      { type: "moisture", ui_score: 55 },
      { type: "redness", ui_score: 63 },
    ]);
    expect(read).toMatch(/69 down to 55/);
    expect(read).toMatch(/makeup itself or from different lighting/i);
  });

  it("degrades honestly without a baseline", () => {
    const read = composeLookVerify(null, [{ type: "redness", ui_score: 70 }]);
    expect(read).toMatch(/only describe this photo on its own/i);
    expect(read).toMatch(/before applying makeup next time/i);
  });

  it("never crosses the claim line", () => {
    const lexicon = JSON.parse(
      readFileSync(path.resolve(__dirname, "../../data/banned-claims.json"), "utf8"),
    ) as { claims: string[] };
    const patterns = lexicon.claims.map((p) => new RegExp(p, "i"));
    for (const read of [
      composeLookVerify(baseline, [{ type: "redness", ui_score: 90 }]),
      composeLookVerify(null, [{ type: "oiliness", ui_score: 40 }]),
      composeLookVerify(baseline, []),
    ]) {
      for (const p of patterns) expect(read).not.toMatch(p);
    }
  });

  it("toBaseline keeps only scored outputs", () => {
    const b = toBaseline([{ type: "redness", ui_score: 70 }, { type: "all" }], 5);
    expect(b.scores).toEqual({ redness: 70 });
  });
});
