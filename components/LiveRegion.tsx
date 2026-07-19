"use client";

import { useState } from "react";

/**
 * Screen-reader announcement channel.
 *
 * Safari + VoiceOver stays silent when an aria-live region receives the SAME
 * string twice in a row. We alternate a trailing word-joiner character so
 * every announcement differs at the string level while sounding identical.
 */
export function LiveRegion({
  message,
  assertive = false,
}: {
  message: string;
  assertive?: boolean;
}) {
  // Adjust-state-during-render pattern (React docs): bump a tick whenever the
  // message changes so consecutive identical announcements differ as strings.
  const [prev, setPrev] = useState({ msg: "", tick: 0 });
  if (message !== prev.msg) {
    setPrev({ msg: message, tick: prev.tick + 1 });
  }

  const suffix = prev.tick % 2 === 0 ? "" : "⁠";

  return (
    <div
      aria-live={assertive ? "assertive" : "polite"}
      aria-atomic="true"
      className="sr-only"
      data-testid="live-region"
    >
      {prev.msg ? prev.msg + suffix : ""}
    </div>
  );
}
