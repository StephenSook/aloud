/**
 * Pure guidance logic for non-visual selfie capture. No DOM, fully unit-tested.
 *
 * Coordinate convention: raw (un-mirrored) front-camera frame. If the face
 * sits left of center in the frame, moving the phone left brings it to center,
 * so cues name the side the face is on.
 */

export type Box = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type GuidanceInput = {
  box: Box | null;
  frameWidth: number;
  frameHeight: number;
  /** Mean luminance 0-255 of the current frame. */
  luma: number;
};

export type GuidanceState =
  | "searching"
  | "too_dark"
  | "adjust"
  | "hold";

export type Guidance = {
  state: GuidanceState;
  /** Spoken cue. Stable strings so announcements can be throttled by change. */
  message: string;
  /** 0 (far from good) to 1 (perfectly framed); drives beep rate and pitch. */
  proximity: number;
};

// YouCam rejects faces under ~60% of image width (verified live: 54% rejected,
// 77% accepted). We guide toward >=0.55 in the FULL frame and then crop around
// the face at capture time, which lands the cropped face near 75%.
export const MIN_FACE_RATIO = 0.4;
export const GOOD_FACE_RATIO = 0.55;
export const MAX_FACE_RATIO = 0.92;
export const CENTER_TOLERANCE = 0.12;
export const MIN_LUMA = 60;

export function assess(input: GuidanceInput): Guidance {
  const { box, frameWidth, frameHeight, luma } = input;

  if (luma < MIN_LUMA) {
    return {
      state: "too_dark",
      message: "The light is low. Try facing a window or a lamp.",
      proximity: 0,
    };
  }

  if (!box) {
    return {
      state: "searching",
      message:
        "No face in view yet. Hold the phone at arm's length, screen facing you.",
      proximity: 0,
    };
  }

  const faceRatio = box.width / frameWidth;
  const cx = (box.originX + box.width / 2) / frameWidth - 0.5;
  const cy = (box.originY + box.height / 2) / frameHeight - 0.5;

  const sizeError =
    faceRatio < GOOD_FACE_RATIO
      ? (GOOD_FACE_RATIO - faceRatio) / GOOD_FACE_RATIO
      : faceRatio > MAX_FACE_RATIO
        ? (faceRatio - MAX_FACE_RATIO) / MAX_FACE_RATIO
        : 0;
  const centerError = Math.max(Math.abs(cx), Math.abs(cy));
  const proximity = Math.max(
    0,
    Math.min(1, 1 - (sizeError * 1.5 + Math.max(0, centerError - CENTER_TOLERANCE) * 2)),
  );

  if (faceRatio < MIN_FACE_RATIO) {
    return {
      state: "adjust",
      message: "Bring the phone closer to your face.",
      proximity,
    };
  }
  if (faceRatio > MAX_FACE_RATIO) {
    return {
      state: "adjust",
      message: "Move the phone a little farther away.",
      proximity,
    };
  }

  if (centerError > CENTER_TOLERANCE) {
    const horizontal = Math.abs(cx) >= Math.abs(cy);
    const message = horizontal
      ? cx < 0
        ? "Move the phone slightly to your left."
        : "Move the phone slightly to your right."
      : cy < 0
        ? "Tilt the phone up a little."
        : "Tilt the phone down a little.";
    return { state: "adjust", message, proximity };
  }

  if (faceRatio < GOOD_FACE_RATIO) {
    return {
      state: "adjust",
      message: "Almost there. A little closer.",
      proximity,
    };
  }

  return { state: "hold", message: "Hold still.", proximity: 1 };
}

/**
 * Steadiness tracker: capture fires only after the face stays framed and
 * still for `holdMs`. Feed one sample per detection frame.
 */
export class SteadinessTracker {
  private since: number | null = null;
  private last: Box | null = null;

  constructor(
    private holdMs = 700,
    private jitterTolerance = 0.05,
  ) {}

  update(guidance: Guidance, box: Box | null, frameWidth: number, now: number): boolean {
    if (guidance.state !== "hold" || !box) {
      this.since = null;
      this.last = box;
      return false;
    }
    if (this.last) {
      const drift =
        Math.abs(box.originX - this.last.originX) / frameWidth +
        Math.abs(box.width - this.last.width) / frameWidth;
      if (drift > this.jitterTolerance) this.since = now;
    }
    if (this.since === null) this.since = now;
    this.last = box;
    return now - this.since >= this.holdMs;
  }

  reset() {
    this.since = null;
    this.last = null;
  }
}

/**
 * Compute the capture crop: centered on the face, sized so the face spans
 * ~75% of the crop width, clamped to the frame and to YouCam's 480px floor.
 */
export function captureCrop(
  box: Box,
  frameWidth: number,
  frameHeight: number,
): { x: number; y: number; width: number; height: number } {
  const targetWidth = Math.min(frameWidth, Math.max(box.width / 0.75, 480));
  const targetHeight = Math.min(frameHeight, Math.max(targetWidth * 1.25, 480));
  const faceCx = box.originX + box.width / 2;
  const faceCy = box.originY + box.height / 2;
  const x = Math.max(0, Math.min(frameWidth - targetWidth, faceCx - targetWidth / 2));
  const y = Math.max(0, Math.min(frameHeight - targetHeight, faceCy - targetHeight / 2));
  return { x, y, width: targetWidth, height: targetHeight };
}

/**
 * Stereo pan (-1 left .. 1 right) toward the face's horizontal position, so the
 * guidance beep comes from the side the face sits on. Amplified so a face near
 * the frame edge pans fully; 0 when there is no face.
 */
export function framingPan(box: Box | null, frameWidth: number): number {
  if (!box || frameWidth <= 0) return 0;
  const cx = (box.originX + box.width / 2) / frameWidth - 0.5;
  return Math.max(-1, Math.min(1, cx * 2));
}

/** Face vertical offset (-0.5 above centre .. 0.5 below), for pitch cueing. */
export function framingVertical(box: Box | null, frameHeight: number): number {
  if (!box || frameHeight <= 0) return 0;
  const cy = (box.originY + box.height / 2) / frameHeight - 0.5;
  return Math.max(-0.5, Math.min(0.5, cy));
}
