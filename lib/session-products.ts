/**
 * Session accumulator for products scanned this visit, with their ingredients,
 * so the routine builder can reason over everything the shopper has looked at,
 * not just the last item. Session-scoped (sessionStorage), never persisted.
 */
export type ScannedProduct = { title: string; ingredients: string[] };

const KEY = "aloud:products";
const MAX = 8;

export function addScannedProduct(product: ScannedProduct): void {
  if (!product.title || !Array.isArray(product.ingredients) || product.ingredients.length === 0) {
    return;
  }
  try {
    const list = getScannedProducts().filter(
      (p) => p.title.toLowerCase() !== product.title.toLowerCase(),
    );
    list.push({ title: product.title, ingredients: product.ingredients });
    sessionStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    // storage unavailable; the routine just reasons over fewer products
  }
}

export function getScannedProducts(): ScannedProduct[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is ScannedProduct =>
        typeof (p as ScannedProduct)?.title === "string" &&
        Array.isArray((p as ScannedProduct)?.ingredients),
    );
  } catch {
    return [];
  }
}
