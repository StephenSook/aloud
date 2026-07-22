"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LastScan } from "@/lib/voice-config";

type Status = "idle" | "recording" | "thinking" | "speaking";

/**
 * Turn-based fallback voice: press to talk, release to send. Deepgram
 * transcribes, the agent answers, ElevenLabs speaks it. Works over plain
 * HTTPS with no WebRTC, so it survives networks that block Realtime, and the
 * reply is always mirrored as text.
 */
export function PushToTalk({
  onStatus,
  onTranscript,
}: {
  onStatus: (message: string) => void;
  onTranscript: (text: string) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
    };
  }, []);

  const handle = useCallback(
    async (audio: Blob) => {
      setStatus("thinking");
      onStatus("Thinking.");
      try {
        const heard = await fetch("/api/voice/transcribe", {
          method: "POST",
          headers: { "Content-Type": audio.type || "audio/webm" },
          body: audio,
        });
        const { text: question } = (await heard.json()) as { text?: string };
        if (!question?.trim()) {
          onStatus("I did not catch that. Press and hold, then speak.");
          setStatus("idle");
          return;
        }
        onTranscript(`You: ${question}`);

        let lastScan: LastScan | null = null;
        try {
          const raw = sessionStorage.getItem("aloud:lastScan");
          if (raw) lastScan = JSON.parse(raw) as LastScan;
        } catch {
          lastScan = null;
        }

        const answered = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            context: {
              productTitle: lastScan?.title,
              ingredients: lastScan?.ingredients ?? [],
            },
          }),
        });
        const { answer, error } = (await answered.json()) as {
          answer?: string;
          error?: string;
        };
        const reply = answer ?? error ?? "I could not answer that.";
        onTranscript(`Aloud: ${reply}`);

        setStatus("speaking");
        onStatus("Speaking.");
        const spoken = await fetch("/api/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: reply }),
        });
        if (spoken.ok) {
          const url = URL.createObjectURL(await spoken.blob());
          const audioEl = new Audio(url);
          audioRef.current = audioEl;
          audioEl.onended = () => {
            URL.revokeObjectURL(url);
            setStatus("idle");
            onStatus("Ready. Press and hold to talk.");
          };
          await audioEl.play();
        } else {
          setStatus("idle");
          onStatus(reply);
        }
      } catch (err) {
        console.error(err);
        onStatus("Something went wrong. Try again.");
        setStatus("idle");
      }
    },
    [onStatus, onTranscript],
  );

  const start = useCallback(async () => {
    if (status !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void handle(blob);
      };
      recorder.start();
      setStatus("recording");
      onStatus("Listening. Release to send.");
    } catch (err) {
      console.error(err);
      onStatus("The microphone could not start. Check permission and try again.");
    }
  }, [status, handle, onStatus]);

  const stop = useCallback(() => {
    if (recorderRef.current && status === "recording") {
      recorderRef.current.stop();
    }
  }, [status]);

  const label =
    status === "recording"
      ? "Listening. Release to send"
      : status === "thinking"
        ? "Thinking"
        : status === "speaking"
          ? "Speaking"
          : "Press and hold to talk";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        data-testid="push-to-talk"
        className="btn-primary select-none"
        disabled={status === "thinking" || status === "speaking"}
        onPointerDown={() => void start()}
        onPointerUp={stop}
        onPointerLeave={stop}
      >
        {label}
      </button>
      <p className="text-sm text-[var(--paper-dim)]" aria-hidden="true">
        Fallback mode. Works without WebRTC. Uses your microphone; nothing is saved.
      </p>
    </div>
  );
}
