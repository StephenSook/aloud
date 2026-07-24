"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { FlowHeader } from "@/components/FlowHeader";
import { LiveRegion } from "@/components/LiveRegion";
import type { CaptureMetrics } from "@/components/CameraCapture";
import { composeSkinRead } from "@/lib/skin-read";
import type { ToneContext } from "@/lib/skin-tone";

const CameraCapture = dynamic(
  () => import("@/components/CameraCapture").then((m) => m.CameraCapture),
  { ssr: false },
);

type Attempt = {
  n: number;
  seconds: number | null;
  outcome: string;
};

type Phase = "consent" | "capturing" | "analyzing" | "done";

type SkinOutput = {
  type: string;
  ui_score?: number;
  mask_urls?: string[];
};

type Mask = { type: string; url: string; score?: number };

const CONCERN_LABEL: Record<string, string> = {
  redness: "Redness",
  oiliness: "Oiliness",
  moisture: "Moisture",
  texture: "Texture",
  pore: "Pores",
  radiance: "Radiance",
  firmness: "Firmness",
};

/**
 * Week-1 kill experiment instrument: consent -> audio-guided capture ->
 * YouCam analysis -> spoken verdict, with a running attempt log so ten
 * blindfolded tries can be recorded against the <30s gate.
 */
type SkinResult = { status: string; outputs?: SkinOutput[]; errorMessage?: string };

export default function CapturePage() {
  const [phase, setPhase] = useState<Phase>("consent");
  const [announcement, setAnnouncement] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [verdict, setVerdict] = useState("");
  const [masks, setMasks] = useState<Mask[]>([]);
  const [engine, setEngine] = useState<"rest" | "mcp">("rest");
  const attemptCount = useRef(0);

  const logAttempt = useCallback((seconds: number | null, outcome: string) => {
    attemptCount.current += 1;
    setAttempts((prev) => [
      { n: attemptCount.current, seconds, outcome },
      ...prev,
    ]);
  }, []);

  const finish = useCallback(
    (result: SkinResult, captureSeconds: number, via: "rest" | "mcp", tone?: ToneContext) => {
      if (result.status === "success") {
        const scores: Record<string, number> = {};
        for (const o of result.outputs ?? []) {
          if (typeof o.ui_score === "number") scores[o.type] = o.ui_score;
        }
        // Heatmap overlays the API returns per concern: a "what the analysis
        // measured" view for a sighted companion. Presigned URLs are shown
        // in-session only; nothing is stored.
        // Concern heatmaps only; the API also returns a resize_image (the raw
        // face) which we never display, on privacy grounds.
        setMasks(
          (result.outputs ?? [])
            .filter((o) => o.mask_urls?.[0] && CONCERN_LABEL[o.type])
            .map((o) => ({ type: o.type, url: o.mask_urls![0], score: scores[o.type] })),
        );
        try {
          sessionStorage.setItem(
            "aloud:skinBaseline",
            JSON.stringify({ capturedAt: Date.now(), scores }),
          );
        } catch {
          // storage unavailable is fine; verify degrades honestly
        }
        const route = via === "mcp" ? " Analyzed through Perfect Corp's MCP server." : "";
        const text = `${composeSkinRead(result.outputs ?? [], tone)} Capture took ${captureSeconds} seconds.${route}`;
        setVerdict(text);
        setAnnouncement(text);
        logAttempt(captureSeconds, via === "mcp" ? "accepted (via MCP)" : "accepted");
      } else {
        const text = `The photo was not accepted: ${result.errorMessage ?? "unknown reason"}. This is about the photo, not you. Let us try again.`;
        setVerdict(text);
        setAnnouncement(text);
        logAttempt(captureSeconds, `rejected: ${result.errorMessage ?? "unknown"}`);
      }
      setPhase("done");
    },
    [logAttempt],
  );

  const analyze = useCallback(
    async (blob: Blob, metrics: CaptureMetrics) => {
      setPhase("analyzing");
      setMasks([]);
      const captureSeconds = Math.round(metrics.elapsedMs / 100) / 10;
      try {
        const form = new FormData();
        form.append("image", new File([blob], "capture.jpg", { type: "image/jpeg" }));
        form.append("engine", engine);
        const created = await fetch("/api/skin", { method: "POST", body: form });
        if (!created.ok) throw new Error(`create failed ${created.status}`);
        const body = (await created.json()) as {
          engine?: string;
          taskId?: string;
          result?: SkinResult;
          tone?: ToneContext;
        };

        // MCP path returns the full result synchronously.
        if (body.result) {
          finish(body.result, captureSeconds, "mcp", body.tone);
          return;
        }

        if (!body.taskId) throw new Error("no taskId in analysis response");
        const taskId = body.taskId;
        const deadline = Date.now() + 60_000;
        while (Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const res = await fetch(`/api/skin/${encodeURIComponent(taskId)}`);
          if (!res.ok) throw new Error(`poll failed ${res.status}`);
          const result = (await res.json()) as SkinResult;
          if (result.status === "success" || result.status === "error") {
            finish(result, captureSeconds, "rest", body.tone);
            return;
          }
        }
        throw new Error("timed out");
      } catch (err) {
        console.error(err);
        const text =
          "The analysis service did not respond. Check the connection and try again.";
        setVerdict(text);
        setAnnouncement(text);
        logAttempt(null, "service error");
        setPhase("done");
      }
    },
    [engine, finish, logAttempt],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-6 px-6 py-12">
      <FlowHeader />
      <h1 className="display reveal reveal-2 text-4xl">Skin capture</h1>
      <LiveRegion message={announcement} assertive />

      {phase === "consent" && (
        <section className="flex flex-col items-center gap-5">
          <p className="max-w-md text-lg leading-8 text-[var(--paper-dim)]">
            Aloud will open the front camera and guide you by sound to frame
            your face, then send one photo to a skin analysis service. The
            photo is processed for this session only. Nothing is saved, and
            nothing about your identity is inferred.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setAnnouncement(
                "Camera starting. Hold the phone at arm's length, screen facing you. Beeps get faster as your face gets centered.",
              );
              setPhase("capturing");
            }}
          >
            I agree, start the camera
          </button>
          <fieldset className="mt-2 flex items-center gap-3 text-sm text-[var(--paper-dim)]">
            <legend className="sr-only">Analysis engine</legend>
            <span aria-hidden="true">Engine:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="engine"
                checked={engine === "rest"}
                onChange={() => setEngine("rest")}
              />
              REST
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="engine"
                checked={engine === "mcp"}
                onChange={() => setEngine("mcp")}
              />
              Perfect Corp MCP
            </label>
          </fieldset>
        </section>
      )}

      {phase === "capturing" && (
        <section className="flex flex-col items-center gap-4">
          <CameraCapture
            onCaptured={(blob, metrics) => void analyze(blob, metrics)}
            onGuidance={setAnnouncement}
            onError={(message) => {
              setAnnouncement(message);
              setVerdict(message);
              logAttempt(null, "camera error");
              setPhase("done");
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              logAttempt(null, "cancelled");
              setPhase("consent");
            }}
          >
            Cancel
          </button>
        </section>
      )}

      {phase === "analyzing" && (
        <p className="text-lg text-[var(--paper)]">
          Analyzing the photo. This takes a few seconds.
        </p>
      )}

      {phase === "done" && (
        <section className="flex w-full flex-col items-center gap-5">
          <p className="w-full text-left text-lg leading-8 text-[var(--paper)]">{verdict}</p>

          {masks.length > 0 && (
            <figure className="w-full">
              <figcaption className="text-sm text-[var(--paper-dim)]">
                What the analysis measured. These are the heatmaps the YouCam API
                returns, one per concern, shown for a sighted companion. Brighter
                zones are where the concern reads strongest.
              </figcaption>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {masks.map((m) => (
                  <li
                    key={m.type}
                    className="flex flex-col items-center gap-1 rounded-xl bg-[var(--paper)] p-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.url}
                      alt={`Heatmap of measured ${CONCERN_LABEL[m.type] ?? m.type} zones on the face`}
                      className="h-24 w-auto rounded"
                      loading="lazy"
                    />
                    <span className="text-xs font-medium text-[var(--ink)]">
                      {CONCERN_LABEL[m.type] ?? m.type}
                      {typeof m.score === "number" ? ` · ${m.score}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </figure>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setAnnouncement("Camera starting again.");
              setPhase("capturing");
            }}
          >
            Try another capture
          </button>
        </section>
      )}

      {attempts.length > 0 && (
        <section aria-label="Attempt log" className="w-full">
          <h2 className="text-xl font-medium">Attempt log</h2>
          <ol className="mt-2 flex flex-col gap-1 text-base text-[var(--paper-dim)]">
            {attempts.map((a) => (
              <li key={a.n}>
                Attempt {a.n}: {a.seconds !== null ? `${a.seconds}s, ` : ""}
                {a.outcome}
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
