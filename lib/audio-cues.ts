"use client";

/**
 * Non-visual capture audio: proximity beeps (hot/cold) plus throttled spoken
 * cues via SpeechSynthesis (output-only fallback; screen readers also get the
 * text through the ARIA live region).
 *
 * Everything starts inside a user gesture: iOS blocks audio otherwise.
 */

export class Beeper {
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private proximity = 0;
  private running = false;

  /** Call from a tap handler. */
  start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    void this.ctx.resume();
    this.running = true;
    this.schedule();
  }

  setProximity(p: number) {
    this.proximity = Math.max(0, Math.min(1, p));
  }

  private schedule() {
    if (!this.running) return;
    const interval = 800 - this.proximity * 650; // 800ms cold -> 150ms hot
    this.timer = setTimeout(() => {
      this.beep(330 + this.proximity * 550, 0.06);
      this.schedule();
    }, interval);
  }

  private beep(freq: number, duration: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  /** Rising two-tone chime on successful capture. */
  success() {
    this.beep(660, 0.12);
    setTimeout(() => this.beep(990, 0.2), 130);
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

/**
 * One-shot earcons: short, distinct sounds that carry meaning without words,
 * so a screen-reader user hears the outcome before the sentence starts. Each
 * creates a short-lived AudioContext (must be called from a user gesture chain
 * on iOS). Kept low and brief so they never fight the spoken read.
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
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  try {
    const ctx = new AudioContext();
    void ctx.resume();
    play(ctx);
    setTimeout(() => void ctx.close(), 1200);
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
