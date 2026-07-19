"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { LiveRegion } from "@/components/LiveRegion";
import { speakCue } from "@/lib/audio-cues";
import { composeLookVerify, type Baseline, type ScoredOutput } from "@/lib/look-verify";

const CameraCapture = dynamic(
  () => import("@/components/CameraCapture").then((m) => m.CameraCapture),
  { ssr: false },
);

type Phase = "intro" | "capturing" | "analyzing" | "done";

/**
 * Makeup look-verification: photograph the finished look, compare against
 * this session's bare-skin baseline, and speak the score deltas with honest
 * uncertainty. The emotional demo moment, held to the strictest language.
 */
export default function VerifyPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [announcement, setAnnouncement] = useState("");
  const [verdict, setVerdict] = useState("");

  const say = useCallback((text: string, force = false) => {
    setAnnouncement(text);
    speakCue(text, force);
  }, []);

  const analyze = useCallback(
    async (blob: Blob) => {
      setPhase("analyzing");
      say("Analyzing your look.", true);
      try {
        const form = new FormData();
        form.append("image", new File([blob], "look.jpg", { type: "image/jpeg" }));
        const created = await fetch("/api/skin", { method: "POST", body: form });
        if (!created.ok) throw new Error(`create ${created.status}`);
        const { taskId } = (await created.json()) as { taskId: string };

        const deadline = Date.now() + 60_000;
        while (Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const res = await fetch(`/api/skin/${encodeURIComponent(taskId)}`);
          if (!res.ok) throw new Error(`poll ${res.status}`);
          const body = (await res.json()) as {
            status: string;
            outputs?: ScoredOutput[];
            errorMessage?: string;
          };
          if (body.status === "success") {
            let baseline: Baseline | null = null;
            try {
              const raw = sessionStorage.getItem("aloud:skinBaseline");
              if (raw) baseline = JSON.parse(raw) as Baseline;
            } catch {
              baseline = null;
            }
            const text = composeLookVerify(baseline, body.outputs ?? []);
            setVerdict(text);
            say(text, true);
            setPhase("done");
            return;
          }
          if (body.status === "error") {
            const text = `The photo was not accepted: ${body.errorMessage ?? "unknown reason"}. This is about the photo, not you. Let us try again.`;
            setVerdict(text);
            say(text, true);
            setPhase("done");
            return;
          }
        }
        throw new Error("timed out");
      } catch (err) {
        console.error(err);
        const text = "The analysis service did not respond. Check the connection and try again.";
        setVerdict(text);
        say(text, true);
        setPhase("done");
      }
    },
    [say],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Verify your look</h1>
      <LiveRegion message={announcement} assertive />

      {phase === "intro" && (
        <section className="flex flex-col items-center gap-5 text-center">
          <p className="text-lg leading-8 text-zinc-700 dark:text-zinc-300">
            After you apply makeup, Aloud photographs your face the same guided
            way and compares the analysis against your bare-skin capture from
            this session. You hear what changed, in plain numbers, with honest
            uncertainty. Nothing is saved.
          </p>
          <button
            type="button"
            className="rounded-full bg-black px-8 py-4 text-lg font-medium text-white dark:bg-white dark:text-black"
            onClick={() => {
              say(
                "Camera starting. Same as before: hold the phone at arm's length and follow the beeps.",
                true,
              );
              setPhase("capturing");
            }}
          >
            I am ready, start the camera
          </button>
        </section>
      )}

      {phase === "capturing" && (
        <section className="flex flex-col items-center gap-4">
          <CameraCapture
            onCaptured={(blob) => void analyze(blob)}
            onGuidance={setAnnouncement}
            onError={(message) => {
              say(message, true);
              setVerdict(message);
              setPhase("done");
            }}
          />
          <button
            type="button"
            className="rounded-full border border-zinc-400 px-6 py-3 text-base"
            onClick={() => setPhase("intro")}
          >
            Cancel
          </button>
        </section>
      )}

      {phase === "analyzing" && (
        <p className="text-lg text-zinc-700 dark:text-zinc-300">
          Analyzing your look. A few seconds.
        </p>
      )}

      {phase === "done" && (
        <section className="flex flex-col items-center gap-5 text-center">
          <p className="text-lg leading-8">{verdict}</p>
          <button
            type="button"
            className="rounded-full bg-black px-8 py-4 text-lg font-medium text-white dark:bg-white dark:text-black"
            onClick={() => {
              say("Camera starting again.", true);
              setPhase("capturing");
            }}
          >
            Check again
          </button>
        </section>
      )}
    </main>
  );
}
