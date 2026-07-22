"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { LiveRegion } from "@/components/LiveRegion";
import { speakCue } from "@/lib/audio-cues";
import {
  addToHistory,
  getServerSnapshot,
  getSnapshot,
  parseHistory,
  subscribe,
} from "@/lib/history";

const BarcodeScanner = dynamic(
  () => import("@/components/BarcodeScanner").then((m) => m.BarcodeScanner),
  { ssr: false },
);

type Phase = "intro" | "scanning" | "looking_up" | "result";

type ProductReadResponse = {
  status: string;
  read: { summary: string; fullList: string | null };
};

/**
 * Accessible product scanning: beep-guided barcode find -> layered spoken
 * read -> drill-in (full list, follow-up questions through the agent).
 * Manual barcode entry is a first-class path, not a hidden fallback.
 */
export default function ScanPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [announcement, setAnnouncement] = useState("");
  const [read, setRead] = useState<ProductReadResponse["read"] | null>(null);
  const [productTitle, setProductTitle] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState("");
  const [lastBarcode, setLastBarcode] = useState("");
  const [compareWith, setCompareWith] = useState("");
  const [productStatus, setProductStatus] = useState("");
  const [readingLabel, setReadingLabel] = useState(false);
  const historySnapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const history = useMemo(() => parseHistory(historySnapshot), [historySnapshot]);

  const say = useCallback((text: string, force = false) => {
    setAnnouncement(text);
    speakCue(text, force);
  }, []);

  const compare = useCallback(
    async (a: string, b: string) => {
      setPhase("looking_up");
      say("Comparing the two products.", true);
      try {
        const res = await fetch(
          `/api/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`,
        );
        if (!res.ok) throw new Error(`compare ${res.status}`);
        const body = (await res.json()) as { spoken: string };
        setRead({ summary: body.spoken, fullList: null });
        setPhase("result");
        say(body.spoken, true);
      } catch (err) {
        console.error(err);
        setPhase("result");
        setRead({
          summary: "The comparison did not go through. Check the connection and try again.",
          fullList: null,
        });
        say("The comparison did not go through. Check the connection and try again.", true);
      } finally {
        setCompareWith("");
      }
    },
    [say],
  );

  const lookUp = useCallback(
    async (barcode: string) => {
      if (compareWith && compareWith !== barcode) {
        await compare(compareWith, barcode);
        return;
      }
      setPhase("looking_up");
      say("Looking that up.", true);
      try {
        const res = await fetch(`/api/product/${encodeURIComponent(barcode)}`);
        if (!res.ok) throw new Error(`lookup ${res.status}`);
        const body = (await res.json()) as ProductReadResponse;
        setRead(body.read);
        setProductStatus(body.status);
        const title = body.read.summary.split(".")[0] ?? "";
        setProductTitle(title);
        setLastBarcode(barcode);
        try {
          sessionStorage.setItem(
            "aloud:lastScan",
            JSON.stringify({
              title,
              ingredients: body.read.fullList ? body.read.fullList.split(", ") : [],
            }),
          );
          if (body.status === "found") {
            addToHistory({ barcode, title, at: Date.now() });
          }
        } catch {
          // storage unavailable is fine; voice just starts without context
        }
        setPhase("result");
        say(body.read.summary, true);
      } catch (err) {
        console.error(err);
        setPhase("result");
        setRead({
          summary:
            "The product database did not respond. Check the connection and try again.",
          fullList: null,
        });
        say("The product database did not respond. Check the connection and try again.", true);
      }
    },
    [say, compareWith, compare],
  );

  const readLabel = useCallback(
    async (file: File) => {
      setReadingLabel(true);
      say("Reading the label. This takes a few seconds.", true);
      try {
        const form = new FormData();
        form.append("image", file);
        const res = await fetch("/api/label", { method: "POST", body: form });
        const body = (await res.json()) as {
          read?: { summary: string; fullList: string | null };
          error?: string;
        };
        if (body.read) {
          setRead(body.read);
          setProductStatus("found");
          try {
            sessionStorage.setItem(
              "aloud:lastScan",
              JSON.stringify({
                title: "the product you photographed",
                ingredients: body.read.fullList ? body.read.fullList.split(", ") : [],
              }),
            );
          } catch {
            // storage unavailable is fine
          }
          say(body.read.summary, true);
        } else {
          say(body.error ?? "I could not read the label. Try again.", true);
        }
      } catch (err) {
        console.error(err);
        say("I could not read the label just now. Try again.", true);
      } finally {
        setReadingLabel(false);
      }
    },
    [say],
  );

  const ask = useCallback(async () => {
    if (!question.trim() || asking) return;
    setAsking(true);
    say("Thinking.", true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: {
            productTitle,
            ingredients: read?.fullList ? read.fullList.split(", ") : [],
          },
        }),
      });
      const body = (await res.json()) as { answer?: string; error?: string };
      const spoken = body.answer ?? body.error ?? "I could not answer that.";
      setAnswer(spoken);
      say(spoken, true);
    } catch (err) {
      console.error(err);
      say("I could not answer that just now.", true);
    } finally {
      setAsking(false);
    }
  }, [question, asking, productTitle, read, say]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-6 px-6 py-12">
      <h1 className="display text-4xl">Scan a product</h1>
      <LiveRegion message={announcement} assertive />

      {phase === "intro" && (
        <section className="flex w-full flex-col items-center gap-5 text-center">
          <p className="text-lg leading-8 text-[var(--paper)]">
            Aloud will open the back camera and guide you by sound to find the
            barcode, then read the product and its ingredients out loud. You
            can also type the barcode number instead.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              say("Camera starting.", true);
              setPhase("scanning");
            }}
          >
            Start scanning
          </button>
          <form
            className="flex w-full max-w-sm items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (/^\d{6,14}$/.test(manualCode)) void lookUp(manualCode);
              else say("A barcode is 6 to 14 digits. Check the number and try again.", true);
            }}
          >
            <label className="sr-only" htmlFor="manual-barcode">
              Barcode number
            </label>
            <input
              id="manual-barcode"
              inputMode="numeric"
              placeholder="Type barcode number"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.trim())}
              className="w-full rounded-full border hairline bg-[var(--ink-soft)] px-5 py-3 text-base"
            />
            <button
              type="submit"
              className="btn-ghost"
            >
              Look up
            </button>
          </form>
          {history.length > 0 && (
            <section aria-label="Recent scans" className="w-full max-w-sm text-left">
              <h2 className="text-lg font-medium">Recent scans</h2>
              <ul className="mt-2 flex flex-col gap-1">
                {history.slice(0, 5).map((h) => (
                  <li key={h.barcode}>
                    <button
                      type="button"
                      className="w-full rounded-xl border hairline px-4 py-3 text-left text-base"
                      onClick={() => void lookUp(h.barcode)}
                    >
                      {h.title || h.barcode}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      )}

      {phase === "scanning" && (
        <section className="flex flex-col items-center gap-4">
          <BarcodeScanner
            onDecoded={(code) => void lookUp(code)}
            onGuidance={setAnnouncement}
            onError={(message) => {
              say(message, true);
              setPhase("intro");
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setPhase("intro")}
          >
            Cancel
          </button>
        </section>
      )}

      {phase === "looking_up" && (
        <p className="text-lg text-[var(--paper)]">Looking that up.</p>
      )}

      {phase === "result" && read && (
        <section className="flex w-full flex-col items-center gap-5 text-center">
          <p className="text-lg leading-8">{read.summary}</p>

          {(productStatus === "not_found" || productStatus === "no_ingredients") && (
            <div className="flex w-full max-w-sm flex-col items-center gap-2">
              <label
                className={`btn-primary cursor-pointer ${readingLabel ? "opacity-50" : ""}`}
              >
                {readingLabel ? "Reading the label" : "Read the label with the camera"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={readingLabel}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void readLabel(file);
                  }}
                />
              </label>
              <p className="text-sm text-[var(--paper-dim)]">
                Point the camera at the ingredients panel, holding it flat and in
                good light.
              </p>
            </div>
          )}

          {read.fullList && (
            <details
              className="w-full text-left"
              onToggle={(e) => {
                if ((e.target as HTMLDetailsElement).open && read.fullList) {
                  say(`Full ingredient list. ${read.fullList}`, true);
                }
              }}
            >
              <summary className="cursor-pointer py-2 text-lg font-medium">
                Read the full ingredient list
              </summary>
              <p className="text-base leading-7 text-[var(--paper-dim)]">
                {read.fullList}
              </p>
            </details>
          )}
          <form
            className="flex w-full max-w-sm items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void ask();
            }}
          >
            <label className="sr-only" htmlFor="ask-question">
              Ask about this product
            </label>
            <input
              id="ask-question"
              placeholder="Ask, like: what does glycerin do?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-full border hairline bg-[var(--ink-soft)] px-5 py-3 text-base"
            />
            <button
              type="submit"
              disabled={asking}
              className="btn-ghost disabled:opacity-50"
            >
              Ask
            </button>
          </form>
          {answer && <p className="text-base leading-7">{answer}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setRead(null);
                setAnswer("");
                setQuestion("");
                say("Ready to scan another product.", true);
                setPhase("scanning");
              }}
            >
              Scan another product
            </button>
            {lastBarcode && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setCompareWith(lastBarcode);
                  setRead(null);
                  setAnswer("");
                  setQuestion("");
                  say(
                    "Scan the second product now, and I will compare the two labels.",
                    true,
                  );
                  setPhase("scanning");
                }}
              >
                Compare with another
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
