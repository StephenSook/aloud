import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseErrorTuple, parseTaskResponse } from "@/lib/youcam";

function fixture(name: string) {
  return JSON.parse(
    readFileSync(path.resolve(__dirname, "../fixtures/youcam", name), "utf8"),
  );
}

describe("parseTaskResponse (live-captured fixtures)", () => {
  it("parses a four-concern success into scored outputs", () => {
    const result = parseTaskResponse(fixture("four-concern-success.json"));
    if (result.status !== "success") throw new Error("expected success");
    const scored = result.outputs.filter((o) => typeof o.ui_score === "number");
    expect(scored.map((o) => o.type).sort()).toEqual([
      "moisture",
      "oiliness",
      "redness",
      "texture",
    ]);
    for (const o of scored) {
      expect(o.ui_score).toBeGreaterThanOrEqual(1);
      expect(o.ui_score).toBeLessThanOrEqual(100);
      expect(o.raw_score).toBeTypeOf("number");
    }
  });

  it("parses the verified skin_type shape (region + skin_type fields)", () => {
    const result = parseTaskResponse(fixture("skin-type-success.json"));
    if (result.status !== "success") throw new Error("expected success");
    const skinTypes = result.outputs.filter((o) => o.type === "skin_type");
    expect(skinTypes.map((o) => o.region).sort()).toEqual([
      "t_zone",
      "u_zone",
      "whole",
    ]);
    for (const o of skinTypes) {
      expect(o.skin_type).toBeTypeOf("string");
    }
  });

  it("parses an error task with its stringified tuple", () => {
    const result = parseTaskResponse(fixture("error-face-too-small.json"));
    if (result.status !== "error") throw new Error("expected error");
    expect(result.errorCode).toBe("error_src_face_too_small");
    expect(result.errorMessage).toMatch(/face area/i);
  });

  it("treats anything else as running", () => {
    expect(parseTaskResponse({ data: { task_status: "running" } }).status).toBe(
      "running",
    );
  });
});

describe("parseErrorTuple", () => {
  it("extracts message and code", () => {
    const parsed = parseErrorTuple(
      "('The face area in the uploaded image is too small', 'error_src_face_too_small')",
    );
    expect(parsed.code).toBe("error_src_face_too_small");
    expect(parsed.message).toMatch(/too small/);
  });

  it("falls back gracefully on unexpected strings", () => {
    expect(parseErrorTuple("boom").code).toBe("unknown_error");
  });
});
