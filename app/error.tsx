"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { speakCue } from "@/lib/audio-cues";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    // A silent page swap fails the works-with-the-screen-off bar at the
    // exact moment things went wrong: announce it, focus it, and keep the
    // digest in the log for follow-up.
    console.error("error boundary", error?.digest ?? "", String(error));
    headingRef.current?.focus();
    speakCue("Something interrupted that. That is on our end, not you. Try again, or go back to the start.", true);
  }, [error]);

  return (
    <main
      role="alert"
      className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <h1 ref={headingRef} tabIndex={-1} className="display text-3xl">
        Something interrupted that
      </h1>
      <p className="text-lg leading-8 text-[var(--paper-dim)]">
        That is on our end, not you. Try again, and if it keeps happening, go
        back to the start.
      </p>
      <div className="flex gap-3">
        <button type="button" className="btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Start over
        </Link>
      </div>
    </main>
  );
}
