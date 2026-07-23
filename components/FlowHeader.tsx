import Link from "next/link";

/**
 * Shared brand header for the flow pages. The wordmark and waveform mark link
 * home, giving every flow a consistent landmark and a way back that the pages
 * previously lacked (the only route home was the browser back button).
 */
export function FlowHeader() {
  return (
    <Link
      href="/"
      aria-label="Aloud, back to home"
      className="mb-4 inline-flex items-center gap-3 self-start text-[var(--paper-dim)] transition-colors hover:text-[var(--gold)]"
    >
      <span aria-hidden="true" className="text-base leading-none">&larr;</span>
      <span className="display text-lg text-[var(--paper)]">Aloud</span>
      <span className="waveform" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </span>
    </Link>
  );
}
