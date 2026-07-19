import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { composeProductRead, composeSkinRead } from "@/lib/spoken-read";
import { findListedAllergens, allergenListSize, listsFragrance } from "@/lib/allergens";
import { splitIngredientsText, type ProductLookup } from "@/lib/openbeautyfacts";

function obfFixture(code: string): ProductLookup {
  const raw = JSON.parse(
    readFileSync(path.resolve(__dirname, "../fixtures/obf", `${code}.json`), "utf8"),
  );
  if (raw.status === 0) return { status: "not_found" };
  const p = raw.product;
  const complete = p.states_tags?.includes("en:ingredients-completed") ?? false;
  const text = p.ingredients_text?.trim() ?? "";
  if (!complete || !text) {
    return { status: "no_ingredients", name: p.product_name ?? "", brand: p.brands ?? "" };
  }
  return {
    status: "found",
    name: p.product_name ?? "",
    brand: (p.brands ?? "").split(",")[0],
    ingredients: p.ingredients ?? [],
    ingredientsText: text,
  };
}

describe("allergen matching", () => {
  it("bundles the amended EU list", () => {
    expect(allergenListSize()).toBeGreaterThanOrEqual(85);
  });

  it("finds listed allergens and fragrance markers", () => {
    const names = ["Aqua", "Glycerin", "Limonene", "Linalool", "Parfum"];
    expect(findListedAllergens(names)).toEqual(["LIMONENE", "LINALOOL"]);
    expect(listsFragrance(names)).toBe(true);
    expect(listsFragrance(["Aqua", "Glycerin"])).toBe(false);
  });
});

describe("composeProductRead (live-captured OBF fixtures)", () => {
  it("misses speak the designed fallback, not an error", () => {
    const read = composeProductRead(obfFixture("3600523971282"));
    expect(read.summary).toMatch(/could not find this product/i);
    expect(read.summary).toMatch(/label|name/i);
    expect(read.fullList).toBeNull();
  });

  it("hits lead with identity then allergen status then highlights", () => {
    const read = composeProductRead(obfFixture("5060022308176"));
    expect(read.summary.length).toBeGreaterThan(40);
    expect(read.summary).toMatch(/fragrance|allergen/i);
    expect(read.summary).toMatch(/ingredients in total/i);
    expect(read.fullList).toBeTruthy();
  });

  it("never crosses the claim line on any fixture", () => {
    const lexicon = JSON.parse(
      readFileSync(path.resolve(__dirname, "../../data/banned-claims.json"), "utf8"),
    ) as { claims: string[] };
    const patterns = lexicon.claims.map((p) => new RegExp(p, "i"));
    for (const code of ["3600523971282", "5060022308176", "01133479"]) {
      const read = composeProductRead(obfFixture(code));
      for (const p of patterns) {
        expect(read.summary, `${code} matches /${p.source}/`).not.toMatch(p);
      }
    }
  });
});

describe("composeSkinRead", () => {
  it("speaks bands with numbers, uncertainty, and a human-assist reminder", () => {
    const read = composeSkinRead([
      { type: "redness", ui_score: 75 },
      { type: "oiliness", ui_score: 55 },
      { type: "all" },
    ]);
    expect(read).toMatch(/redness.*75 out of 100/i);
    expect(read).toMatch(/shine.*55 out of 100/i);
    expect(read).toMatch(/one photo/i);
    expect(read).toMatch(/second opinion/i);
  });

  it("refuses gracefully with no scores", () => {
    expect(composeSkinRead([{ type: "all" }])).toMatch(/another photo/i);
  });
});

describe("splitIngredientsText", () => {
  it("splits label strings into names", () => {
    expect(splitIngredientsText("Aqua, Glycerin, Parfum.")).toEqual([
      "Aqua",
      "Glycerin",
      "Parfum",
    ]);
  });
});
