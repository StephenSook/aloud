import { LiveRegion } from "@/components/LiveRegion";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-6 py-24 text-center">
        <h1 className="text-5xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Aloud
        </h1>
        <p className="text-xl leading-8 text-zinc-700 dark:text-zinc-300">
          Beauty, aloud. A voice-first skincare assistant for blind and
          low-vision shoppers. Scan a product and hear what is in it. Capture a
          selfie without sight and hear an honest read of your skin. All with
          the screen off.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            href="/talk"
            className="rounded-full bg-black px-8 py-4 text-lg font-medium text-white dark:bg-white dark:text-black"
          >
            Talk with Aloud
          </a>
          <a
            href="/scan"
            className="rounded-full border border-zinc-400 px-8 py-4 text-lg font-medium"
          >
            Scan a product
          </a>
          <a
            href="/capture"
            className="rounded-full border border-zinc-400 px-8 py-4 text-lg font-medium"
          >
            Guided skin capture
          </a>
        </div>
        <LiveRegion message="Aloud. A voice-first skincare assistant. In active development." />
      </main>
    </div>
  );
}
