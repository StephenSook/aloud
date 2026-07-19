"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { LiveRegion } from "@/components/LiveRegion";

const VoiceSession = dynamic(
  () => import("@/components/VoiceSession").then((m) => m.VoiceSession),
  { ssr: false },
);

/**
 * Hands-free conversation with Aloud. If a product was scanned this session,
 * the assistant already knows its label. Every reply is mirrored as text.
 */
export default function TalkPage() {
  const [announcement, setAnnouncement] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-6 px-6 py-12">
      <h1 className="display text-4xl">Talk with Aloud</h1>
      <p className="text-lg leading-8 text-[var(--paper)] text-center">
        A live voice conversation. Ask about ingredients, allergens, or a
        barcode number. If you scanned a product this session, Aloud already
        knows its label.
      </p>
      <LiveRegion message={announcement} assertive />
      <VoiceSession
        onStatus={setAnnouncement}
        onTranscript={(text) => setTranscript((prev) => [...prev, text])}
      />
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
