/**
 * Bias-aware confidence calibration from YouCam Skin Tone Analysis.
 *
 * The API returns skin_color as a hex and a lighting quality. We convert the
 * hex to ITA (Individual Typology Angle), a continuous, reproducible COLOR
 * metric (Chardon 1991) that is NOT identity. Published dermatology finds
 * redness and similar readings are measured less reliably on deeper skin and
 * in low light (PMC12626340, DDI-CoCo arXiv 2401.13280), so on those inputs we
 * lower confidence and say so. Tone is used only to calibrate honesty; it is
 * never announced as who the person is, never tied to race or ethnicity, and
 * never stored.
 */

export type ToneBand = "light" | "intermediate" | "deep" | "unknown";
export type ToneContext = { band: ToneBand; ita: number | null; lightingPoor: boolean };

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Convert an sRGB hex (e.g. "#b4947b") to the Individual Typology Angle. */
export function hexToITA(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = srgbToLinear((int >> 16) & 255);
  const g = srgbToLinear((int >> 8) & 255);
  const b = srgbToLinear(int & 255);

  // ITA needs only L* and b*, so X* (used for a*) is not computed.
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const L = 116 * f(Y) - 16;
  const bStar = 200 * (f(Y) - f(Z));
  if (bStar === 0) return null;
  return (Math.atan((L - 50) / bStar) * 180) / Math.PI;
}

/** ITA bands (Del Bino 2013): deep < 30, intermediate 30 to 55, light > 55. */
export function toneBand(ita: number | null): ToneBand {
  if (ita === null) return "unknown";
  if (ita < 30) return "deep";
  if (ita <= 55) return "intermediate";
  return "light";
}

type SkinToneResults = {
  color?: { skin_color?: string };
  face_quality?: { lighting?: string };
};

export function parseToneContext(results: SkinToneResults | null): ToneContext {
  const hex = results?.color?.skin_color;
  const ita = hex ? hexToITA(hex) : null;
  const lighting = results?.face_quality?.lighting;
  return {
    band: toneBand(ita),
    ita,
    lightingPoor: typeof lighting === "string" && lighting.toLowerCase() !== "good",
  };
}

/**
 * An honest, reliability-framed caveat, or null when none is warranted.
 * General language ("deeper skin tones", "the light here"); never states the
 * person's tone as an identity.
 */
export function toneCaveat(ctx: ToneContext): string | null {
  const deep = ctx.band === "deep";
  const poorLight = ctx.lightingPoor;
  if (deep && poorLight) {
    return "One honest note. Some readings, like redness, are measured less reliably on deeper skin tones and in lower light, and the light here looked low. I would treat these numbers as rough and worth a second check.";
  }
  if (deep) {
    return "One honest note. Readings like redness are known to be measured less reliably on deeper skin tones, so treat these as approximate.";
  }
  if (poorLight) {
    return "One honest note. The light here looked low, which can shift these readings, so treat them as approximate.";
  }
  return null;
}
