"use client";

/**
 * Non-visual capture audio: proximity beeps (hot/cold) plus throttled spoken
 * cues via SpeechSynthesis (output-only fallback; screen readers also get the
 * text through the ARIA live region).
 *
 * Everything starts inside a user gesture: iOS blocks audio otherwise.
 *
 * ONE shared AudioContext for the whole app. iOS Safari caps the number of
 * AudioContexts (about four) and creating a fresh one per beeper/earcon
 * exhausts that limit; a single reused, resumed context avoids it.
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  try {
    if (!sharedCtx || sharedCtx.state === "closed") sharedCtx = new AudioContext();
    void sharedCtx.resume();
    return sharedCtx;
  } catch {
    return null;
  }
}

export class Beeper {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private proximity = 0;
  private running = false;
  private pan = 0;
  private verticalHz = 0;

  /** Call from a tap handler. */
  start() {
    if (!getCtx()) return;
    this.running = true;
    this.schedule();
  }

  setProximity(p: number) {
    this.proximity = Math.max(0, Math.min(1, p));
  }

  /**
   * Stereo pan for directional framing: the beep comes from the side the face
   * sits on (-1 fully left, +1 fully right), so you move the phone toward the
   * sound to centre it, eyes closed.
   */
  setPan(pan: number) {
    this.pan = Math.max(-1, Math.min(1, pan));
  }

  /**
   * Vertical framing as pitch: a face above centre raises the beep, below
   * lowers it. `cy` is the face's vertical offset (-0.5..0.5, negative = high).
   */
  setVertical(cy: number) {
    this.verticalHz = Math.max(-0.5, Math.min(0.5, -cy)) * 380;
  }

  private schedule() {
    if (!this.running) return;
    const interval = 800 - this.proximity * 650; // 800ms cold -> 150ms hot
    this.timer = setTimeout(() => {
      this.beep(330 + this.proximity * 550 + this.verticalHz, 0.06);
      this.schedule();
    }, interval);
  }

  private beep(freq: number, duration: number, pan = this.pan) {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = Math.max(120, freq);
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    // Pan the beep where supported (iOS Safari 14.5+); mono fallback otherwise.
    if (pan !== 0 && typeof ctx.createStereoPanner === "function") {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      osc.connect(gain).connect(panner).connect(ctx.destination);
    } else {
      osc.connect(gain).connect(ctx.destination);
    }
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  /** Rising two-tone chime on successful capture, centred. */
  success() {
    this.beep(660, 0.12, 0);
    setTimeout(() => this.beep(990, 0.2, 0), 130);
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

/**
 * One-shot earcons: short, distinct sounds that carry meaning without words,
 * so a screen-reader user hears the outcome before the sentence starts. They
 * reuse the single shared AudioContext, kept low and brief so they never fight
 * the spoken read.
 */
function tone(ctx: AudioContext, freq: number, start: number, duration: number, gainPeak = 0.12) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  const t = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(gainPeak, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function withContext(play: (ctx: AudioContext) => void) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    play(ctx);
  } catch {
    // audio unavailable is fine; the spoken read still conveys everything
  }
}

export const earcons = {
  /** Product found: a bright rising two-note. */
  found: () =>
    withContext((ctx) => {
      tone(ctx, 587, 0, 0.1);
      tone(ctx, 880, 0.1, 0.16);
    }),
  /** Allergen or caution: a soft doubled mid tone, a heads-up not an alarm. */
  warn: () =>
    withContext((ctx) => {
      tone(ctx, 392, 0, 0.12, 0.13);
      tone(ctx, 392, 0.18, 0.12, 0.13);
    }),
  /** Not found: a gentle descending pair. */
  miss: () =>
    withContext((ctx) => {
      tone(ctx, 523, 0, 0.12);
      tone(ctx, 392, 0.13, 0.18);
    }),
};

let lastSpoken = "";
let lastSpokenAt = 0;

/** Speak a cue aloud; repeats of the same cue are throttled to every 2.5s. */
export function speakCue(text: string, force = false) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const now = Date.now();
  if (!force && text === lastSpoken && now - lastSpokenAt < 2500) return;
  lastSpoken = text;
  lastSpokenAt = now;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1;
  window.speechSynthesis.speak(utterance);
}
