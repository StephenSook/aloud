"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LiveRegion } from "@/components/LiveRegion";
import type { CaptureMetrics } from "@/components/CameraCapture";
import { composeSkinRead } from "@/lib/skin-read";

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
  score?: number;
};

/**
 * Week-1 kill experiment instrument: consent -> audio-guided capture ->
 * YouCam analysis -> spoken verdict, with a running attempt log so ten
 * blindfolded tries can be recorded against the <30s gate.
 */
export default function CapturePage() {
  const [phase, setPhase] = useState<Phase>("consent");
  const [announcement, setAnnouncement] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [verdict, setVerdict] = useState("");
  const attemptStart = useRef(0);
  const attemptCount = useRef(0);

  const logAttempt = useCallback((seconds: number | null, outcome: string) => {
    attemptCount.current += 1;
    setAttempts((prev) => [
      { n: attemptCount.current, seconds, outcome },
      ...prev,
    ]);
  }, []);

  const speakResult = useCallback(
    (outputs: SkinOutput[]) => composeSkinRead(outputs),
    [],
  );

  const analyze = useCallback(
    async (blob: Blob, metrics: CaptureMetrics) => {
      setPhase("analyzing");
      const captureSeconds = Math.round(metrics.elapsedMs / 100) / 10;
      try {
        const form = new FormData();
        form.append("image", new File([blob], "capture.jpg", { type: "image/jpeg" }));
        const created = await fetch("/api/skin", { method: "POST", body: form });
        if (!created.ok) throw new Error(`create failed ${created.status}`);
        const { taskId } = (await created.json()) as { taskId: string };

        const deadline = Date.now() + 60_000;
        while (Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const res = await fetch(`/api/skin/${encodeURIComponent(taskId)}`);
          if (!res.ok) throw new Error(`poll failed ${res.status}`);
          const body = (await res.json()) as {
            status: string;
            outputs?: SkinOutput[];
            errorMessage?: string;
          };
          if (body.status === "success") {
            const text = `${speakResult(body.outputs ?? [])} Capture took ${captureSeconds} seconds.`;
            setVerdict(text);
            setAnnouncement(text);
            logAttempt(captureSeconds, "accepted");
            setPhase("done");
            return;
          }
          if (body.status === "error") {
            const text = `The photo was not accepted: ${body.errorMessage ?? "unknown reason"}. This is about the photo, not you. Let us try again.`;
            setVerdict(text);
            setAnnouncement(text);
            logAttempt(captureSeconds, `rejected: ${body.errorMessage ?? "unknown"}`);
            setPhase("done");
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
    [logAttempt, speakResult],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Skin capture</h1>
      <LiveRegion message={announcement} assertive />

      {phase === "consent" && (
        <section className="flex flex-col items-center gap-5 text-center">
          <p className="text-lg leading-8 text-zinc-700 dark:text-zinc-300">
            Aloud will open the front camera and guide you by sound to frame
            your face, then send one photo to a skin analysis service. The
            photo is processed for this session only. Nothing is saved, and
            nothing about your identity is inferred.
          </p>
          <button
            type="button"
            className="rounded-full bg-black px-8 py-4 text-lg font-medium text-white dark:bg-white dark:text-black"
            onClick={() => {
              attemptStart.current = performance.now();
              setAnnouncement(
                "Camera starting. Hold the phone at arm's length, screen facing you. Beeps get faster as your face gets centered.",
              );
              setPhase("capturing");
            }}
          >
            I agree, start the camera
          </button>
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
            className="rounded-full border border-zinc-400 px-6 py-3 text-base"
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
        <p className="text-lg text-zinc-700 dark:text-zinc-300">
          Analyzing the photo. This takes a few seconds.
        </p>
      )}

      {phase === "done" && (
        <section className="flex flex-col items-center gap-5 text-center">
          <p className="text-lg leading-8">{verdict}</p>
          <button
            type="button"
            className="rounded-full bg-black px-8 py-4 text-lg font-medium text-white dark:bg-white dark:text-black"
            onClick={() => {
              attemptStart.current = performance.now();
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
          <ol className="mt-2 flex flex-col gap-1 text-base text-zinc-600 dark:text-zinc-400">
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
