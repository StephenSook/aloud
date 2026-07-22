/**
 * Scan-history external store. Backed by localStorage and read through
 * useSyncExternalStore so server and first client paint agree (server
 * snapshot is empty), avoiding a hydration mismatch, while later scans
 * update the list reactively.
 */
export type HistoryEntry = { barcode: string; title: string; at: number };

const KEY = "aloud:history";
const listeners = new Set<() => void>();
let cache = "[]";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Stable-reference snapshot: same string value returns the cached reference. */
export function getSnapshot(): string {
  const value = read();
  if (value !== cache) cache = value;
  return cache;
}

export function getServerSnapshot(): string {
  return "[]";
}

export function parseHistory(snapshot: string): HistoryEntry[] {
  try {
    return JSON.parse(snapshot) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function addToHistory(entry: HistoryEntry): void {
  const current = parseHistory(getSnapshot());
  const next = [entry, ...current.filter((e) => e.barcode !== entry.barcode)].slice(0, 20);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable is fine; history is a convenience only
  }
  listeners.forEach((l) => l());
}
