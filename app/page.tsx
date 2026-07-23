import { LiveRegion } from "@/components/LiveRegion";

const FLOWS = [
  {
    href: "/talk",
    n: "01",
    title: "Talk with Aloud",
    line: "A live voice conversation. Ask about any ingredient, allergen, or barcode.",
  },
  {
    href: "/scan",
    n: "02",
    title: "Scan a product",
    line: "Beep-guided barcode finding, then the label read aloud in plain language.",
  },
  {
    href: "/capture",
    n: "03",
    title: "Know your skin",
    line: "A selfie framed by sound alone, then an honest read of the analysis scores.",
  },
  {
    href: "/verify",
    n: "04",
    title: "Verify your look",
    line: "After makeup, hear what changed against your bare-skin capture.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center px-6">
      <main className="w-full max-w-2xl py-20 sm:py-28">
        <header className="reveal reveal-1 flex items-center gap-4">
          <span className="display text-2xl" aria-hidden="true">
            Aloud
          </span>
          <span className="waveform" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
        </header>

        <h1 className="display reveal reveal-2 mt-16 text-6xl leading-none sm:text-7xl">
          Beauty,
          <br />
          aloud.
        </h1>

        <p className="reveal reveal-3 mt-8 max-w-lg text-xl leading-9 text-[var(--paper-dim)]">
          A voice-first skincare assistant for blind and low-vision shoppers.
          Scan a product and hear what is in it. Capture a selfie without sight
          and hear an honest read of your skin. All with the screen off.
        </p>

        <nav aria-label="Aloud flows" className="reveal reveal-4 mt-16">
          <ul>
            {FLOWS.map((flow) => (
              <li key={flow.href}>
                <a href={flow.href} className="flow-card group">
                  <div className="flex items-baseline gap-5">
                    <span
                      className="font-mono text-sm text-[var(--gold-soft)]"
                      aria-hidden="true"
                    >
                      {flow.n}
                    </span>
                    <div>
                      <span className="flow-title display block text-2xl">
                        {flow.title}
                      </span>
                      <span className="mt-1 block text-base leading-7 text-[var(--paper-dim)]">
                        {flow.line}
                      </span>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="reveal reveal-5 mt-20 border-t hairline pt-6 text-sm leading-6 text-[var(--paper-dim)]">
          <p>
            Grounded in the Perfect Corp YouCam Skin Analysis API, the full EU
            CosIng inventory of 33,116 ingredients, and the EU fragrance
            allergen list. Cosmetic language only, honest uncertainty always,
            nothing stored.
          </p>
          <div className="mt-4 flex gap-5">
            <a
              href="/accessibility"
              className="inline-block underline decoration-[var(--gold)] underline-offset-4"
            >
              Accessibility statement
            </a>
            <a
              href="/privacy"
              className="inline-block underline decoration-[var(--gold)] underline-offset-4"
            >
              Privacy
            </a>
          </div>
        </footer>

        <LiveRegion message="Aloud. A voice-first skincare assistant. Four flows: talk, scan a product, know your skin, verify your look." />
      </main>
    </div>
  );
}
