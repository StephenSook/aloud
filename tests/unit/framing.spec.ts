import { describe, it, expect } from "vitest";
import { framingPan, framingVertical, type Box } from "@/lib/capture-guidance";

const box = (originX: number, originY: number, size: number): Box => ({
  originX,
  originY,
  width: size,
  height: size,
});

describe("framingPan", () => {
  it("is 0 when the face is centred", () => {
    expect(framingPan(box(450, 0, 100), 1000)).toBeCloseTo(0);
  });

  it("pans right for a face right of centre, left for a face left of centre", () => {
    expect(framingPan(box(800, 0, 100), 1000)).toBeGreaterThan(0);
    expect(framingPan(box(50, 0, 100), 1000)).toBeLessThan(0);
  });

  it("clamps to [-1, 1] at the frame edges", () => {
    expect(framingPan(box(950, 0, 50), 1000)).toBeLessThanOrEqual(1);
    expect(framingPan(box(0, 0, 50), 1000)).toBeGreaterThanOrEqual(-1);
  });

  it("is 0 with no face or a zero-width frame", () => {
    expect(framingPan(null, 1000)).toBe(0);
    expect(framingPan(box(100, 0, 50), 0)).toBe(0);
  });
});

describe("framingVertical", () => {
  it("is negative for a high face and positive for a low face", () => {
    expect(framingVertical(box(0, 50, 100), 1000)).toBeLessThan(0);
    expect(framingVertical(box(0, 800, 100), 1000)).toBeGreaterThan(0);
  });

  it("is 0 with no face", () => {
    expect(framingVertical(null, 1000)).toBe(0);
  });
});
