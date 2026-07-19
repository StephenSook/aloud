/**
 * Verify the demo product set against Open Beauty Facts BEFORE buying into it.
 * US coverage is weak; the demo needs confirmed hits plus one deliberate miss.
 *
 * Usage: npx tsx scripts/check-obf.ts 3600523971282 012345678905 ...
 * Output: markdown table for docs/FACTS.md.
 */

export {};

type ObfProduct = {
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  states_tags?: string[];
};

type ObfResponse = { status: 0 | 1; product?: ObfProduct };

const barcodes = process.argv.slice(2);
if (barcodes.length === 0) {
  console.error("Usage: npx tsx scripts/check-obf.ts <barcode> [<barcode> ...]");
  process.exit(2);
}

const UA = "Aloud/0.1 (accessibility hackathon build; https://github.com/StephenSook/aloud)";

async function check(barcode: string) {
  const res = await fetch(
    `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
    { headers: { "User-Agent": UA } },
  );
  const body = (await res.json()) as ObfResponse;
  if (body.status === 0) {
    return { barcode, name: "(not in OBF)", verdict: "MISS" };
  }
  const p = body.product ?? {};
  const complete = p.states_tags?.includes("en:ingredients-completed") ?? false;
  const hasText = (p.ingredients_text ?? "").trim().length > 0;
  const verdict = complete && hasText ? "HIT" : "SOFT MISS (no usable ingredients)";
  return {
    barcode,
    name: [p.brands, p.product_name].filter(Boolean).join(" "),
    verdict,
  };
}

async function main() {
  const rows: string[] = ["| Barcode | Product | Verdict |", "|---|---|---|"];
  for (const b of barcodes) {
    const r = await check(b);
    rows.push(`| ${r.barcode} | ${r.name || "(unnamed)"} | ${r.verdict} |`);
    await new Promise((resolve) => setTimeout(resolve, 400)); // OBF etiquette
  }
  console.log(rows.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
