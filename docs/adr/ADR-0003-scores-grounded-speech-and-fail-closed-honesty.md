# ADR-0003: Scores-grounded speech, a CI claim linter, and fail-closed honesty

- **Status:** Accepted
- **Date:** 2026-07-18 (fail-closed tone caveat tightened 2026-07-24)
- **Author:** Stephen Sookra

## Context

A blind user cannot catch a confident wrong answer about their own face. Two
legal lines also bind every sentence: "treats acne" is a drug claim (acne is
a disease), and inferring identity from a face is off-limits. The easiest
implementation (send the selfie to a general vision model and let it
describe the skin) produces fluent, unverifiable, occasionally medical
prose: the exact failure mode this product exists to avoid.

## Decision

Three layers, all mechanical rather than aspirational:

1. **Grounding:** every spoken skin statement is composed from the YouCam
   analysis's structured `ui_score` outputs (`lib/skin-read.ts`,
   `lib/look-verify.ts`). The face image is never sent to a general vision
   model to describe freely.
2. **Claim linter in CI:** `npm run guardrail` scans every user-facing
   string literal against a banned-claims lexicon (drug/medical/diagnosis
   and identity language) and blocks the merge on a hit.
3. **Fail-closed honesty:** Skin Tone Analysis runs in parallel and converts
   the returned color to ITA, a neutral color metric, never identity. On
   deep tones or poor light (where dermatology documents reduced reliability
   of readings like redness) the read lowers its confidence out loud. If the
   calibration itself fails, the read says the check did not happen and
   treats the numbers as approximate, rather than defaulting to its most
   confident voice.

## Alternatives considered

- **General vision-model description of the face.** Rejected: unverifiable
  free text, medical-claim risk in every generation, and identity-inference
  risk. (A vision model IS used for product LABELS, `app/api/label`, where
  the ground truth is printed text, not a person.)
- **Prompt-level "please avoid medical claims" only.** Rejected: a prompt is
  a request, not a gate. The linter is enforcement; prompts remain as
  defense-in-depth in the agent and routine builders.
- **Skipping tone calibration (treat all skin identically).** Rejected: the
  published reliability gap on deeper skin tones is real, and silence about
  it ships maximum confidence to exactly the users measured least reliably.
- **Failing OPEN when tone calibration errors** (the original behavior).
  Rejected in the 2026-07-24 review: a best-effort feature that vanishes on
  failure hands its protected users the most confident read. It now speaks
  an approximate-numbers caveat instead.

## Consequences

- Positive: honesty is testable. Unit tests assert composed reads never
  match the banned lexicon; CI fails on a violation before a human hears it.
- Positive: as far as we can find, the first consumer skin tool that
  discloses its own accuracy bias to the person it affects most, at the
  moment it affects them.
- Negative: spoken reads are templated rather than freely generative, so
  they trade flourish for verifiability. Chosen deliberately.

## References

- `lib/skin-read.ts`, `lib/skin-tone.ts`, `scripts/guardrail-lint.ts`,
  `data/banned-claims.json`, `docs/GUARDRAILS.md`.
