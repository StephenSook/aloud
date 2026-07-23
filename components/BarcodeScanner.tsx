"use client";

import { useEffect, useRef, useState } from "react";
import { Beeper, speakCue } from "@/lib/audio-cues";

/**
 * Accessible barcode scanner. html5-qrcode is the single integration:
 * native BarcodeDetector fast path where present (Android Chrome), its
 * bundled zxing decoder everywhere else including iOS Safari.
 *
 * Non-visual pattern (Seeing AI precedent): steady guidance beeps while
 * searching, spoken coaching to rotate the product, a distinct chime +
 * vibration on decode.
 */
export function BarcodeScanner({
  onDecoded,
  onGuidance,
  onError,
}: {
  onDecoded: (barcode: string) => void;
  onGuidance: (message: string) => void;
  onError: (message: string) => void;
}) {
  const regionId = "aloud-barcode-region";
  const [status, setStatus] = useState("Starting the camera.");
  const decoded = useRef(false);

  useEffect(() => {
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let cancelled = false;
    const beeper = new Beeper();
    let coach: ReturnType<typeof setInterval> | null = null;

    async function run() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;
        const instance = new Html5Qrcode(regionId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        });
        scanner = instance;

        const cue =
          "Camera on. Hold the product about eight inches away and slowly turn it, so the barcode faces the camera.";
        setStatus(cue);
        onGuidance(cue);
        speakCue(cue, true);
        beeper.start();
        beeper.setProximity(0.15);

        coach = setInterval(() => {
          if (!decoded.current) {
            const repeat = "Still looking. Keep turning the product slowly.";
            onGuidance(repeat);
            speakCue(repeat);
          }
        }, 8000);

        await instance.start(
          { facingMode: "environment" },
          {
            fps: 8,
            // Scan a defined wide box, not the whole frame, and cap the stream
            // at 720p. An unconstrained full-frame decode on an iPhone's native
            // high-resolution camera exhausts memory and crashes iOS Safari.
            qrbox: (vw: number, vh: number) => {
              const width = Math.floor(Math.min(vw, vh * 1.6) * 0.85);
              return { width, height: Math.floor(width * 0.55) };
            },
            videoConstraints: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          (text) => {
            if (decoded.current) return;
            decoded.current = true;
            beeper.stop();
            beeper.success();
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
              navigator.vibrate?.(120);
            }
            const found = "Barcode found. Looking it up.";
            setStatus(found);
            onGuidance(found);
            speakCue(found, true);
            void instance.stop().catch(() => undefined);
            onDecoded(text);
          },
          () => {
            // per-frame decode misses are normal; guidance handles pacing
          },
        );
      } catch (err) {
        console.error("scanner failed to start", err);
        beeper.stop();
        onError(
          "The camera could not start for scanning. Check camera permission, or type the barcode number instead.",
        );
      }
    }

    void run();
    return () => {
      cancelled = true;
      if (coach) clearInterval(coach);
      beeper.stop();
      if (scanner) {
        void scanner.stop().then(() => scanner?.clear()).catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div id={regionId} aria-hidden="true" className="w-72 overflow-hidden rounded-2xl" />
      <p className="text-lg text-zinc-700 dark:text-zinc-300" aria-hidden="true">
        {status}
      </p>
    </div>
  );
}
