/**
 * Safely tear down an html5-qrcode instance.
 *
 * html5-qrcode's stop() THROWS a synchronous string ("Cannot stop, scanner is
 * not running or paused.") whenever the scanner is not in a scanning state,
 * e.g. the camera never finished starting, or it was already stopped. A plain
 * `.stop().catch()` cannot catch a *synchronous* throw, so an unguarded stop()
 * inside a React unmount cleanup escapes to the error boundary as a
 * message-less string error. Awaiting inside try/catch catches both the
 * synchronous throw and a rejected promise.
 */
export async function stopScanner(
  scanner: { stop: () => Promise<void>; clear: () => void } | null,
): Promise<void> {
  if (!scanner) return;
  try {
    await scanner.stop();
  } catch {
    // scanner was not running; nothing to stop
  }
  try {
    scanner.clear();
  } catch {
    // region already torn down; nothing to clear
  }
}
