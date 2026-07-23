import Link from "next/link";
import { FlowHeader } from "@/components/FlowHeader";

export const metadata = {
  title: "Privacy | Aloud",
  description:
    "Aloud stores nothing about you, ties nothing to your identity, and keeps every key server-side.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <FlowHeader />
      <h1 className="display text-4xl">Privacy</h1>

      <p className="text-lg leading-8 text-[var(--paper)]">
        The short version: Aloud has no accounts and no database. Your face and
        voice are used only to answer the request you make, in the moment, and
        are never stored by us or tied to your name, email, or any identity.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Your camera and microphone</h2>
        <p className="text-base leading-7 text-[var(--paper-dim)]">
          When you capture a selfie, the photo is sent to Perfect Corp&apos;s
          YouCam Skin Analysis service to return the appearance scores you hear,
          then it is gone. When you talk with Aloud, your microphone audio is
          used only to understand what you said for that turn. We do not save
          your photos or recordings on any server, and the analysis providers
          are not permitted to train on them.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">What stays on your device</h2>
        <p className="text-base leading-7 text-[var(--paper-dim)]">
          Your scan history and the products you looked at this session live in
          your own browser storage on your device. They never go to a server for
          keeping, and clearing your browser data removes them.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Who processes your requests</h2>
        <p className="text-base leading-7 text-[var(--paper-dim)]">
          To answer you, Aloud sends the minimum needed to the services that do
          the work: Perfect Corp YouCam (skin and skin-tone analysis), OpenAI
          (the voice conversation, the shopping assistant, and reading a label
          from a photo), Deepgram and ElevenLabs (a fallback voice path), and
          Open Beauty Facts (product and ingredient lookup by barcode). Each
          processes the request under its own policy. Ingredient meanings come
          from the public EU CosIng inventory and the EU fragrance-allergen
          list, bundled into the app.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">What we never do</h2>
        <p className="text-base leading-7 text-[var(--paper-dim)]">
          We do not build a biometric profile of your face. We do not infer or
          output your race, ethnicity, health, or age beyond the service&apos;s
          own neutral appearance scores. We do not tie skin or face data to a
          name or email. We do not sell your data, and there are no ads and no
          trackers.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="display text-2xl">Contact</h2>
        <p className="text-base leading-7 text-[var(--paper-dim)]">
          Questions about privacy? Email{" "}
          <a
            href="mailto:stephensookra@gmail.com"
            className="underline decoration-[var(--gold)] underline-offset-4"
          >
            stephensookra@gmail.com
          </a>
          .
        </p>
      </section>

      <Link
        href="/accessibility"
        className="mt-2 inline-block underline decoration-[var(--gold)] underline-offset-4"
      >
        Accessibility statement
      </Link>
    </main>
  );
}
