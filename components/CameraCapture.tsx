"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  assess,
  captureCrop,
  framingPan,
  framingVertical,
  SteadinessTracker,
  type Box,
  type Guidance,
} from "@/lib/capture-guidance";
import { Beeper, speakCue } from "@/lib/audio-cues";

/**
 * Vibrate where the Vibration API exists (Android Chrome). A silent no-op on
 * iOS Safari, which does not implement it, so this is a progressive tactile
 * layer on top of the audio guidance, never a dependency.
 */
function pulse(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // unsupported or blocked; the audio cues carry the guidance
    }
  }
}

type FaceDetectorInstance = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number,
  ) => { detections: { boundingBox?: Box; categories: { score: number }[] }[] };
  close: () => void;
};

export type CaptureMetrics = {
  elapsedMs: number;
  frames: number;
};

/**
 * Non-visual audio-guided selfie capture. Camera + audio start inside the
 * caller's tap (call start() from a gesture handler via ref or mount-after-tap).
 * Announces guidance through onGuidance (mirrored to an ARIA live region by
 * the parent) and speaks cues aloud; beeps speed up as framing improves.
 */
export function CameraCapture({
  onCaptured,
  onGuidance,
  onError,
}: {
  onCaptured: (blob: Blob, metrics: CaptureMetrics) => void;
  onGuidance: (message: string) => void;
  onError: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Starting the camera.");
  const startedAt = useRef(0);
  const frames = useRef(0);
  const stopped = useRef(false);

  const lastGuidance = useRef<Guidance | null>(null);
  const announce = useCallback(
    (guidance: Guidance) => {
      const changed = lastGuidance.current?.message !== guidance.message;
      lastGuidance.current = guidance;
      if (changed) {
        setStatus(guidance.message);
        onGuidance(guidance.message);
        speakCue(guidance.message);
      }
    },
    [onGuidance],
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detector: FaceDetectorInstance | null = null;
    let raf = 0;
    const beeper = new Beeper();
    const tracker = new SteadinessTracker();
    stopped.current = false;
    // Pulse once when framing first locks in, re-armed if the face drifts out.
    let framedPulsed = false;

    async function run() {
      try {
        // Camera first (fast), model second; both awaited before the loop.
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
        );
        detector = (await vision.FaceDetector.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
        })) as unknown as FaceDetectorInstance;

        beeper.start();
        startedAt.current = performance.now();
        const lumaCanvas = document.createElement("canvas");
        lumaCanvas.width = 32;
        lumaCanvas.height = 32;
        const lumaCtx = lumaCanvas.getContext("2d", { willReadFrequently: true });
        let luma = 255;

        const loop = () => {
          try {
            loopBody();
          } catch (err) {
            // A throw here would end the rAF chain while the Beeper's own
            // timer chain keeps beeping forever with frozen guidance. Stop
            // the audio and surface a real, spoken error instead.
            console.error("capture guidance loop failed", err);
            stopped.current = true;
            beeper.stop();
            onError("The camera guidance stopped working. Let us try again.");
          }
        };

        const loopBody = () => {
          if (stopped.current || !video.videoWidth || !detector) {
            raf = requestAnimationFrame(loop);
            return;
          }
          frames.current += 1;

          if (frames.current % 10 === 1 && lumaCtx) {
            lumaCtx.drawImage(video, 0, 0, 32, 32);
            const pixels = lumaCtx.getImageData(0, 0, 32, 32).data;
            let sum = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              sum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
            }
            luma = sum / (pixels.length / 4);
          }

          const result = detector.detectForVideo(video, performance.now());
          const box = result.detections[0]?.boundingBox ?? null;
          const guidance = assess({
            box,
            frameWidth: video.videoWidth,
            frameHeight: video.videoHeight,
            luma,
          });
          beeper.setProximity(guidance.proximity);
          // Spatial framing: the beep pans toward the face's side and rises in
          // pitch when the face is high, so both axes are legible by ear alone.
          beeper.setPan(framingPan(box, video.videoWidth));
          beeper.setVertical(framingVertical(box, video.videoHeight));
          announce(guidance);

          // Tactile "you are framed, hold still" the moment framing locks in,
          // complementing the spoken "Hold still." Re-arms when the face drifts.
          if (guidance.state === "hold") {
            if (!framedPulsed) {
              framedPulsed = true;
              pulse(40);
            }
          } else {
            framedPulsed = false;
          }

          const ready = tracker.update(
            guidance,
            box,
            video.videoWidth,
            performance.now(),
          );
          if (ready && box) {
            stopped.current = true;
            beeper.stop();
            beeper.success();
            pulse([90, 50, 90]); // distinct double buzz: the photo was taken
            const cue = "Captured. Sending for analysis.";
            setStatus(cue);
            onGuidance(cue);
            speakCue(cue, true);

            const crop = captureCrop(box, video.videoWidth, video.videoHeight);
            const canvas = document.createElement("canvas");
            canvas.width = crop.width;
            canvas.height = crop.height;
            canvas
              .getContext("2d")!
              .drawImage(
                video,
                crop.x,
                crop.y,
                crop.width,
                crop.height,
                0,
                0,
                crop.width,
                crop.height,
              );
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  onCaptured(blob, {
                    elapsedMs: performance.now() - startedAt.current,
                    frames: frames.current,
                  });
                } else {
                  onError("The photo could not be saved. Let us try again.");
                }
              },
              "image/jpeg",
              0.92,
            );
            return;
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        console.error("capture failed to start", err);
        onError(
          "The camera could not start. Check camera permission for this site and try again.",
        );
      }
    }

    void run();

    return () => {
      stopped.current = true;
      cancelAnimationFrame(raf);
      beeper.stop();
      detector?.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <video
        ref={videoRef}
        playsInline
        muted
        aria-hidden="true"
        className="h-64 w-64 rounded-2xl object-cover opacity-90"
      />
      <p className="text-lg text-zinc-700 dark:text-zinc-300" aria-hidden="true">
        {status}
      </p>
    </div>
  );
}
