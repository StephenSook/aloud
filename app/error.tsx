"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
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
