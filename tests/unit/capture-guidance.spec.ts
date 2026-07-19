import { describe, expect, it } from "vitest";
import {
  assess,
  captureCrop,
  SteadinessTracker,
  GOOD_FACE_RATIO,
} from "@/lib/capture-guidance";

const FRAME = { frameWidth: 1280, frameHeight: 1280, luma: 150 };

function box(cx: number, cy: number, widthRatio: number) {
  const width = widthRatio * FRAME.frameWidth;
  const height = width * 1.2;
  return {
    originX: cx * FRAME.frameWidth - width / 2,
    originY: cy * FRAME.frameHeight - height / 2,
    width,
    height,
  };
}

describe("assess", () => {
  it("reports searching when no face", () => {
    expect(assess({ ...FRAME, box: null }).state).toBe("searching");
  });

  it("prioritizes darkness over face state and never blames the user", () => {
    const g = assess({ ...FRAME, luma: 30, box: box(0.5, 0.5, 0.6) });
    expect(g.state).toBe("too_dark");
    expect(g.message).toMatch(/light is low/i);
  });

  it("asks to come closer when the face is small", () => {
    const g = assess({ ...FRAME, box: box(0.5, 0.5, 0.3) });
    expect(g.state).toBe("adjust");
    expect(g.message).toMatch(/closer/i);
  });

  it("cues toward the side the face is on", () => {
    const left = assess({ ...FRAME, box: box(0.25, 0.5, 0.56) });
    expect(left.message).toMatch(/left/i);
    const right = assess({ ...FRAME, box: box(0.75, 0.5, 0.56) });
    expect(right.message).toMatch(/right/i);
  });

  it("holds when centered and large enough", () => {
    const g = assess({ ...FRAME, box: box(0.5, 0.5, GOOD_FACE_RATIO + 0.05) });
    expect(g.state).toBe("hold");
    expect(g.proximity).toBe(1);
  });

  it("proximity rises as framing improves", () => {
    const far = assess({ ...FRAME, box: box(0.3, 0.3, 0.3) }).proximity;
    const close = assess({ ...FRAME, box: box(0.52, 0.5, 0.5) }).proximity;
    expect(close).toBeGreaterThan(far);
  });
});

describe("SteadinessTracker", () => {
  const good = box(0.5, 0.5, 0.6);
  const goodGuidance = assess({ ...FRAME, box: good });

  it("fires only after the hold window elapses", () => {
    const t = new SteadinessTracker(700);
    expect(t.update(goodGuidance, good, FRAME.frameWidth, 0)).toBe(false);
    expect(t.update(goodGuidance, good, FRAME.frameWidth, 400)).toBe(false);
    expect(t.update(goodGuidance, good, FRAME.frameWidth, 750)).toBe(true);
  });

  it("resets when the face leaves the hold state", () => {
    const t = new SteadinessTracker(700);
    t.update(goodGuidance, good, FRAME.frameWidth, 0);
    const searching = assess({ ...FRAME, box: null });
    t.update(searching, null, FRAME.frameWidth, 400);
    expect(t.update(goodGuidance, good, FRAME.frameWidth, 800)).toBe(false);
    expect(t.update(goodGuidance, good, FRAME.frameWidth, 1600)).toBe(true);
  });

  it("resets on jitter", () => {
    const t = new SteadinessTracker(700, 0.05);
    t.update(goodGuidance, good, FRAME.frameWidth, 0);
    const moved = { ...good, originX: good.originX + FRAME.frameWidth * 0.1 };
    t.update(goodGuidance, moved, FRAME.frameWidth, 500);
    expect(t.update(goodGuidance, moved, FRAME.frameWidth, 900)).toBe(false);
  });
});

describe("captureCrop", () => {
  it("sizes the crop so the face spans about 75 percent of width", () => {
    const b = box(0.5, 0.5, 0.6);
    const crop = captureCrop(b, FRAME.frameWidth, FRAME.frameHeight);
    expect(b.width / crop.width).toBeGreaterThan(0.6);
    expect(b.width / crop.width).toBeLessThanOrEqual(0.8);
  });

  it("never goes below the 480px YouCam floor or outside the frame", () => {
    const small = box(0.5, 0.5, 0.2);
    const crop = captureCrop(small, FRAME.frameWidth, FRAME.frameHeight);
    expect(crop.width).toBeGreaterThanOrEqual(480);
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(FRAME.frameWidth);
    expect(crop.y + crop.height).toBeLessThanOrEqual(FRAME.frameHeight);
  });
});
