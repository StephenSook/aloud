import { describe, expect, it } from "vitest";
import {
  describeIngredient,
  lookupIngredient,
  tableSize,
} from "@/lib/cosing";

describe("cosing table", () => {
  it("bundles the full ingredient inventory", () => {
    expect(tableSize()).toBeGreaterThan(30_000);
  });

  it("finds the load-bearing common ingredients", () => {
    for (const name of [
      "GLYCERIN",
      "NIACINAMIDE",
      "SODIUM HYALURONATE",
      "PARFUM",
      "LIMONENE",
      "AQUA",
      "RETINOL",
      "TOCOPHEROL",
      "DIMETHICONE",
      "PHENOXYETHANOL",
    ]) {
      const hit = lookupIngredient(name);
      expect(hit, name).not.toBeNull();
      expect(hit!.functions.length, name).toBeGreaterThan(0);
    }
  });

  it("handles label-style casing and parenthetical variants", () => {
    expect(lookupIngredient("glycerin")?.name).toBe("GLYCERIN");
    expect(lookupIngredient("  Aqua ")?.name).toBe("AQUA");
    expect(["WATER", "AQUA"]).toContain(lookupIngredient("Water (Aqua)")?.name);
    expect(lookupIngredient("Parfum (Fragrance)")?.name).toBe("PARFUM");
  });

  it("returns null for unknown ingredients instead of guessing", () => {
    expect(lookupIngredient("DEFINITELY NOT AN INGREDIENT XYZ")).toBeNull();
    expect(describeIngredient("DEFINITELY NOT AN INGREDIENT XYZ")).toBeNull();
  });

  it("describes in listed-function language only", () => {
    const described = describeIngredient("GLYCERIN");
    expect(described).toMatch(/listed as/i);
    expect(described).toMatch(/humectant|moisture/i);
  });
});
