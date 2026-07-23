"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Report the caught error so a real-device crash we cannot reproduce on
    // desktop shows up in the server logs. Temporary diagnostic.
    try {
      navigator.sendBeacon?.(
        "/api/clientlog",
        JSON.stringify({
          message: error.message,
          stack: error.stack,
          where: `error-boundary digest=${error.digest ?? "none"}`,
          ua: navigator.userAgent,
        }),
      );
    } catch {
      // best effort
    }
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="display text-3xl">Something interrupted that</h1>
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
