"use client";

import { useEffect } from "react";

/** Reports uncaught client errors to the server so real-device crashes are visible. */
export function ErrorReporter() {
  useEffect(() => {
    const send = (message: string, stack: string, where: string) => {
      try {
        navigator.sendBeacon?.(
          "/api/clientlog",
          JSON.stringify({ message, stack, where, ua: navigator.userAgent }),
        );
      } catch {
        // best effort
      }
    };
    const onError = (e: ErrorEvent) =>
      send(e.message || "error", e.error?.stack || "", `${e.filename}:${e.lineno}`);
    const onRejection = (e: PromiseRejectionEvent) =>
      send(String(e.reason?.message || e.reason || "rejection"), e.reason?.stack || "", "unhandledrejection");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
