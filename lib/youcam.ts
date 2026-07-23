/**
 * YouCam AI Skin Analysis pipeline (server-only). Shapes verified live
 * 2026-07-18; fixtures in tests/fixtures/youcam/.
 *
 * Pipeline: register file -> PUT bytes to presigned URL -> create task -> poll.
 * The Bearer key never leaves the server.
 */

const BASE = "https://yce-api-01.makeupar.com";

// SD concern set (verbatim-valid dst_actions, live-confirmed accepted). Seven
// concerns puts the task in the 5-7 tier (12 units) for a richer read: the
// original four plus pores, radiance, and firmness, all cosmetic-safe.
export const SD_ACTIONS = [
  "redness",
  "oiliness",
  "moisture",
  "texture",
  "pore",
  "radiance",
  "firmness",
] as const;

export type SkinOutput = {
  type: string;
  ui_score?: number;
  raw_score?: number;
  score?: number;
  region?: string;
  skin_type?: string;
  mask_urls?: string[];
};

export type SkinTaskResult =
  | { status: "running" }
  | { status: "success"; outputs: SkinOutput[] }
  | { status: "error"; errorCode: string; errorMessage: string };

function apiKey(): string {
  const key = process.env.YOUCAM_API_KEY;
  if (!key) throw new Error("YOUCAM_API_KEY is not set");
  return key;
}

async function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

export async function registerFile(
  fileName: string,
  fileSize: number,
  contentType: string,
  feature: "skin-analysis" | "skin-tone-analysis" = "skin-analysis",
): Promise<{ fileId: string; putUrl: string; putHeaders: Record<string, string> }> {
  const res = await api(`/s2s/v2.0/file/${feature}`, {
    method: "POST",
    body: JSON.stringify({
      files: [{ content_type: contentType, file_name: fileName, file_size: fileSize }],
    }),
  });
  if (!res.ok) throw new Error(`file registration failed: HTTP ${res.status}`);
  const body = await res.json();
  const file = body?.data?.files?.[0];
  const request = file?.requests?.[0];
  if (!file?.file_id || !request?.url) {
    throw new Error("file registration returned an unexpected shape");
  }
  return { fileId: file.file_id, putUrl: request.url, putHeaders: request.headers ?? {} };
}

export async function uploadBytes(
  putUrl: string,
  putHeaders: Record<string, string>,
  bytes: ArrayBuffer,
): Promise<void> {
  const res = await fetch(putUrl, { method: "PUT", headers: putHeaders, body: bytes });
  if (!res.ok) throw new Error(`presigned upload failed: HTTP ${res.status}`);
}

export async function createSkinTask(
  fileId: string,
  actions: readonly string[] = SD_ACTIONS,
): Promise<string> {
  const res = await api("/s2s/v2.0/task/skin-analysis", {
    method: "POST",
    body: JSON.stringify({ src_file_id: fileId, dst_actions: actions, format: "json" }),
  });
  if (!res.ok) throw new Error(`task creation failed: HTTP ${res.status}`);
  const body = await res.json();
  const taskId = body?.data?.task_id;
  if (!taskId) throw new Error("task creation returned no task_id");
  return taskId;
}

/**
 * Run Skin Tone Analysis end to end (register, upload, task, poll) and return
 * the raw results, used only to calibrate the honesty of the skin read.
 * Best-effort: returns null on any failure so the main read never breaks.
 */
export async function runSkinTone(
  bytes: ArrayBuffer,
  contentType: string,
): Promise<{ color?: { skin_color?: string }; face_quality?: { lighting?: string } } | null> {
  try {
    const { fileId, putUrl, putHeaders } = await registerFile(
      "tone.jpg",
      bytes.byteLength,
      contentType,
      "skin-tone-analysis",
    );
    await uploadBytes(putUrl, putHeaders, bytes);
    const created = await api("/s2s/v2.0/task/skin-tone-analysis", {
      method: "POST",
      body: JSON.stringify({ src_file_id: fileId, format: "json" }),
    });
    if (!created.ok) {
      console.error("skin-tone analysis: task creation failed", created.status);
      return null;
    }
    const taskId = (await created.json())?.data?.task_id;
    if (!taskId) {
      console.error("skin-tone analysis: no task_id returned");
      return null;
    }

    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1200));
      const res = await api(`/s2s/v2.0/task/skin-tone-analysis/${encodeURIComponent(taskId)}`);
      if (!res.ok) {
        console.error("skin-tone analysis: poll failed", res.status);
        return null;
      }
      const data = (await res.json())?.data;
      if (data?.task_status === "success") return data.results ?? null;
      if (data?.task_status === "error") {
        console.error("skin-tone analysis: task errored", data.error);
        return null;
      }
    }
    console.error("skin-tone analysis: timed out");
    return null;
  } catch (err) {
    console.error("skin-tone analysis threw", err);
    return null;
  }
}

/** Error field arrives as a stringified tuple: "('message', 'error_code')". */
export function parseErrorTuple(raw: string): { code: string; message: string } {
  const match = /\('(.+?)',\s*'(.+?)'\)/.exec(raw);
  if (match) return { message: match[1], code: match[2] };
  return { message: raw, code: "unknown_error" };
}

export function parseTaskResponse(body: {
  data?: {
    task_status?: string;
    error?: string | null;
    results?: { output?: SkinOutput[] } | null;
  };
}): SkinTaskResult {
  const data = body?.data;
  if (data?.task_status === "success") {
    return { status: "success", outputs: data.results?.output ?? [] };
  }
  if (data?.task_status === "error") {
    const parsed = parseErrorTuple(data.error ?? "");
    return { status: "error", errorCode: parsed.code, errorMessage: parsed.message };
  }
  return { status: "running" };
}

export async function getSkinTask(taskId: string): Promise<SkinTaskResult> {
  const res = await api(`/s2s/v2.0/task/skin-analysis/${encodeURIComponent(taskId)}`);
  if (!res.ok) throw new Error(`task poll failed: HTTP ${res.status}`);
  return parseTaskResponse(await res.json());
}
