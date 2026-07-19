# Guardrails

These are hard rules, not suggestions. Every spoken line and every screen the app produces has to pass them. When in doubt, say less. The claim rules are enforced by `scripts/guardrail-lint.ts` in CI.

## 1. Claims: cosmetic only, never medical

A product becomes a regulated drug the moment its stated use is to diagnose, treat, cure, mitigate, or prevent a disease, or to affect the structure or function of the body. Acne is a disease and its active ingredients are OTC drugs, so "treats acne" is a drug claim. The safe path is to make no efficacy claim at all and describe only appearance and the product's own labeled function. The FTC separately requires strong scientific substantiation for any health claim, including implied claims and testimonials. Condition monitoring over time is a device claim; Aloud never frames a re-scan as tracking a condition.

### Product matching language

| Safe (cosmetic) | Unsafe (drug / treatment) |
|---|---|
| "helps with the look of shine" / "oil-free finish" | "treats oily skin" / "controls sebum" |
| "for the appearance of blemish-prone skin" | "clears acne" / "treats breakouts" |
| "described as hydrating / for the look of dryness" | "repairs the skin barrier" / "cures dryness" |
| "helps skin look more even" | "corrects hyperpigmentation" / "treats melasma" |
| "reduces the look of fine lines" | "reverses aging" / "stimulates collagen" |
| "listed as niacinamide, a skin-conditioning ingredient" | "niacinamide treats your rosacea" |
| "for the look of redness" | "reduces inflammation" / "treats rosacea" |

### Skin-state read language

| Safe (observation) | Unsafe (diagnosis) |
|---|---|
| "your skin looks like it has some redness in the cheek area" | "you have rosacea" |
| "the analysis shows a higher oiliness score in the T-zone" | "you have seborrheic dermatitis" |
| "there appear to be some blemishes along the jaw" | "you have acne" |
| "the analysis flags some dark spots" | "you have melasma" |

### Referral rule

Recommending a dermatologist is protective ONLY when it is generic and not tied to a named condition. Safe: "if you are concerned about a specific skin condition, a dermatologist can help." Unsafe: "you have acne, see a dermatologist," because the first clause is a diagnosis.

### Allergen phrasing

Say what the label lists, not what is safe for the person. Safe: "this product does not list any EU-flagged fragrance allergens." Unsafe: "this is safe for your allergy." Flag "contains a listed fragrance allergen" by matching ingredient names against the EU list (about 80 substances under Regulation 2023/1545). Absence of a labeled allergen is not proof of a fragrance-free formula.

### Accuracy and inclusivity claims

Never claim a percentage accuracy, "unbiased," or "works for every skin tone." Published dermatology literature shows lighting-driven under-detection concentrates on deeper skin tones; Aloud discloses reduced reliability honestly ("the light is low, readings are less reliable") instead of claiming universality.

## 2. Honesty and reliability (a blind user cannot verify a wrong answer)

Blind users overtrust confident AI descriptions and cannot catch a wrong one. Required mitigations:

1. Ground every skin statement in the structured Skin Analysis scores. Never send the face image to a general vision model to freely describe it.
2. Use negative-framed uncertainty: state the chance of error, not just the answer.
3. Refuse low-confidence claims. Below threshold, say "I cannot tell reliably."
4. Always offer a human-assist escape hatch.
5. Communicate input quality ("the photo was too dark, let us retake"), never blame the user.
6. Express confidence in plain language, never raw percentages.

## 3. Accessibility (the product must work with the screen off)

1. Audio and haptic first. Every core flow operable without seeing the screen.
2. Correct semantics: ARIA live regions for status, managed focus, keyboard operable, labelled controls.
3. Test with an actual screen reader (VoiceOver, TalkBack) on a real device, and with a real blind or low-vision user when possible.
4. Responsive, visible focus, reduced motion respected.

## 4. Data and privacy

1. Never tie a face image or skin data to a name or email. No biometric profiles.
2. No identity inference: race, ethnicity, health conditions, age beyond the API's own neutral skin_age.
3. Nothing persisted server-side. Session state only; optional scan history stays in localStorage.
4. Do not train anything on YouCam outputs; the API terms forbid it.
5. Secrets never reach the browser. Consent screen before any capture.

## 5. Statistics discipline

Only load-bearing, primary-sourced numbers in judge-facing or user-facing material; the canonical list lives in `docs/FACTS.md`. Never use untraceable figures.
