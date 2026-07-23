import { describe, it, expect, beforeEach, vi } from "vitest";
import { addScannedProduct, getScannedProducts } from "@/lib/session-products";

// Minimal in-memory sessionStorage so the test needs no DOM environment.
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size;
    },
  } as Storage;
}

describe("session-products", () => {
  beforeEach(() => vi.stubGlobal("sessionStorage", memoryStorage()));

  it("accumulates scanned products with ingredients", () => {
    addScannedProduct({ title: "CeraVe", ingredients: ["Water", "Glycerin"] });
    addScannedProduct({ title: "Vaseline", ingredients: ["Petrolatum"] });
    expect(getScannedProducts().map((p) => p.title)).toEqual(["CeraVe", "Vaseline"]);
  });

  it("dedupes by title case-insensitively, keeping the latest", () => {
    addScannedProduct({ title: "CeraVe", ingredients: ["Water"] });
    addScannedProduct({ title: "cerave", ingredients: ["Water", "Niacinamide"] });
    const list = getScannedProducts();
    expect(list).toHaveLength(1);
    expect(list[0].ingredients).toContain("Niacinamide");
  });

  it("ignores an empty title or empty ingredient list", () => {
    addScannedProduct({ title: "", ingredients: ["Water"] });
    addScannedProduct({ title: "X", ingredients: [] });
    expect(getScannedProducts()).toHaveLength(0);
  });

  it("caps at 8, keeping the most recent", () => {
    for (let i = 0; i < 12; i++) addScannedProduct({ title: `P${i}`, ingredients: ["Water"] });
    const list = getScannedProducts();
    expect(list).toHaveLength(8);
    expect(list[0].title).toBe("P4");
    expect(list[7].title).toBe("P11");
  });

  it("returns an empty list on malformed storage", () => {
    sessionStorage.setItem("aloud:products", "not json");
    expect(getScannedProducts()).toEqual([]);
  });
});
