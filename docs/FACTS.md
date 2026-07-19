# FACTS.md, the single source of truth for every judged number

Every number or named claim that appears in the README, the Devpost description, or the demo video narration MUST come from this file, and every entry here must be source-linked and code-audited. If it is not here, it does not get said.

## Population and problem (verified primary sources)

| Fact | Value | Source |
|---|---|---|
| US adults blind or serious difficulty seeing | 8,537,000 | 2024 American Community Survey |
| US adults "a lot of trouble" seeing | 3.8M (420,000 cannot see at all) | 2024 NHIS |
| Screen-reader users on iOS | 70.6% (Android 27.6%) | WebAIM Screen Reader Survey 10 |
| Beauty retailers sued over inaccessible e-commerce | Sephora 2017, Fenty Beauty 2019, Ulta 2019 | Court records (SDNY 1:17-cv-00834 et al.) |
| ADA digital-accessibility suits in 2025 | 5,114 (retail the top target) | UsableNet Year-End 2025 |
| European Accessibility Act enforceable | June 28, 2025, e-commerce in scope | EU directive |

## Sponsor anchor (Perfect Corp's own published figures)

| Fact | Value | Source |
|---|---|---|
| Brand partners | 800+ | Perfect Corp / Business Wire |
| API calls per day | 300M | AWS case study |
| Sales conversion lift from virtual try-on | 2.5x reported | Perfect Corp AI trends report via Retail Dive, Oct 2025 |
| Returns decrease from VTO | 8% reported | RetailTechInsights, Alice Chang interview |
| Accessibility/VPAT/screen-reader documentation | None found | Perfect Corp site audit, July 2026 |

Company-reported figures are cited as "Perfect Corp reports", never as independent facts.

## Never use (untraceable)

"$675B disability market", "$8T accessible beauty", the 52% / 95.1% beauty-inaccessibility stats.

## API facts (verify-on-own-account items)

| Item | Status | Value |
|---|---|---|
| SD skin task cost, 1-4 concerns | VERIFIED (docs) | 9 units |
| SD skin task cost, 5-7 concerns | VERIFIED (docs) | 12 units |
| skin_type response JSON shape | **VERIFIED live 2026-07-18** | Per-region entries `{type:"skin_type", region:"whole"\|"t_zone"\|"u_zone", skin_type:"Oily"\|"Normal"\|..., mask_urls[]}`; the guessed `class`/`ui_class` fields DO NOT EXIST. Fixture: `tests/fixtures/youcam/skin-type-success.json` |
| format=json extras | **VERIFIED live 2026-07-18** | `output[]` also carries `{type:"all", score}`, `{type:"skin_age", score}`, and a `resize_image` entry with the resized source; `all.score` came back 0 on our runs, so narrate per-concern ui_scores only |
| Error payload shape | **VERIFIED live 2026-07-18** | `task_status:"error"`, `error` is a stringified tuple `"('message', 'error_code')"`; failed tasks consume 0 units. Fixture: `tests/fixtures/youcam/error-face-too-small.json` |
| Face-size rule | **VERIFIED live 2026-07-18** | 896px-wide image with face ~54% of width rejected `error_src_face_too_small`; ~77% accepted. Capture UI targets face >=65% of frame width |
| HD tier costs (feature-cost endpoint) | **RESOLVED: build SD-only** | This account's feature-cost table lists NO skin-analysis SKUs (20 SKUs, all hair/photo tools); HD pricing unpublished anywhere. We ship SD only, so no HD claim ever appears |
| Auth | **VERIFIED live 2026-07-18** | `Authorization: Bearer <API key>` works on v2.0 (secret key not needed for calls) |
| Hackathon unit grant | VERIFIED | 1,000 units, 90-day validity from redemption; ~18 units spent on verification runs |

## Product set (Open Beauty Facts coverage)

PENDING: `scripts/check-obf.ts` output table goes here once Stephen's real product barcodes are gathered.

## Wired integrations (claim-parity ledger, updated as built)

| Claim | Wired? | Evidence (import/call in shipped code) |
|---|---|---|
| YouCam AI Skin Analysis API | **YES** | `lib/youcam.ts` (register/PUT/task/poll) via `app/api/skin`; live production run 2026-07-19: task on aloudbeauty.vercel.app returned redness 75 / oiliness 70 / texture 77 / moisture 69 (synthetic verification face, dev only) |
| MediaPipe face detection | **YES** | `components/CameraCapture.tsx` (FaceDetector VIDEO mode, blaze_face_short_range) |
| Non-visual audio guidance | **YES** | `lib/capture-guidance.ts` + `lib/audio-cues.ts` (tonal hot/cold + spoken cues + steadiness hold + lighting gate) |
| Open Beauty Facts | **YES** | `lib/openbeautyfacts.ts` via `/api/product/[barcode]`; live production read verified 2026-07-19 (real product, 11 EU allergens flagged; designed miss fallback) |
| EU CosIng table | **YES** | `data/cosing.json` (33,116 Active ingredients from the official EU search API) + `lib/cosing.ts` lookup/descriptions |
| EU fragrance-allergen list | **YES** | `data/allergens.json` (91 INCI names, Reg 2023/1545 annex + legacy list) + `lib/allergens.ts` |
| Agent tool loop (AI SDK) | **YES** | `app/api/agent/route.ts` (gpt-5-mini, tools: ingredientInfo / allergenCheck / productLookup); grounded claim-clean answer verified live on production 2026-07-19 |
| OpenAI Realtime voice token | **YES** | `app/api/voice/token/route.ts` mints gpt-realtime-mini ephemeral secrets; HTTP 200 verified live on production. Full WebRTC voice session UI: not yet (Week 2 scope) |
| html5-qrcode | **YES** | `components/BarcodeScanner.tsx` via `/scan` (on-device decode pass pending Stephen's iPhone run) |

Nothing gets claimed on a judged surface until its row says Wired: yes with a real file reference.
