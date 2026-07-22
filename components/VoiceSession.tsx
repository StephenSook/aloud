"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  contextInstructions,
  executeVoiceTool,
  VOICE_TOOLS,
  type LastScan,
} from "@/lib/voice-config";

type SessionState = "idle" | "connecting" | "live" | "error";

type RealtimeEvent = {
  type: string;
  response?: {
    output?: {
      type: string;
      name?: string;
      call_id?: string;
      arguments?: string;
      content?: { type: string; transcript?: string }[];
    }[];
  };
};

/**
 * Hands-free voice session with Aloud over WebRTC. One connection carries
 * mic in, speech out, and tool calls; the browser only ever holds a
 * short-lived ephemeral token. Everything the assistant says is mirrored as
 * text for screen readers and captions.
 */
export function VoiceSession({
  onStatus,
  onTranscript,
}: {
  onStatus: (message: string) => void;
  onTranscript: (text: string) => void;
}) {
  const [state, setState] = useState<SessionState>("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("idle");
    onStatus("Voice session ended.");
  }, [onStatus]);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    setState("connecting");
    onStatus("Connecting the voice line.");
    try {
      const tokenRes = await fetch("/api/voice/token", { method: "POST" });
      if (!tokenRes.ok) throw new Error(`token ${tokenRes.status}`);
      const { token } = (await tokenRes.json()) as { token: string };

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = new Audio();
      audioEl.autoplay = true;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const dc = pc.createDataChannel("oai-events");

      const send = (message: Record<string, unknown>) => {
        if (dc.readyState === "open") {
          dc.send(JSON.stringify({ event_id: crypto.randomUUID(), ...message }));
        }
      };

      dc.addEventListener("open", () => {
        let lastScan: LastScan | null = null;
        try {
          const raw = sessionStorage.getItem("aloud:lastScan");
          if (raw) lastScan = JSON.parse(raw) as LastScan;
        } catch {
          lastScan = null;
        }
        send({
          type: "session.update",
          session: {
            type: "realtime",
            instructions: contextInstructions(lastScan),
            tools: VOICE_TOOLS,
          },
        });
        setState("live");
        onStatus("Voice line open. Just start talking. Say, what does niacinamide do?");
      });

      dc.addEventListener("message", (event) => {
        let parsed: RealtimeEvent;
        try {
          parsed = JSON.parse(event.data) as RealtimeEvent;
        } catch {
          return;
        }
        if (parsed.type === "input_audio_buffer.speech_started") {
          onStatus("Listening.");
        }
        if (parsed.type === "response.created") {
          onStatus("Thinking.");
        }
        if (parsed.type === "response.done") {
          for (const item of parsed.response?.output ?? []) {
            if (item.type === "function_call" && item.name && item.call_id) {
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(item.arguments ?? "{}") as Record<string, unknown>;
              } catch {
                args = {};
              }
              void executeVoiceTool(item.name, args).then((output) => {
                send({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: item.call_id,
                    output: JSON.stringify(output),
                  },
                });
                send({ type: "response.create" });
              });
            }
            if (item.type === "message") {
              const transcript = item.content
                ?.map((c) => c.transcript)
                .filter(Boolean)
                .join(" ");
              if (transcript) onTranscript(transcript);
            }
          }
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!sdpResponse.ok) throw new Error(`SDP ${sdpResponse.status}`);
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });
    } catch (err) {
      console.error("voice session failed", err);
      setState("error");
      onStatus(
        "The voice line could not connect. Check microphone permission and the connection, then try again.",
      );
      stop();
    }
  }, [onStatus, onTranscript, stop]);

  return (
    <div className="flex flex-col items-center gap-4">
      {state === "idle" || state === "error" ? (
        <button
          type="button"
          data-testid="voice-start"
          className="btn-primary"
          onClick={() => void start()}
        >
          Start talking with Aloud
        </button>
      ) : (
        <button type="button" data-testid="voice-stop" className="btn-ghost" onClick={stop}>
          End the conversation
        </button>
      )}
      <p className="text-base text-[var(--paper-dim)]" aria-hidden="true">
        {state === "live"
          ? "Live. Speak naturally, interrupt any time."
          : state === "connecting"
            ? "Connecting."
            : "Uses your microphone. Nothing is saved."}
      </p>
    </div>
  );
}
