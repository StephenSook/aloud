# Aloud

**Beauty, aloud.** A voice-first skincare assistant that lets a blind or low-vision person shop for skincare and understand their own skin independently, with the screen off.

Built for the YouCam API Skin AI & Apparel VTO Hackathon (Skin AI topic).

## The problem

Skincare e-commerce is heavily visual. Product images, ingredient lists, and shade information are often unavailable to a screen reader, so a blind shopper cannot independently learn what a product is, what is in it, or whether it suits them. It is a documented, litigated barrier: beauty retailers have been sued specifically over inaccessible e-commerce (Sephora 2017, Fenty Beauty 2019, Ulta 2019). In the US, 8.5 million adults are blind or have serious difficulty seeing (2024 ACS). iOS is 70.6 percent of screen-reader users, so Aloud runs in a mobile browser.

## What it does

- **Reads and matches products.** Scan a barcode, hear the product and its ingredients read out loud, and get it matched to your stated needs in plain cosmetic language.
- **Reads your skin.** Capture a selfie with non-visual audio-guided framing, and hear an objective skin-state read grounded only in structured analysis scores from the YouCam AI Skin Analysis API, with honest uncertainty.
- **Verifies a makeup look.** After applying makeup, hear a description of coverage and evenness, scoped to honest uncertainty.

Everything is spoken, operable with no screen, and never makes a medical or treatment claim.

## Architecture

- **Next.js App Router + TypeScript on Vercel.** One app, one deploy, HTTPS everywhere (the camera and mic require it).
- **Server (Route Handlers):** proxy for the Perfect Corp **YouCam AI Skin Analysis API** (file register, presigned PUT, task create, poll) and Open Beauty Facts; agent tool loop (Vercel AI SDK); ephemeral token mint for realtime voice. All secrets stay server-side.
- **Browser:** MediaPipe face detection for audio-guided non-visual capture, html5-qrcode for barcode scanning, ARIA live regions and managed focus for screen-reader-native flows.
- **Voice:** OpenAI Realtime over WebRTC (works on iOS Safari), with a Deepgram + ElevenLabs fallback path.
- **Data:** bundled EU CosIng ingredient-function table and EU fragrance-allergen list. No database, no auth, nothing persisted server-side.

## Quickstart

Requires Node 18+ and a Perfect Corp YouCam API key.

```bash
git clone https://github.com/StephenSook/aloud.git
cd aloud
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

Camera and mic need a secure context: use `localhost` in dev, or a Vercel HTTPS URL on a phone.

## Environment variables (server-side only)

```
YOUCAM_API_KEY=        # Perfect Corp YouCam Bearer key
OPENAI_API_KEY=        # agent loop + Realtime voice
DEEPGRAM_API_KEY=      # optional fallback STT
ELEVENLABS_API_KEY=    # optional fallback TTS
```

## Guardrails

Every spoken line passes an automated claim linter (`npm run guardrail`): cosmetic and appearance language only, grounded in structured scores, honest uncertainty, no medical or treatment claims, no identity inference, no data persistence. See `docs/GUARDRAILS.md`.

## Status

In active development for the hackathon (deadline Aug 17, 2026). Build log in commit history.

## License

MIT. Ingredient data: EU CosIng (CC BY 4.0), Open Beauty Facts (ODbL, attribution).
