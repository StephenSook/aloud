"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { LiveRegion } from "@/components/LiveRegion";
import { speakCue } from "@/lib/audio-cues";

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

  const say = useCallback((text: string, force = false) => {
    setAnnouncement(text);
    speakCue(text, force);
  }, []);

  const lookUp = useCallback(
    async (barcode: string) => {
      setPhase("looking_up");
      say("Looking that up.", true);
      try {
        const res = await fetch(`/api/product/${encodeURIComponent(barcode)}`);
        if (!res.ok) throw new Error(`lookup ${res.status}`);
        const body = (await res.json()) as ProductReadResponse;
        setRead(body.read);
        const title = body.read.summary.split(".")[0] ?? "";
        setProductTitle(title);
        try {
          sessionStorage.setItem(
            "aloud:lastScan",
            JSON.stringify({
              title,
              ingredients: body.read.fullList ? body.read.fullList.split(", ") : [],
            }),
          );
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
      <h1 className="text-3xl font-semibold tracking-tight">Scan a product</h1>
      <LiveRegion message={announcement} assertive />

      {phase === "intro" && (
        <section className="flex w-full flex-col items-center gap-5 text-center">
          <p className="text-lg leading-8 text-zinc-700 dark:text-zinc-300">
            Aloud will open the back camera and guide you by sound to find the
            barcode, then read the product and its ingredients out loud. You
            can also type the barcode number instead.
          </p>
          <button
            type="button"
            className="rounded-full bg-black px-8 py-4 text-lg font-medium text-white dark:bg-white dark:text-black"
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
              className="w-full rounded-full border border-zinc-400 px-5 py-3 text-base dark:bg-zinc-900"
            />
            <button
              type="submit"
              className="rounded-full border border-zinc-400 px-5 py-3 text-base"
            >
              Look up
            </button>
          </form>
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
            className="rounded-full border border-zinc-400 px-6 py-3 text-base"
            onClick={() => setPhase("intro")}
          >
            Cancel
          </button>
        </section>
      )}

      {phase === "looking_up" && (
        <p className="text-lg text-zinc-700 dark:text-zinc-300">Looking that up.</p>
      )}

      {phase === "result" && read && (
        <section className="flex w-full flex-col items-center gap-5 text-center">
          <p className="text-lg leading-8">{read.summary}</p>
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
              <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
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
              className="w-full rounded-full border border-zinc-400 px-5 py-3 text-base dark:bg-zinc-900"
            />
            <button
              type="submit"
              disabled={asking}
              className="rounded-full border border-zinc-400 px-5 py-3 text-base disabled:opacity-50"
            >
              Ask
            </button>
          </form>
          {answer && <p className="text-base leading-7">{answer}</p>}
          <button
            type="button"
            className="rounded-full bg-black px-8 py-4 text-lg font-medium text-white dark:bg-white dark:text-black"
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
        </section>
      )}
    </main>
  );
}
