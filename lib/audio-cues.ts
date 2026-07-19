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
