import Link from "next/link";
import { FlowHeader } from "@/components/FlowHeader";

export const metadata = {
  title: "Accessibility · Aloud",
  description: "Aloud's accessibility commitment, features, and how to report a barrier.",
};

export default function AccessibilityPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <FlowHeader />
      <h1 className="display text-4xl">Accessibility</h1>

      <p className="text-lg leading-8 text-[var(--paper)]">
        Accessibility is not a feature of Aloud. It is the point of Aloud. Every
        core flow is built to work with the screen off, operated by sound and
        voice.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="display text-2xl">What we target</h2>
        <p className="leading-8 text-[var(--paper-dim)]">
          WCAG 2.1 Level AA. Every page is checked against the WCAG 2.1 A and AA
          rule sets on every commit, and the build fails on a serious or
          critical violation. Colors meet AA contrast, focus is always visible,
          motion respects the reduced-motion setting, and controls are keyboard
          operable and labelled.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="display text-2xl">How it works without sight</h2>
        <ul className="flex list-disc flex-col gap-2 pl-6 leading-8 text-[var(--paper-dim)]">
          <li>Status and results are announced through ARIA live regions and spoken aloud.</li>
          <li>The selfie is framed by sound alone: tones speed up as the face centers, with a lighting gate and auto-capture.</li>
          <li>The barcode is found by intensifying beeps, with manual entry as an equal path.</li>
          <li>Voice is a full conversation, with a push-to-talk fallback for networks that block it.</li>
          <li>Every spoken reply is mirrored as on-screen text.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="display text-2xl">Honest by design</h2>
        <p className="leading-8 text-[var(--paper-dim)]">
          A person who cannot see the screen cannot catch a confident wrong
          answer, so Aloud states uncertainty in plain words, refuses low
          confidence readings, and, on deeper skin tones or in low light where
          analysis is known to be less reliable, lowers its confidence and says
          so. It describes appearance only, never diagnoses, and makes no
          medical or treatment claim.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="display text-2xl">Your data</h2>
        <p className="leading-8 text-[var(--paper-dim)]">
          Nothing is stored on a server. Photos are processed for the session
          only and are not saved. Aloud does not infer or output race,
          ethnicity, or health conditions, and does not tie any face or skin
          data to a name or email.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="display text-2xl">Report a barrier</h2>
        <p className="leading-8 text-[var(--paper-dim)]">
          If any part of Aloud does not work for you, that is a bug we want to
          fix. Open an issue at{" "}
          <a
            href="https://github.com/StephenSook/aloud/issues"
            className="underline decoration-[var(--gold)] underline-offset-4"
          >
            github.com/StephenSook/aloud/issues
          </a>
          .
        </p>
      </section>

      <Link href="/" className="btn-ghost self-start">
        Back to Aloud
      </Link>
    </main>
  );
}
