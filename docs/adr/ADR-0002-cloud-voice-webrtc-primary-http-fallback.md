# ADR-0002: Cloud voice: OpenAI Realtime over WebRTC, HTTP push-to-talk fallback, never browser Web Speech STT

- **Status:** Accepted
- **Date:** 2026-07-18
- **Author:** Stephen Sookra

## Context

The primary user holds an iPhone: iOS is 70.6 percent of screen-reader users
(WebAIM Screen Reader Survey 10). Voice is the product's main input and
output, so speech recognition that does not work on iOS Safari is not a
degraded experience, it is no product. Latency matters: a conversation with
multi-second turn gaps is unusable by ear.

## Decision

Primary voice is the OpenAI Realtime API over WebRTC: one peer connection
carries mic audio in, synthesized speech out, and a data channel for tool
calls, with the browser holding only a short-lived ephemeral token minted by
`/api/voice/token`. A turn-based fallback (`components/PushToTalk.tsx`) runs
over plain HTTPS: Deepgram nova-3 transcribes, the agent answers, ElevenLabs
speaks. Browser `speechSynthesis` is used only as a last-resort output
channel (`speakCue`), and browser speech RECOGNITION is never used.

## Alternatives considered

- **Web Speech API recognition (`SpeechRecognition`).** Rejected on a
  hard fact: it is unimplemented in iOS WebKit, which is where 70.6 percent
  of screen-reader users live. Building the main input on it would ship a
  voice app that cannot hear its primary audience.
- **WebSocket streaming STT + separate TTS as primary.** Rejected as
  primary: two sockets and hand-rolled barge-in/turn logic to approximate
  what Realtime's single WebRTC session already does with lower audio
  latency. It survives as the shape of the fallback, where turn-based is
  acceptable.
- **Realtime only, no fallback.** Rejected: some networks (corporate, some
  cellular NATs) block WebRTC. A blind user on such a network would lose the
  entire Talk flow; the HTTP fallback keeps a voice path alive anywhere
  HTTPS works.
- **Raw API key in the browser for Realtime.** Rejected: the ephemeral-token
  mint keeps the long-lived key server-side (ADR-0001) at the cost of one
  extra round trip at session start.

## Consequences

- Positive: sub-second conversational turns on the primary path; a voice
  path that works on iOS Safari, the platform that decides this product's
  fate.
- Positive: tool calls ride the same connection, so spoken answers stay
  grounded in the app's own CosIng/allergen/product tools.
- Negative: two voice stacks to maintain; the fallback needs its own
  failure-mode discipline (release-during-permission, TTS failure, dropped
  lines), which the 2026-07-24 hardening pass locked in.

## References

- `components/VoiceSession.tsx`, `components/PushToTalk.tsx`,
  `app/api/voice/*`, WebAIM Screen Reader Survey 10.
