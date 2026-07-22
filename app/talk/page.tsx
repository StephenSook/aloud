"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { LiveRegion } from "@/components/LiveRegion";

const VoiceSession = dynamic(
  () => import("@/components/VoiceSession").then((m) => m.VoiceSession),
  { ssr: false },
);
const PushToTalk = dynamic(
  () => import("@/components/PushToTalk").then((m) => m.PushToTalk),
  { ssr: false },
);

type Mode = "live" | "push";

/**
 * Hands-free conversation with Aloud. If a product was scanned this session,
 * the assistant already knows its label. Every reply is mirrored as text.
 * Two modes: live (WebRTC Realtime) and a push-to-talk fallback that works
 * where WebRTC is blocked.
 */
export default function TalkPage() {
  const [announcement, setAnnouncement] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("live");

  const addLine = (text: string) => setTranscript((prev) => [...prev, text]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-6 px-6 py-12">
      <h1 className="display text-4xl">Talk with Aloud</h1>
      <p className="text-lg leading-8 text-[var(--paper)] text-center">
        A live voice conversation. Ask about ingredients, allergens, or a
        barcode number. If you scanned a product this session, Aloud already
        knows its label.
      </p>

      <fieldset className="flex items-center gap-4 text-sm text-[var(--paper-dim)]">
        <legend className="sr-only">Voice mode</legend>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="mode"
            checked={mode === "live"}
            onChange={() => setMode("live")}
          />
          Live
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="mode"
            checked={mode === "push"}
            onChange={() => setMode("push")}
          />
          Push to talk (fallback)
        </label>
      </fieldset>

      <LiveRegion message={announcement} assertive />

      {mode === "live" ? (
        <VoiceSession onStatus={setAnnouncement} onTranscript={addLine} />
      ) : (
        <PushToTalk onStatus={setAnnouncement} onTranscript={addLine} />
      )}

      {transcript.length > 0 && (
        <section aria-label="What Aloud said" className="w-full">
          <h2 className="text-xl font-medium">Transcript</h2>
          <ol className="mt-2 flex flex-col gap-2 text-base leading-7 text-[var(--paper-dim)]">
            {transcript.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
