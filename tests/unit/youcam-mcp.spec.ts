import { describe, expect, it } from "vitest";
import { parseMcpToolResult } from "@/lib/youcam-mcp";

// Shape captured live from the YouCam MCP server tools/call response, 2026-07-22.
function toolEvent(resultText: string) {
  return [
    {
      jsonrpc: "2.0",
      id: 4,
      result: { content: [{ type: "text", text: resultText }] },
    },
  ];
}

describe("parseMcpToolResult", () => {
  it("parses a successful MCP skin-analysis envelope into outputs", () => {
    const events = toolEvent(
      JSON.stringify({
        status: 200,
        data: {
          error: null,
          results: {
            output: [
              { type: "redness", ui_score: 75, raw_score: 57.3 },
              { type: "oiliness", ui_score: 70, raw_score: 61.2 },
            ],
          },
        },
      }),
    );
    const result = parseMcpToolResult(events);
    if (result.status !== "success") throw new Error("expected success");
    expect(result.outputs.map((o) => o.type)).toEqual(["redness", "oiliness"]);
    expect(result.outputs[0].ui_score).toBe(75);
  });

  it("surfaces a task error from the envelope", () => {
    const events = toolEvent(
      JSON.stringify({ status: 200, data: { error: "face too small", results: null } }),
    );
    const result = parseMcpToolResult(events);
    expect(result.status).toBe("error");
  });

  it("throws on a JSON-RPC error event", () => {
    expect(() =>
      parseMcpToolResult([{ jsonrpc: "2.0", id: 4, error: { code: -32600, message: "bad" } }]),
    ).toThrow(/bad/);
  });

  it("throws when no parseable result is present", () => {
    expect(() => parseMcpToolResult([{ jsonrpc: "2.0", id: 4, result: { content: [] } }])).toThrow();
  });
});
