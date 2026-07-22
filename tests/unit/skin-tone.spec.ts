import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  hexToITA,
  parseToneContext,
  toneBand,
  toneCaveat,
  type ToneContext,
} from "@/lib/skin-tone";
import { composeSkinRead } from "@/lib/skin-read";

describe("hexToITA + toneBand", () => {
  it("bands a light tone high and a deep tone low", () => {
    expect(toneBand(hexToITA("#f0d5c0"))).toBe("light");
    expect(toneBand(hexToITA("#b4947b"))).toBe("intermediate");
    expect(toneBand(hexToITA("#4a3728"))).toBe("deep");
  });

  it("returns unknown for an unreadable hex", () => {
    expect(hexToITA("nope")).toBeNull();
    expect(toneBand(null)).toBe("unknown");
  });
});

describe("parseToneContext", () => {
  it("reads skin_color and lighting from the API results", () => {
    const ctx = parseToneContext({
      color: { skin_color: "#4a3728" },
      face_quality: { lighting: "dark" },
    });
    expect(ctx.band).toBe("deep");
    expect(ctx.lightingPoor).toBe(true);
  });

  it("treats good lighting as not poor", () => {
    expect(parseToneContext({ face_quality: { lighting: "good" } }).lightingPoor).toBe(false);
  });
});

describe("toneCaveat", () => {
  it("combines deep tone and low light", () => {
    const c = toneCaveat({ band: "deep", ita: -60, lightingPoor: true });
    expect(c).toMatch(/deeper skin tones and in lower light/i);
  });
  it("flags deep tone alone", () => {
    expect(toneCaveat({ band: "deep", ita: -60, lightingPoor: false })).toMatch(/deeper skin tones/i);
  });
  it("flags low light alone", () => {
    expect(toneCaveat({ band: "light", ita: 65, lightingPoor: true })).toMatch(/light here looked low/i);
  });
  it("is silent for a light tone in good light", () => {
    expect(toneCaveat({ band: "light", ita: 65, lightingPoor: false })).toBeNull();
  });
});

describe("composeSkinRead with tone", () => {
  const outputs = [{ type: "redness", ui_score: 75 }];
  const deep: ToneContext = { band: "deep", ita: -60, lightingPoor: false };

  it("adds the bias-aware caveat on a deep tone", () => {
    expect(composeSkinRead(outputs, deep)).toMatch(/deeper skin tones/i);
  });
  it("omits it on a light tone", () => {
    const light: ToneContext = { band: "light", ita: 65, lightingPoor: false };
    expect(composeSkinRead(outputs, light)).not.toMatch(/deeper skin tones/i);
  });
  it("never states identity and stays claim-clean", () => {
    const lexicon = JSON.parse(
      readFileSync(path.resolve(__dirname, "../../data/banned-claims.json"), "utf8"),
    ) as { claims: string[] };
    const patterns = lexicon.claims.map((p) => new RegExp(p, "i"));
    const read = composeSkinRead(outputs, deep);
    for (const p of patterns) expect(read).not.toMatch(p);
  });
});
