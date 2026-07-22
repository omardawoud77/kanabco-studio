/**
 * Deterministic background-color normalization — pure pixel math, no DOM.
 *
 * Gemini's background pass gets each image CLOSE to the Kanabco field color,
 * but every call drifts a little differently, so the five images of an ST set
 * come back with five slightly different "#F0F0EE"s. This pass measures the
 * backdrop each image actually has (median of a border ring), flood-fills from
 * the frame edges with a TIGHT tolerance around that measured color, and
 * repaints what it reaches to the exact target hex. Geometry is untouched —
 * no rescale, no reposition.
 *
 * The tight tolerance + sampled center is what keeps light products safe:
 * a pure-white product sits ~25+ units from any plausible near-#F0F0EE
 * backdrop, and the fill's reach stops at RAMP_OUT (20).
 */
export const BG_TARGET_R = 240;
export const BG_TARGET_G = 240;
export const BG_TARGET_B = 238;

const RAMP_IN = 12;          // within this distance of the sampled backdrop: fully repainted
const RAMP_OUT = 20;         // beyond this: untouched (and the flood fill stops)
const MAX_MEDIAN_DRIFT = 60; // sampled backdrop farther than this from target: bail out
const MIN_FILL = 0.05;       // fill reached almost nothing: not a flat backdrop, bail out
const MAX_FILL = 0.97;       // fill reached almost everything: it would eat the product, bail out

export type BgNormalizeResult = {
  changed: boolean;
  filledFraction: number;
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

  const drift = Math.sqrt(
    (mr - BG_TARGET_R) ** 2 + (mg - BG_TARGET_G) ** 2 + (mb - BG_TARGET_B) ** 2
  );
  if (drift > MAX_MEDIAN_DRIFT) {
    return { changed: false, filledFraction: 0, medianRGB, reason: `backdrop median ${drift.toFixed(0)} units from target — not a Kanabco field, skipping` };
  }

  // 2. Flood fill from the frame edges, gated on distance from the SAMPLED color.
  const distAt = (i4: number) => {
    const dr = pixels[i4] - mr, dg = pixels[i4 + 1] - mg, db = pixels[i4 + 2] - mb;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
  const factor = new Float32Array(total); // repaint strength per pixel, 0 = untouched
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qh = 0, qt = 0;
  const seed = (x: number, y: number) => {
    const cell = y * W + x;
    if (visited[cell]) return;
    const d = distAt(cell * 4);
    if (d >= RAMP_OUT) return;
    visited[cell] = 1;
    factor[cell] = d <= RAMP_IN ? 1 : (RAMP_OUT - d) / (RAMP_OUT - RAMP_IN);
    queue[qt++] = cell;
  };
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
  while (qh < qt) {
    const cell = queue[qh++];
    const x = cell % W;
    const y = (cell - x) / W;
    if (x > 0)     seed(x - 1, y);
    if (x < W - 1) seed(x + 1, y);
    if (y > 0)     seed(x, y - 1);
    if (y < H - 1) seed(x, y + 1);
  }

  const filledFraction = qt / total;
  if (filledFraction < MIN_FILL) {
    return { changed: false, filledFraction, medianRGB, reason: 'fill reached almost nothing — backdrop not flat, skipping' };
  }
  if (filledFraction > MAX_FILL) {
    return { changed: false, filledFraction, medianRGB, reason: 'fill reached almost everything — would eat the product, skipping' };
  }

  // 3. Repaint. Full-strength pixels land on the exact target hex; the ramp
  //    band blends, so the contact shadow's soft edge stays soft.
  for (let cell = 0; cell < total; cell++) {
    const f = factor[cell];
    if (f === 0) continue;
    const i = cell * 4;
    pixels[i]     = Math.round(pixels[i]     + (BG_TARGET_R - pixels[i])     * f);
    pixels[i + 1] = Math.round(pixels[i + 1] + (BG_TARGET_G - pixels[i + 1]) * f);
    pixels[i + 2] = Math.round(pixels[i + 2] + (BG_TARGET_B - pixels[i + 2]) * f);
  }
  return { changed: true, filledFraction, medianRGB, reason: 'ok' };
}
