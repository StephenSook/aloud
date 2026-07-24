# Architecture Decision Records

The three decisions that shaped Aloud, in MADR-lite form. Each records the
forces at the time, the alternatives with specific rejection reasons, and the
consequences we accepted.

| ADR | Decision |
|---|---|
| [ADR-0001](ADR-0001-single-nextjs-app-as-secret-holding-proxy.md) | One Next.js app; Route Handlers as the secret-holding proxy; no database |
| [ADR-0002](ADR-0002-cloud-voice-webrtc-primary-http-fallback.md) | OpenAI Realtime over WebRTC primary, HTTP push-to-talk fallback, never browser Web Speech STT |
| [ADR-0003](ADR-0003-scores-grounded-speech-and-fail-closed-honesty.md) | Scores-grounded speech, a CI claim linter, and fail-closed honesty |

**When to write an ADR here:** a decision earns one when it forecloses a real
alternative (something a reasonable engineer would otherwise reach for) and
reversing it later would be expensive. Routine library picks do not qualify.
