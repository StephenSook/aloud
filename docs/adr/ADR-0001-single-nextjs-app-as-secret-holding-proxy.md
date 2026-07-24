# ADR-0001: One Next.js app, Route Handlers as the secret-holding proxy, no database

- **Status:** Accepted
- **Date:** 2026-07-18
- **Author:** Stephen Sookra

## Context

Aloud calls four external paid APIs (Perfect Corp YouCam Skin Analysis and Skin
Tone, OpenAI, Deepgram, ElevenLabs) whose keys must never reach a browser, and
its camera and microphone features require a secure HTTPS context on a real
phone from day one. The product stores nothing about the user by design
(privacy is a feature for a face-scanning app aimed at people who cannot
visually audit what it is doing). The build window is a solo four-week
hackathon.

## Decision

Ship one Next.js App Router application. Server Route Handlers are the only
place secrets live and the only path to external APIs: the browser talks to
`/api/*`, never to a vendor. There is no database and no auth; session state
lives in React state and sessionStorage.

## Alternatives considered

- **Separate backend service (FastAPI/Express) + static frontend.** Rejected:
  two deploys, two CORS surfaces, and a second place for secrets to leak, in
  exchange for nothing this product needs. The YouCam pipeline is four HTTP
  calls and a poll; it does not need its own service.
- **Calling YouCam directly from the browser.** Rejected outright: the Bearer
  key would ship to every client, and Perfect Corp's terms require the key
  never be shared. Also blocked by CORS.
- **Adding a database for scan history / accounts.** Rejected: any server-side
  persistence of face-derived data turns a privacy feature into a liability
  and drags in auth, retention policy, and breach surface. localStorage scan
  history gives the returning-user affordance with zero server risk.
- **Long-running server task for the YouCam poll.** Rejected: serverless
  functions billed per-invocation should not sleep in a poll loop. The client
  polls a thin `/api/skin/[taskId]` proxy every 1.5s instead, so no function
  runs longer than one upstream call.

## Consequences

- Positive: one deploy, one HTTPS origin (camera and mic work), keys provably
  server-side (grep `process.env` finds four reads, all in Route Handlers).
- Positive: "nothing stored" is checkable from the code, not a promise.
- Negative: every vendor call pays one extra hop through Vercel.
- Neutral: native iOS/Android apps became Capacitor shells over the same
  deployed app, inheriting all of the above.

## References

- `app/api/*/route.ts`, `lib/youcam.ts`, ADR-0003 (why the proxy also
  enforces language safety).
