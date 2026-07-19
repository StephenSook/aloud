# Demo video script (draft, 1-3 min cap; judges may stop at 3:00)

Rules baked in: no fiction, no synthetic data on screen, every number traces to
docs/FACTS.md, real device footage is the primary evidence, captions burned in,
VoiceOver/app audio audible. Bracketed beats need real footage before this is
final. Narration NEVER claims what the parity ledger has not verified.

## Beat sheet (target 2:30)

**0:00-0:15 — The problem, in the person's own hands. [REAL-USER FOOTAGE]**
Open on the real user (validator, or Stephen screen-off) holding two skincare
bottles. VoiceOver tries a beauty site; it reads "image, image, unlabeled
button."
NARRATION: "Skincare shopping is built on pictures. For the 8.5 million
Americans who are blind or have serious difficulty seeing, the shelf and the
site go silent. Beauty retailers have been sued over exactly this: Sephora,
Fenty, Ulta."

**0:15-0:25 — The claim.**
Home screen: "Aloud. Beauty, aloud."
NARRATION: "Aloud is a voice-first skincare assistant a blind person can use
alone, with the screen off. It is built on the Perfect Corp YouCam Skin
Analysis API."

**0:25-0:55 — Scan and hear. [REAL DEVICE FOOTAGE, /scan]**
Real product, beep-guided find, decode chime. The app speaks (audible, real):
identity, the EU allergen line, glycerin's listed function. User asks a
follow-up out loud on /talk: "what does niacinamide do?" and the answer comes
back grounded.
NARRATION (over): "Barcode to spoken label in seconds. Ingredient functions
from the full EU CosIng inventory, thirty-three thousand ingredients, and the
EU fragrance-allergen list, checked on device by voice."

**0:55-1:30 — Know your skin, screen off. [REAL DEVICE FOOTAGE, /capture]**
The unstaged capture: eyes closed or screen off, beeps speeding up, auto-
capture chime, then the spoken read with the honest-uncertainty close.
NARRATION: "No sighted framing needed. Audio guidance centers the face, a
lighting gate protects the reading, and every spoken word is grounded in the
API's structured scores. When Aloud is not sure, it says so."

**1:30-2:00 — Verify the look. [REAL DEVICE FOOTAGE, /verify]**
Makeup applied, second capture, the delta read aloud: "skin texture looks
smoother, from A to B."
NARRATION: "After makeup, Aloud compares against your bare-skin capture and
speaks what changed. Scores, not judgment. It will say when light may be the
reason."

**2:00-2:20 — The engineering beat. [SCREEN CAPTURE]**
README architecture section + FACTS.md parity ledger scroll + CI green.
NARRATION: "Under it: the four-step YouCam pipeline server-side, an agentic
tool loop, and a claim linter in CI that blocks any medical language from ever
being spoken. Every integration we name is wired and verified on production."

**2:20-2:40 — Close on the retail case + independence. [REAL-USER FOOTAGE]**
The user finishes the decision alone, product in hand.
NARRATION: "Perfect Corp's beauty AI powers 800-plus brands and reports a
2.5x conversion lift, and none of it could be used without sight until now.
This is the first beauty AI a blind shopper can use alone. That is a new
customer, a smaller lawsuit surface, and for [NAME with consent / 'her'], it
is just shopping."
[If the validator gave an on-camera line with per-surface consent, it goes
here instead of narration.]

## Production checklist (from the playbook, blocking)

- [ ] Narration numbers diffed against docs/FACTS.md BEFORE render
- [ ] Real device footage for /scan, /capture, /verify, /talk; no staged fakes
- [ ] Captions burned in; VoiceOver and app audio audible in the mix
- [ ] Loudness -14 to -16 LUFS (ebur128), duration <=3:00, resolution verified
- [ ] Music generated (kie-ai), no copyrighted tracks; minimal third-party
      trademark exposure on scanned products (tight framing)
- [ ] Uploaded public on YouTube; oembed returns 200; link on the Devpost form
