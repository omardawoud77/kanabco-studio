/**
 * Kanabco ST — CLI runner.
 *
 * Generates the five-view set outside the browser so we can eyeball the prompts
 * without standing up Supabase auth. Uses the SAME lib/prompts.ts the app uses,
 * so what this renders is what the studio renders.
 *
 * Skipped vs the in-app flow: the logo composite (canvas, browser-only) and the
 * flood-fill recompose fallback. The #F0F0EE backdrop pass still runs.
 *
 *   GEMINI_API_KEY=... npx tsx run-st.ts <source-photo> "<shape description>"
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { basename, extname } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildPrompt, buildStSetPrompts } from './lib/prompts';

const BG_REPLACE_PROMPT =
  'Replace ONLY the background of this image with flat solid #F0F0EE. ' +
  'Preserve the product exactly as is — every pixel, every detail, the exact position, the exact size, the exact framing. ' +
  'Do NOT reposition, resize, recompose, or modify the product in any way. ' +
  'Do NOT add or remove anything from the image except the background color. ' +
  'Keep the soft contact shadow under the product. ' +
  'The background must be ONE single uniform colour edge to edge — absolutely no gradient, no floor line, no horizon, no darker band at the bottom, no vignette; if the source image has any of these, flatten them all into the same solid #F0F0EE. ' +
  'Do NOT add any logos, arrows, watermarks, glyphs, icons, text, or marks anywhere in the image.';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};

async function main() {
  const [srcPath, shape, outDirArg] = process.argv.slice(2);
  if (!srcPath || !shape) {
    console.error('usage: npx tsx run-st.ts <source-photo> "<shape description>" [out-dir]');
    process.exit(1);
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.error('GEMINI_API_KEY is not set'); process.exit(1); }

  const srcMime = MIME[extname(srcPath).toLowerCase()];
  if (!srcMime) { console.error('unsupported image type:', extname(srcPath)); process.exit(1); }
  const srcB64 = readFileSync(srcPath).toString('base64');

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

  const call = async (prompt: string, imgB64: string, imgMime: string) => {
    const result = await model.generateContent([
      { inlineData: { data: imgB64, mimeType: imgMime } },
      { text: prompt },
    ]);
    for (const c of result.response.candidates || []) {
      for (const p of c.content?.parts || []) {
        if (p.inlineData?.data) return { data: p.inlineData.data, mime: p.inlineData.mimeType || 'image/png' };
      }
    }
    throw new Error('No image returned from Gemini');
  };

  const state: any = {
    product: 'one_off', productOneOffShape: shape, category: 'sofas',
    fabric: 'keep', color: 'sand', shot: 'kanabco_st',
    angle: 'three_quarter', setting: 'med_terrace', detail: 'fabric_texture',
    preservationLock: true,
  };

  const master = buildPrompt(state, []);
  if (!master) { console.error('buildPrompt returned null'); process.exit(1); }
  const views = buildStSetPrompts(master);

  const outDir = outDirArg || 'st-out';
  mkdirSync(outDir, { recursive: true });
  console.log(`source: ${basename(srcPath)}\nshape:  ${shape}\nviews:  ${views.length}\n`);

  // Sequential — parallel calls trip the free-tier rate limit.
  const results = await Promise.allSettled(
    views.map(async (v, i) => {
      const raw = await call(v.prompt, srcB64, srcMime);
      let final = raw;
      try {
        final = await call(BG_REPLACE_PROMPT, raw.data, raw.mime);
      } catch (e: any) {
        console.warn(`  [${v.id}] backdrop pass failed (${e?.message}) — keeping raw output`);
      }
      const file = `${outDir}/st-${String(i + 1).padStart(2, '0')}-${v.id}.png`;
      writeFileSync(file, Buffer.from(final.data, 'base64'));
      console.log(`  ✓ ${v.name.padEnd(12)} → ${file}`);
      return file;
    })
  );

  const ok = results.filter(r => r.status === 'fulfilled').length;
  console.log(`\n${ok}/${views.length} views generated into ${outDir}/`);
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`  ✗ ${views[i].name}: ${r.reason?.message || r.reason}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
