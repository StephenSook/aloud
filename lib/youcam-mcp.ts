/**
 * Skin analysis routed through Perfect Corp's NATIVE YouCam MCP server
 * (server-only). This is the sponsor's own 2026 agentic surface: the same
 * account key, spoken over the Model Context Protocol instead of REST.
 *
 * Flow: initialize -> notifications/initialized -> tools/call(AI-Skin-Analysis).
 * The tool returns the full result synchronously in a text content block,
 * shaped like the REST task result.
 *
 * Verified live 2026-07-22: a real file_id returned real ui_scores + masks.
 */
import type { SkinOutput, SkinTaskResult } from "@/lib/youcam";

const MCP_URL = "https://mcp-api-01.makeupar.com/mcp";

type RpcResult = { session: string | null; events: unknown[] };

function parseEventStream(text: string): unknown[] {
  return text
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => {
      try {
        return JSON.parse(line.slice(5).trim());
      } catch {
        return null;
      }
    })
    .filter((v): v is unknown => v !== null);
}

async function rpc(session: string | null, body: object): Promise<RpcResult> {
  const key = process.env.YOUCAM_API_KEY;
  if (!key) throw new Error("YOUCAM_API_KEY is not set");
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(session ? { "mcp-session-id": session } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
  const sid = res.headers.get("mcp-session-id") ?? session;
  return { session: sid, events: parseEventStream(await res.text()) };
}

/** Extract the AI-Skin-Analysis result from a tools/call event envelope. */
export function parseMcpToolResult(events: unknown[]): SkinTaskResult {
  for (const ev of events) {
    const e = ev as {
      error?: { message?: string };
      result?: { content?: { type?: string; text?: string }[] };
    };
    if (e.error) throw new Error(`MCP error: ${e.error.message ?? "unknown"}`);
    for (const c of e.result?.content ?? []) {
      if (c.type === "text" && c.text) {
        const body = JSON.parse(c.text) as {
          data?: {
            task_status?: string;
            error?: string | null;
            results?: { output?: SkinOutput[] } | null;
          };
        };
        const output = body.data?.results?.output;
        if (Array.isArray(output)) return { status: "success", outputs: output };
        if (body.data?.error) {
          return {
            status: "error",
            errorCode: "mcp_task_error",
            errorMessage: body.data.error,
          };
        }
      }
    }
  }
  throw new Error("MCP returned no parseable skin-analysis result");
}

export async function analyzeSkinViaMcp(
  fileId: string,
  actions: readonly string[],
): Promise<SkinTaskResult> {
  const init = await rpc(null, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "aloud", version: "0.1" },
    },
  });
  const session = init.session;
  if (!session) throw new Error("MCP session was not established");

  await rpc(session, { jsonrpc: "2.0", method: "notifications/initialized" });

  const call = await rpc(session, {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "AI-Skin-Analysis",
      arguments: {
        request: { src_file_id: fileId, dst_actions: actions, format: "json" },
      },
    },
  });
  return parseMcpToolResult(call.events);
}
