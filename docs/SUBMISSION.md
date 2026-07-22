# Devpost submission draft (Aloud)

Every number here traces to docs/FACTS.md and every named integration to the
wired-ledger. Draft for the form fields; final copy gets an em-dash and
AI-tone sweep before paste. Not yet submitted.

## Tagline (one line)

Beauty, aloud. The first beauty AI a blind shopper can use alone, screen off.

## Elevator pitch (~200 chars)

A voice-first skincare assistant for blind and low-vision shoppers. Scan a
product and hear its ingredients, capture a selfie by sound alone and hear an
honest read of your skin, all built on the YouCam Skin Analysis API.

## The story (description field)

### The problem, in retail terms

Skincare commerce is built on pictures. Product images, ingredient panels, and
shade swatches are frequently unavailable to a screen reader, so a blind
shopper cannot independently learn what a product is, what is in it, or whether
it suits them. This is not a niche annoyance. It is litigated: beauty retailers
have been sued specifically over inaccessible e-commerce (Sephora 2017, Fenty
Beauty 2019, Ulta 2019), 5,114 ADA digital-accessibility suits were filed in
2025 with retail the top-targeted industry, and the European Accessibility Act
became enforceable in June 2025 with e-commerce in scope. 8.5 million Americans
are blind or have serious difficulty seeing (2024 ACS), and iOS is 70.6 percent
of screen-reader users, so this belongs in a mobile browser.

Perfect Corp reports its beauty AI powers 800-plus brands, serves 300 million
API calls a day, and lifts sales conversion 2.5x through try-before-you-buy.
None of that value was reachable without sight. Perfect Corp's own site carries
no accessibility statement, VPAT, or screen-reader documentation. Aloud closes
that gap.

### What it does (four flows, all operable with the screen off)

- **Talk:** a live voice conversation over WebRTC. Ask about any ingredient,
  allergen, or barcode; the assistant calls real tools and speaks a grounded
  answer. Every reply is mirrored as text.
- **Scan:** beep-guided barcode finding, then a layered spoken read: product
  identity, EU-flagged fragrance-allergen status in what-the-label-lists
  language, marquee-ingredient functions, the full list on request.
- **Know your skin:** a selfie framed by sound alone (tonal guidance, a
  lighting gate, auto-capture on steadiness), then a spoken read grounded only
  in the YouCam Skin Analysis structured scores, with honest uncertainty.
- **Verify your look:** after makeup, the same capture compares against the
  session's bare-skin scores and speaks what changed.

### How we used the YouCam API (Technological Implementation)

Aloud is built on the Perfect Corp YouCam AI Skin Analysis API, wired
end-to-end, not wrapped. A server-side route registers the image
(`POST /s2s/v2.0/file/skin-analysis`), uploads the bytes to the presigned URL,
creates the task (`POST /s2s/v2.0/task/skin-analysis`, SD concerns,
`format: json`), and the client polls the result through a thin proxy. The
Bearer key never leaves the server. Response shapes and the stringified error
tuples are pinned by fixtures captured from real API runs. Every spoken skin
statement traces to a `ui_score`; the face image is never sent to a general
vision model to freely describe it.

Around that core runs an agentic tool loop (Vercel AI SDK) whose tools reach
the full EU CosIng inventory of 33,116 active ingredients, the EU
fragrance-allergen list from Regulation 2023/1545, and Open Beauty Facts, plus
a WebRTC voice layer over the OpenAI Realtime API. Aloud also speaks Perfect
Corp's own language: the skin analysis can be routed through Perfect Corp's
native YouCam MCP server, the sponsor's 2026 agentic surface, and returns the
same real scores. On a real iPhone the non-visual capture passed its kill
experiment: 10 of 10 attempts accepted by the analysis, every one under 30
seconds.

### Why it is safe (and why that matters for retail)

A blind user cannot catch a confident wrong answer, so honesty is engineered,
not hoped for. A claim linter runs in CI and blocks any medical or treatment
language from ever being spoken; the app uses cosmetic and appearance language
only, states uncertainty in plain words, communicates input quality without
blaming the user, and stores nothing. That discipline is exactly what a beauty
retailer needs to deploy skin AI without regulatory exposure.

### Impact

A documented, underserved population; a documented, litigated retail barrier;
and a solution that turns a compliance liability into a new customer segment.
For the shopper, it is independence: completing the decision alone.

## Built with

Next.js, TypeScript, Vercel, Perfect Corp YouCam AI Skin Analysis API, Perfect
Corp native YouCam MCP server, OpenAI Realtime API, Vercel AI SDK, MediaPipe
Tasks Vision, html5-qrcode, EU CosIng, EU fragrance-allergen list (Reg
2023/1545), Open Beauty Facts.

## Try it out

- Live app: https://aloudbeauty.vercel.app
- Code: https://github.com/StephenSook/aloud

## Judging-criteria map (internal, not pasted)

- **Technological Implementation (first tiebreak, over-optimized):** YouCam
  pipeline wired server-side with fixture-pinned shapes; agentic tool loop;
  WebRTC voice; CI claim linter. Every integration in the wired-ledger with a
  file reference. No wrappers.
- **Design:** a complete, coherent product with four flows, one identity, and
  accessibility as the design itself (screen-off operation, ARIA live regions,
  managed focus, AA contrast).
- **Potential Impact:** named population + litigated barrier + retail case in
  the sponsor's own metrics.
- **Quality of the Idea:** an uncontested lane (no shipped beauty/skin AI is
  screen-reader accessible) with a concrete shouldn't-be-possible moment.

## Pre-submit checklist (from the playbook)

- [ ] Real demo user (validator or builder screen-off) in the video
- [ ] Video: FACTS-audited narration, captions burned, -14 to -16 LUFS,
      duration <=3:00, public on YouTube, oembed 200
- [ ] Screenshots attached
- [ ] Repo public, gitleaks clean, license present
- [ ] Every "Built with" item confirmed present in shipped code (grep audit)
- [ ] Em-dash and AI-tone sweep on all pasted copy
- [ ] Submission ID / status / URL verified after submit
