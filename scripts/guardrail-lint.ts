/**
 * Guardrail linter. CI-blocking.
 *
 * Pass 1 (claims): every string literal in lib/ and app/ must be free of
 * drug/medical/diagnosis language. A blind user cannot catch a confident
 * wrong claim, and one drug claim reclassifies the product under FDA rules.
 *
 * Pass 2 (tone): judge-facing markdown (README.md, docs/) must be free of
 * em-dashes and AI-tone words.
 *
 * Escape hatch: a line ending in `// guardrail-allow` is skipped (use only
 * for negative examples in tests, with a reason in the surrounding code).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const lexicon = JSON.parse(
  readFileSync(join(ROOT, "data", "banned-claims.json"), "utf8"),
) as { claims: string[]; tone: string[] };

const claimPatterns = lexicon.claims.map((p) => new RegExp(p, "i"));
const tonePatterns = lexicon.tone.map((p) => new RegExp(p, "iu"));

const EXCLUDE = new Set([
  "docs/GUARDRAILS.md", // contains the unsafe phrases as negative examples
  "data/banned-claims.json",
]);

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

function stringLiterals(source: string): { text: string; line: number }[] {
  // Good-enough literal extractor: double, single, and template strings.
  const results: { text: string; line: number }[] = [];
  const re = /(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  const lines = source.split("\n");
  lines.forEach((lineText, i) => {
    if (lineText.trimEnd().endsWith("// guardrail-allow")) return;
    let m: RegExpExecArray | null;
    const lineRe = new RegExp(re.source, "g");
    while ((m = lineRe.exec(lineText)) !== null) {
      if (m[2].length > 0) results.push({ text: m[2], line: i + 1 });
    }
  });
  return results;
}

let violations = 0;

function report(file: string, line: number, pattern: RegExp, text: string) {
  violations++;
  console.error(
    `GUARDRAIL ${relative(ROOT, file)}:${line} matches /${pattern.source}/ in: ${text.slice(0, 90)}`,
  );
}

// Pass 1: claims in code string literals
for (const dir of ["lib", "app", "components"]) {
  let files: string[] = [];
  try {
    files = walk(join(ROOT, dir), [".ts", ".tsx"]);
  } catch {
    continue; // dir may not exist yet
  }
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const { text, line } of stringLiterals(src)) {
      for (const p of claimPatterns) {
        if (p.test(text)) report(file, line, p, text);
      }
    }
  }
}

// Pass 2: tone in judge-facing markdown
const mdFiles = [
  join(ROOT, "README.md"),
  ...(() => {
    try {
      return walk(join(ROOT, "docs"), [".md"]);
    } catch {
      return [];
    }
  })(),
];
for (const file of mdFiles) {
  if (EXCLUDE.has(relative(ROOT, file))) continue;
  const linesMd = readFileSync(file, "utf8").split("\n");
  linesMd.forEach((lineText, i) => {
    for (const p of tonePatterns) {
      if (p.test(lineText)) report(file, i + 1, p, lineText);
    }
  });
}

if (violations > 0) {
  console.error(`\nguardrail-lint: ${violations} violation(s). Fix the language before shipping.`);
  process.exit(1);
}
console.log("guardrail-lint: clean");
