# Contributing

Aloud is a hackathon build (YouCam API Skin AI Hackathon, Aug 2026), so the
bar for merging during judging is high, but issues and PRs are welcome.

- Read `AGENTS.md` for the build rules; the hard ones (cosmetic language
  only, scores-grounded speech, secrets server-side, screen-off operability)
  are non-negotiable and CI-enforced.
- Before a PR: `npx tsc --noEmit && npm run lint && npm run guardrail && npm test -- --run`.
- Accessibility changes need a real screen-reader pass (VoiceOver or
  TalkBack), not just axe.
