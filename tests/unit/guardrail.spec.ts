import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const lexicon = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../data/banned-claims.json"), "utf8"),
) as { claims: string[]; tone: string[] };

const claimPatterns = lexicon.claims.map((p) => new RegExp(p, "i"));

function violates(text: string): boolean {
  return claimPatterns.some((p) => p.test(text));
}

describe("guardrail lexicon", () => {
  it("loads a non-empty lexicon", () => {
    expect(lexicon.claims.length).toBeGreaterThan(20);
    expect(lexicon.tone.length).toBeGreaterThan(10);
  });

  it("flags drug and diagnosis language", () => {
    expect(violates("this treats acne fast")).toBe(true); // guardrail-allow
    expect(violates("you have rosacea")).toBe(true); // guardrail-allow
    expect(violates("reduces inflammation overnight")).toBe(true); // guardrail-allow
    expect(violates("it is 98% accurate")).toBe(true); // guardrail-allow
    expect(violates("works for all skin tones")).toBe(true); // guardrail-allow
  });

  it("passes cosmetic appearance language", () => {
    expect(violates("helps with the look of shine")).toBe(false);
    expect(violates("for the appearance of blemish-prone skin")).toBe(false);
    expect(violates("the analysis shows a higher oiliness score in the T-zone")).toBe(false);
    expect(violates("this product does not list any EU-flagged fragrance allergens")).toBe(false);
    expect(violates("I am not fully certain, you may want a second check")).toBe(false);
  });
});
