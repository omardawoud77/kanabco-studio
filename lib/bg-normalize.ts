/**
 * Deterministic background-color normalization — pure pixel math, no DOM.
 *
 * Gemini's background pass gets each image CLOSE to the Kanabco field color,
 * but every call drifts a little differently, so the five images of an ST set
 * come back with five slightly different "#F0F0EE"s. This pass measures the
 * backdrop each image actually has (median of a border ring) and corrects it
 * with two GLOBAL, BOUNDED operations:
 *
 *   1. a uniform white-balance shift of the whole image by (target − median),
 *      so the field's center lands exactly on #F0F0EE and the product shifts
 *      coherently with it — never a two-tone product;
 *   2. a soft snap: every pixel within SNAP_IN of the target becomes exactly
 *      the target, blending out to no change at SNAP_OUT, so the field's
 *      residual noise flattens to the literal hex.
 *
 * There is deliberately NO flood fill and NO background/product segmentation:
 * a light product tone can sit arbitrarily close to the backdrop shade, so no
 * color gate can tell them apart — any segmenting repaint can crush an ivory
 * or white product into the field. Here the worst case for ANY pixel is
 * bounded: at most MAX_MEDIAN_DRIFT units of uniform shift (a white-balance
 * correction, applied to everything equally) plus at most ~SNAP_IN units of
 * snap — below visibility on product texture. Backdrops farther than
 * MAX_MEDIAN_DRIFT from the target are left untouched: that's a failed Gemini
 * pass, and mechanically recoloring it would look worse than the drift.
 */
export const BG_TARGET_R = 240;
export const BG_TARGET_G = 240;
export const BG_TARGET_B = 238;

const MAX_MEDIAN_DRIFT = 10; // sampled backdrop farther than this from target: bail out
const SNAP_IN = 5;           // within this distance of the target after the shift: exactly target
const SNAP_OUT = 12;         // beyond this: untouched; 5..12 blends linearly
const MIN_FIELD = 0.2;       // less of the frame near-target after the shift: not a catalog field, bail out

export type BgNormalizeResult = {
  changed: boolean;
  fieldFraction: number;
  medianRGB: [number, number, number];
  reason: string;
};

export function normalizeBackgroundPixels(
  pixels: Uint8ClampedArray,
  W: number,
  H: number
): BgNormalizeResult {
  const total = W * H;

  // 1. Sample the actual backdrop: per-channel median of a ~2% border ring.
  const m = Math.max(2, Math.round(Math.min(W, H) * 0.02));
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  const pushPx = (x: number, y: number) => {
    const i = (y * W + x) * 4;
    rs.push(pixels[i]); gs.push(pixels[i + 1]); bs.push(pixels[i + 2]);
  };
  for (let y = 0; y < H; y++) {
    if (y < m || y >= H - m) {
      for (let x = 0; x < W; x++) pushPx(x, y);
    } else {
      for (let x = 0; x < m; x++) pushPx(x, y);
      for (let x = W - m; x < W; x++) pushPx(x, y);
    }
  }
  const median = (a: number[]) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  const mr = median(rs), mg = median(gs), mb = median(bs);
  const medianRGB: [number, number, number] = [mr, mg, mb];

  const dR = BG_TARGET_R - mr, dG = BG_TARGET_G - mg, dB = BG_TARGET_B - mb;
  const drift = Math.sqrt(dR * dR + dG * dG + dB * dB);
  if (drift > MAX_MEDIAN_DRIFT) {
    return { changed: false, fieldFraction: 0, medianRGB, reason: `backdrop median ${drift.toFixed(1)} units from target — Gemini pass failed, skipping` };
  }

  // 2. Dry run: how much of the frame lands near the target after the shift?
  //    (i.e. how much of the image is actually flat backdrop)
  let nearTarget = 0;
  for (let cell = 0; cell < total; cell++) {
    const i = cell * 4;
    const r = Math.max(0, Math.min(255, pixels[i] + dR));
    const g = Math.max(0, Math.min(255, pixels[i + 1] + dG));
    const b = Math.max(0, Math.min(255, pixels[i + 2] + dB));
    const er = r - BG_TARGET_R, eg = g - BG_TARGET_G, eb = b - BG_TARGET_B;
    if (er * er + eg * eg + eb * eb <= SNAP_IN * SNAP_IN) nearTarget++;
  }
  const fieldFraction = nearTarget / total;
  if (fieldFraction < MIN_FIELD) {
    return { changed: false, fieldFraction, medianRGB, reason: 'too little of the frame is flat backdrop — not a catalog field, skipping' };
  }

  // 3. Apply: uniform shift, then soft snap toward the exact target hex.
  for (let cell = 0; cell < total; cell++) {
    const i = cell * 4;
    let r = Math.max(0, Math.min(255, pixels[i] + dR));
    let g = Math.max(0, Math.min(255, pixels[i + 1] + dG));
    let b = Math.max(0, Math.min(255, pixels[i + 2] + dB));
    const er = r - BG_TARGET_R, eg = g - BG_TARGET_G, eb = b - BG_TARGET_B;
    const d = Math.sqrt(er * er + eg * eg + eb * eb);
    if (d <= SNAP_IN) {
      r = BG_TARGET_R; g = BG_TARGET_G; b = BG_TARGET_B;
    } else if (d < SNAP_OUT) {
      const f = (SNAP_OUT - d) / (SNAP_OUT - SNAP_IN);
      r = Math.round(r + (BG_TARGET_R - r) * f);
      g = Math.round(g + (BG_TARGET_G - g) * f);
      b = Math.round(b + (BG_TARGET_B - b) * f);
    }
    pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b;
  }
  return { changed: true, fieldFraction, medianRGB, reason: 'ok' };
}
