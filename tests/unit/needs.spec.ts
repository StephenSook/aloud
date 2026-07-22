import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { hasNeed, matchNotes, parseNeeds } from "@/lib/needs";
import { composeProductRead } from "@/lib/spoken-read";
import type { ProductLookup } from "@/lib/openbeautyfacts";

describe("parseNeeds", () => {
  it("reads intents from plain language", () => {
    const n = parseNeeds("oily T-zone and fragrance makes me itch");
    expect(n.wantOilControl).toBe(true);
    expect(n.avoidFragrance).toBe(true);
    expect(n.wantHydration).toBe(false);
    expect(hasNeed(n)).toBe(true);
  });

  it("is empty for no stated needs", () => {
    expect(hasNeed(parseNeeds("hello"))).toBe(false);
  });
});

describe("matchNotes", () => {
  it("flags fragrance concern against listed allergens", () => {
    const notes = matchNotes(parseNeeds("fragrance-sensitive"), ["Aqua", "Limonene", "Parfum"]);
    expect(notes.join(" ")).toMatch(/avoiding fragrance/i);
    expect(notes.join(" ")).toMatch(/Limonene/);
  });

  it("relates dryness to listed humectants", () => {
    const notes = matchNotes(parseNeeds("my skin is dry"), ["Aqua", "Glycerin", "Sodium Hyaluronate"]);
    expect(notes.join(" ")).toMatch(/dryness/i);
    expect(notes.join(" ")).toMatch(/humectant/i);
  });

  it("reports ingredient count for a minimal request", () => {
    const notes = matchNotes(parseNeeds("simple short list"), ["Aqua", "Glycerin"]);
    expect(notes.join(" ")).toMatch(/2 ingredients/);
  });
});

describe("composeProductRead with needs", () => {
  const lookup: ProductLookup = {
    status: "found",
    brand: "Test",
    name: "Serum",
    ingredients: [{ text: "Aqua" }, { text: "Glycerin" }, { text: "Limonene" }, { text: "Parfum" }],
    ingredientsText: "Aqua, Glycerin, Limonene, Parfum",
  };

  it("appends a needs match when needs are given", () => {
    const read = composeProductRead(lookup, "dry skin, avoid fragrance");
    expect(read.summary).toMatch(/avoiding fragrance/i);
    expect(read.summary).toMatch(/dryness/i);
  });

  it("adds nothing when no needs are given", () => {
    const read = composeProductRead(lookup);
    expect(read.summary).not.toMatch(/you mentioned/i);
  });

  it("keeps needs matching claim-clean", () => {
    const lexicon = JSON.parse(
      readFileSync(path.resolve(__dirname, "../../data/banned-claims.json"), "utf8"),
    ) as { claims: string[] };
    const patterns = lexicon.claims.map((p) => new RegExp(p, "i"));
    const read = composeProductRead(lookup, "oily, dry, fragrance, minimal");
    for (const p of patterns) expect(read.summary).not.toMatch(p);
  });
});
