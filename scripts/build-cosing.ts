/**
 * Build data/cosing.json from the official EU CosIng database.
 *
 * Source: the same public search API the CosIng site itself uses
 * (api.tech.ec.europa.eu/search-api; the apiKey below is the public
 * client-side key embedded in the EU Commission's own frontend).
 * CosIng reuse: Commission Decision 2011/833/EU.
 *
 * Partitioning: the API caps any result window at 10,000 (Elasticsearch) and
 * single-letter wildcards silently truncate on term expansion, so we partition
 * by EXACT function term (each under 10k except SKIN CONDITIONING) plus one
 * "SKIN CONDITIONING only" remainder query (must_not every other function).
 * The union covers every Active ingredient that has at least one function,
 * which is exactly the set the app can speak about.
 *
 * Output: { "GLYCERIN": ["HUMECTANT", ...], ... }
 * Run: npx tsx scripts/build-cosing.ts
 */
export {};

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ENDPOINT =
  "https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=285a77fd-1257-4271-8507-f0c6b2961203&text=*";
// The API silently caps pageSize at 200 (500 requested returned 200 rows).
const PAGE_SIZE = 200;
const WINDOW = 10_000;

type SearchResult = {
  totalResults: number;
  results: {
    metadata: {
      inciName?: string[];
      functionName?: string[];
      status?: string[];
    };
  }[];
};

async function search(query: unknown, pageNumber: number, pageSize = PAGE_SIZE): Promise<SearchResult> {
  const form = new FormData();
  form.append(
    "query",
    new Blob([JSON.stringify(query)], { type: "application/json" }),
  );
  // Unsorted pagination is non-deterministic (rows shuffle between pages and
  // silently drop). substanceId is unique per record, so this makes every
  // partition's pagination stable.
  form.append(
    "sort",
    new Blob([JSON.stringify({ field: "substanceId", order: "ASC" })], {
      type: "application/json",
    }),
  );
  const res = await fetch(`${ENDPOINT}&pageSize=${pageSize}&pageNumber=${pageNumber}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`search page ${pageNumber}: HTTP ${res.status}`);
  return (await res.json()) as SearchResult;
}

async function fetchFunctionList(): Promise<string[]> {
  const page = await search({ terms: { itemType: ["function"] } }, 1, 200);
  const names = page.results
    .map((r) => r.metadata.functionName?.[0])
    .filter((n): n is string => Boolean(n) && n !== "NOT REPORTED");
  if (names.length < 50) throw new Error(`function list looks wrong: ${names.length} entries`);
  return [...new Set(names)].sort();
}

async function main() {
  const functions = await fetchFunctionList();
  console.error(`${functions.length} functions from the API`);

  const SC = "SKIN CONDITIONING";
  const others = functions.filter((f) => f !== SC);
  const ingredientTerm = { terms: { itemType: ["ingredient"] } };
  const partitions: { label: string; query: unknown }[] = [
    ...others.map((f) => ({
      label: f,
      query: { bool: { must: [{ terms: { functionName: [f] } }, ingredientTerm] } },
    })),
    {
      label: `${SC} (only)`,
      query: {
        bool: {
          must: [{ terms: { functionName: [SC] } }, ingredientTerm],
          must_not: [{ terms: { functionName: others } }],
        },
      },
    },
  ];

  const table: Record<string, string[]> = {};
  let skippedInactive = 0;

  const ingest = (page: SearchResult) => {
    for (const r of page.results) {
      const md = r.metadata;
      const name = md.inciName?.[0]?.trim().toUpperCase();
      if (!name) continue;
      if (md.status?.[0] && md.status[0] !== "Active") {
        skippedInactive++;
        continue;
      }
      const fns = (md.functionName ?? []).filter((f) => f && f !== "NOT REPORTED");
      if (fns.length === 0) continue;
      const existing = new Set(table[name] ?? []);
      for (const f of fns) existing.add(f);
      table[name] = [...existing].sort();
    }
  };

  for (const { label, query } of partitions) {
    const first = await search(query, 1);
    if (first.totalResults >= WINDOW) {
      throw new Error(`partition "${label}" has ${first.totalResults} results, exceeds the 10k window`);
    }
    const pages = Math.ceil(first.totalResults / PAGE_SIZE);
    let rows = first.results.length;
    ingest(first);
    for (let p = 2; p <= pages; p++) {
      const page = await search(query, p);
      rows += page.results.length;
      ingest(page);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    if (rows !== first.totalResults) {
      throw new Error(`partition "${label}": fetched ${rows} rows but totalResults is ${first.totalResults}`);
    }
    console.error(`  ${label}: ${first.totalResults}, table ${Object.keys(table).length}`);
  }

  const out = join(import.meta.dirname, "..", "data", "cosing.json");
  writeFileSync(out, JSON.stringify(table));
  console.error(
    `wrote ${Object.keys(table).length} ingredients (skipped ${skippedInactive} inactive rows)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
