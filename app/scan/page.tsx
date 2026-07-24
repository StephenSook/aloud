"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { FlowHeader } from "@/components/FlowHeader";
import { LiveRegion } from "@/components/LiveRegion";
import { earcons, speakCue } from "@/lib/audio-cues";
import { addScannedProduct, getScannedProducts } from "@/lib/session-products";
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

// Stable no-op subscribe: the scanned-product count is re-read on each render
// (scans already trigger renders), so no external subscription is needed.
const noopSubscribe = () => () => {};

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
  const [needs, setNeeds] = useState("");
  const [routine, setRoutine] = useState("");
  const [buildingRoutine, setBuildingRoutine] = useState(false);
  const historySnapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const history = useMemo(() => parseHistory(historySnapshot), [historySnapshot]);

  // Count of products scanned this session. Read through useSyncExternalStore so
  // the server snapshot (0) and first client paint agree, then it reflects real
  // storage on every subsequent render (scans trigger a render, refreshing it).
  const scannedCount = useSyncExternalStore(
    noopSubscribe,
    () => getScannedProducts().length,
    () => 0,
  );

  const say = useCallback((text: string, force = false) => {
    setAnnouncement(text);
    speakCue(text, force);
  }, []);

  // A meaningful earcon before the sentence: caution on a listed allergen,
  // a bright note on a clean hit, a soft descending pair on a miss.
  const earconFor = useCallback((status: string, summary: string) => {
    if (status === "not_found" || status === "no_ingredients") earcons.miss();
    else if (/flags? (it |them )?as (a )?fragrance allergen/i.test(summary)) earcons.warn();
    else earcons.found();
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
        const url = needs.trim()
          ? `/api/product/${encodeURIComponent(barcode)}?needs=${encodeURIComponent(needs.trim())}`
          : `/api/product/${encodeURIComponent(barcode)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`lookup ${res.status}`);
        const body = (await res.json()) as ProductReadResponse;
        setRead(body.read);
        setProductStatus(body.status);
        const title = body.read.summary.split(".")[0] ?? "";
        setProductTitle(title);
        setLastBarcode(barcode);
        const ingredients = body.read.fullList ? body.read.fullList.split(", ") : [];
        try {
          sessionStorage.setItem("aloud:lastScan", JSON.stringify({ title, ingredients }));
          if (body.status === "found") {
            addToHistory({ barcode, title, at: Date.now() });
          }
          if (ingredients.length > 0) addScannedProduct({ title, ingredients });
        } catch {
          // storage unavailable is fine; voice just starts without context
        }
        setPhase("result");
        earconFor(body.status, body.read.summary);
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
    [say, compareWith, compare, needs, earconFor],
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
          status?: string;
          read?: { summary: string; fullList: string | null };
          error?: string;
        };
        if (body.read && body.status !== "read_failed") {
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
          earconFor("found", body.read.summary);
          say(body.read.summary, true);
        } else if (body.read) {
          // read_failed: honest miss semantics. Keep productStatus unchanged
          // so the "Read the label with the camera" retry stays on screen,
          // play the miss earcon (never the bright found note), and never
          // render a "no allergen listed" banner off a read that read nothing.
          earcons.miss();
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
    [say, earconFor],
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

  // Agentic routine builder: order the products scanned this session by their
  // labeled cosmetic role, related to the skin read and stated needs.
  const buildRoutine = useCallback(async () => {
    const products = getScannedProducts();
    if (products.length === 0) {
      say("Scan a product or two first, then I can put them in order.", true);
      return;
    }
    setBuildingRoutine(true);
    say("Building a routine from what you scanned. This takes a few seconds.", true);
    try {
      let skin: { scores?: Record<string, number> } | undefined;
      try {
        const raw = sessionStorage.getItem("aloud:skinBaseline");
        if (raw) skin = { scores: (JSON.parse(raw) as { scores?: Record<string, number> }).scores };
      } catch {
        // no skin read this session; the routine works from products alone
      }
      const res = await fetch("/api/routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products, skin, needs: needs.trim() || undefined }),
      });
      const body = (await res.json()) as { routine?: string; error?: string };
      const spoken = body.routine ?? body.error ?? "I could not build the routine.";
      setRoutine(spoken);
      say(spoken, true);
    } catch (err) {
      console.error(err);
      say("I could not build the routine just now. Try again.", true);
    } finally {
      setBuildingRoutine(false);
    }
  }, [needs, say]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center gap-6 px-6 py-12">
      <FlowHeader />
      <h1 className="display reveal reveal-2 text-4xl">Scan a product</h1>
      <LiveRegion message={announcement} assertive />

      {phase === "intro" && (
        <section className="flex w-full flex-col items-center gap-5 text-center">
          <p className="text-lg leading-8 text-[var(--paper)]">
            Aloud will open the back camera and guide you by sound to find the
            barcode, then read the product and its ingredients out loud. You
            can also type the barcode number instead.
          </p>
          <div className="flex w-full max-w-sm flex-col gap-1 text-left">
            <label htmlFor="needs" className="text-sm text-[var(--paper-dim)]">
              Your skin needs (optional). Aloud will relate each product to
              what you say.
            </label>
            <input
              id="needs"
              placeholder="e.g. oily T-zone, fragrance makes me itch"
              value={needs}
              onChange={(e) => setNeeds(e.target.value)}
              className="w-full rounded-full border hairline bg-[var(--ink-soft)] px-5 py-3 text-base"
            />
          </div>
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
              className="btn-ghost shrink-0 whitespace-nowrap"
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
        <section className="flex w-full flex-col items-center gap-5">
          {productStatus === "found" ? (
            (() => {
              const firstBreak = read.summary.indexOf(". ");
              const title = firstBreak > 0 ? read.summary.slice(0, firstBreak) : "This product";
              const body = firstBreak > 0 ? read.summary.slice(firstBreak + 2) : read.summary;
              const hasAllergen = /flags? (it |them )?as (a )?fragrance allergen/i.test(read.summary);
              return (
                <div className="flex w-full flex-col gap-4 text-left">
                  <h2 className="display text-3xl">{title}</h2>
                  <div
                    className={`rounded-2xl border px-4 py-3 text-base leading-7 ${
                      hasAllergen
                        ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] text-[var(--paper)]"
                        : "hairline text-[var(--paper-dim)]"
                    }`}
                  >
                    {hasAllergen
                      ? "Heads up: this label lists an EU-flagged fragrance allergen."
                      : "No EU-flagged fragrance allergen listed on this label."}
                  </div>
                  <p className="text-lg leading-8 text-[var(--paper)]">{body}</p>
                </div>
              );
            })()
          ) : (
            <p className="text-lg leading-8 text-center text-[var(--paper)]">{read.summary}</p>
          )}

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

          {scannedCount >= 1 && (
            <div className="flex w-full flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => void buildRoutine()}
                disabled={buildingRoutine}
                className="btn-primary disabled:opacity-50"
              >
                {buildingRoutine
                  ? "Building your routine"
                  : `Build my routine from ${
                      scannedCount === 1 ? "this product" : `these ${scannedCount} products`
                    }`}
              </button>
              {routine && (
                <div className="w-full rounded-2xl border hairline px-4 py-3 text-left">
                  <h3 className="display text-xl">Your suggested routine</h3>
                  <p className="mt-2 text-base leading-7 text-[var(--paper)]">{routine}</p>
                  <p className="mt-2 text-sm text-[var(--paper-dim)]">
                    A suggested order based on what the labels say. A dermatologist is
                    the right person for skin-health questions.
                  </p>
                </div>
              )}
            </div>
          )}

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
