<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Aloud: build rules

Voice-first, accessibility-first skincare assistant for blind and low-vision users. YouCam Skin Analysis + Open Beauty Facts + CosIng, agent tool loop, cloud voice. Face-scoped only, no VTO.

## Hard rules

1. Cosmetic claims only, never medical. Enforced by `npm run guardrail` (scans string literals in `lib/`, `app/`, `components/` against `data/banned-claims.json`). CI-blocking.
2. Ground every skin statement in the API's structured `ui_score`. Never free-form vision on the face. Honest uncertainty in plain language.
3. Secrets are server-side only (Route Handlers). The browser gets at most a short-lived ephemeral voice token.
4. No identity inference, no persistence of skin data, consent before capture.
5. Every core flow works with the screen off (ARIA live regions, managed focus, keyboard operable). Test with VoiceOver on a real iPhone.
6. Every judged number comes from `docs/FACTS.md`; every integration claim needs a Wired: yes row there.
7. MediaPipe and html5-qrcode are client-only: `"use client"` + dynamic import, WASM preloaded on the intro screen.
8. getUserMedia and audio start inside a user tap. Request the camera stream once, reuse across views.

## Commands

- `npm run dev` / `npm run build` / `npm run start`
- `npx tsc --noEmit` typecheck
- `npm run lint` eslint
- `npm run guardrail` claim linter
- `npm run test` unit (vitest)
- `npm run test:e2e` Playwright (builds first in CI)

Commit style: conventional commits, subject <=100 chars, one logical change per commit, push after every commit.
