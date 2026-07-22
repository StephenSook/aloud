import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { composeLabelRead } from "@/lib/label-read";

describe("composeLabelRead", () => {
  it("reads count, allergens, and marquee ingredients from OCR'd names", () => {
    const read = composeLabelRead([
      "Aqua",
      "Glycerin",
      "Niacinamide",
      "Limonene",
      "Linalool",
      "Parfum",
    ]);
    expect(read.summary).toMatch(/read 6 ingredients/i);
    expect(read.summary).toMatch(/Limonene, Linalool/);
    expect(read.summary).toMatch(/read this from a photo/i);
    expect(read.fullList).toContain("Glycerin");
  });

  it("degrades honestly when nothing was read", () => {
    const read = composeLabelRead([]);
    expect(read.summary).toMatch(/could not read the ingredients/i);
    expect(read.fullList).toBeNull();
  });

  it("never crosses the claim line", () => {
    const lexicon = JSON.parse(
      readFileSync(path.resolve(__dirname, "../../data/banned-claims.json"), "utf8"),
    ) as { claims: string[] };
    const patterns = lexicon.claims.map((p) => new RegExp(p, "i"));
    const read = composeLabelRead(["Aqua", "Salicylic Acid", "Retinol", "Parfum"]);
    for (const p of patterns) expect(read.summary).not.toMatch(p);
  });
});
