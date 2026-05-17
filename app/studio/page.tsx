'use client';

import { useState, useEffect } from 'react';
import { NavBar } from '@/components/NavBar';
import { ToastProvider, useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase-browser';
import { fabrics, colors, shots, angles, settings, details, defaultState } from '@/lib/data';
import { buildPrompt } from '@/lib/prompts';
import type { StudioState, Category, CustomProduct } from '@/lib/types';

export default function StudioPage() {
  return (
    <ToastProvider>
      <NavBar />
      <Studio />
    </ToastProvider>
  );
}

/**
 * Helper to load an image and wait for it.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

/**
 * MECHANICAL RECOMPOSITION (flood-fill alpha cutout, graduated falloff).
 *
 *  1. Probe source pixels.
 *  2. Flood-fill from the canvas edges. Connectivity test is binary
 *     (avg > 200 && sat < 25) — wide enough to reach Gemini's
 *     ~205-215 studio backdrop. For each pixel the fill reaches, alpha
 *     is set on a linear ramp: avg=200 → 255 (opaque), avg=235 → 0
 *     (transparent), anything brighter clamps to 0. This gives a soft
 *     falloff at the shadow/backdrop boundary instead of a hard cliff.
 *  3. Find bbox of pixels that retained any opacity (alpha > 0).
 *  4. Scale to fit BOTH height target (60% of output H) AND width cap
 *     (80% of output W). scale = min(widthScale, heightScale).
 *  5. Output canvas inherits Gemini's native dims (no forced ratio).
 *  6. Product center at y = 0.65 * outH; horizontally centered.
 */
async function recomposeProduct(base64: string, mime: string): Promise<{ data: string; mime: string }> {
  const img = await loadImage(`data:${mime};base64,${base64}`);
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  // Pass through Gemini's aspect ratio — square stays square, wide stays wide.
  const outW = W;
  const outH = H;

  // Read source pixels
  const probe = document.createElement('canvas');
  probe.width = W;
  probe.height = H;
  const probeCtx = probe.getContext('2d');
  if (!probeCtx) throw new Error('No canvas context');
  probeCtx.drawImage(img, 0, 0);
  const imgData = probeCtx.getImageData(0, 0, W, H);
  const pixels = imgData.data;

  // Debug: sample corners + edge midpoints so we can see Gemini's actual backdrop range
  const samplePx = (x: number, y: number) => {
    const i = (y * W + x) * 4;
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    return {
      rgb: `${r},${g},${b}`,
      avg: Math.round((r + g + b) / 3),
      sat: Math.max(r, g, b) - Math.min(r, g, b),
    };
  };
  console.log('[Recompose] source dims:', W + 'x' + H);
  console.log('[Recompose] corner+edge samples:', {
    tl:        samplePx(0, 0),
    tr:        samplePx(W - 1, 0),
    bl:        samplePx(0, H - 1),
    br:        samplePx(W - 1, H - 1),
    topMid:    samplePx(Math.floor(W / 2), 0),
    leftMid:   samplePx(0, Math.floor(H / 2)),
    rightMid:  samplePx(W - 1, Math.floor(H / 2)),
    bottomMid: samplePx(Math.floor(W / 2), H - 1),
  });

  // Binary connectivity test — decides which pixels the flood-fill enters.
  // Floor at 200 catches Gemini's ~205-215 studio backdrop; sat<25 keeps
  // any tinted product fabric out of the fill regardless of brightness.
  const isBgAt = (i: number): boolean => {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const avg = (r + g + b) / 3;
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    return avg > 200 && sat < 25;
  };

  // Graduated alpha for a pixel that passed the connectivity test.
  // avg = 200 → α=255 (fully opaque),  avg = 235 → α=0 (fully transparent),
  // linear in between, anything brighter clamps to 0. Soft falloff at the
  // shadow/backdrop boundary instead of a stair-stepped cliff.
  const alphaFor = (i: number): number => {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const avg = (r + g + b) / 3;
    if (avg >= 235) return 0;
    return Math.round((235 - avg) / 35 * 255);
  };

  // Flood-fill BFS from canvas edges. Worst-case queue size = total pixels.
  const total = W * H;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qHead = 0, qTail = 0;
  const seedIfBg = (x: number, y: number) => {
    const cell = y * W + x;
    if (visited[cell]) return;
    const i = cell * 4;
    if (isBgAt(i)) {
      visited[cell] = 1;
      pixels[i + 3] = alphaFor(i);   // graduated alpha — soft falloff at shadow edge
      queue[qTail++] = cell;
    }
  };
  for (let x = 0; x < W; x++) {
    seedIfBg(x, 0);
    seedIfBg(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    seedIfBg(0, y);
    seedIfBg(W - 1, y);
  }
  while (qHead < qTail) {
    const cell = queue[qHead++];
    const x = cell % W;
    const y = (cell - x) / W;
    if (x > 0)     seedIfBg(x - 1, y);
    if (x < W - 1) seedIfBg(x + 1, y);
    if (y > 0)     seedIfBg(x, y - 1);
    if (y < H - 1) seedIfBg(x, y + 1);
  }

  // bbox of pixels with any remaining opacity. Partially-transparent
  // gradient pixels along the shadow edge stay IN so the soft falloff
  // is carried through to the final composite.
  let minX = W, minY = H, maxX = 0, maxY = 0;
  let found = false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (pixels[i + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      found = true;
    }
  }
  if (!found) {
    console.warn('[Recompose] flood-fill ate ALL pixels — falling back to raw Gemini output');
    return { data: base64, mime };
  }
  probeCtx.putImageData(imgData, 0, 0);

  const pBoxW = maxX - minX + 1;
  const pBoxH = maxY - minY + 1;
  console.log('[Recompose] flood-fill consumed', qTail, 'of', total,
              '(' + Math.round(qTail / total * 100) + '%)');
  console.log('[Recompose] bbox:', { minX, minY, maxX, maxY, pBoxW, pBoxH },
              'as % of canvas:',
              Math.round(pBoxW / W * 100) + 'x' + Math.round(pBoxH / H * 100));

  const TARGET_HEIGHT_RATIO = 0.60;
  const MAX_WIDTH_RATIO = 0.80;
  const widthScale  = (MAX_WIDTH_RATIO     * outW) / pBoxW;
  const heightScale = (TARGET_HEIGHT_RATIO * outH) / pBoxH;
  const scale = Math.min(widthScale, heightScale);
  const targetWidth  = Math.round(pBoxW * scale);
  const targetHeight = Math.round(pBoxH * scale);

  const destX = Math.round((outW - targetWidth) / 2);
  const destY = Math.round(0.65 * outH - targetHeight / 2);

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const outCtx = out.getContext('2d');
  if (!outCtx) throw new Error('No canvas context');
  outCtx.fillStyle = '#F1F1F1';
  outCtx.fillRect(0, 0, outW, outH);
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(
    probe,
    minX, minY, pBoxW, pBoxH,
    destX, destY, targetWidth, targetHeight
  );

  const dataUrl = out.toDataURL('image/png');
  return { data: dataUrl.split(',')[1], mime: 'image/png' };
}

/**
 * Composites the Kanabco logo PNG over the top center of an image.
 */
async function compositeLogo(base64: string, mime: string): Promise<{ data: string; mime: string }> {
  const baseImg = await loadImage(`data:${mime};base64,${base64}`);
  const logoImg = await loadImage('/kanabco_logo_default.png');

  const canvas = document.createElement('canvas');
  canvas.width = baseImg.naturalWidth;
  canvas.height = baseImg.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');

  ctx.drawImage(baseImg, 0, 0);

  // Logo: spans ~25% of canvas width, positioned at ~10% from top
  const targetLogoWidth = canvas.width * 0.25;
  const scale = targetLogoWidth / logoImg.naturalWidth;
  const logoWidth = targetLogoWidth;
  const logoHeight = logoImg.naturalHeight * scale;
  const logoX = (canvas.width - logoWidth) / 2;
  const logoY = canvas.height * 0.08 - logoHeight / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);

  return { data: canvas.toDataURL('image/png').split(',')[1], mime: 'image/png' };
}

function Studio() {
  const toast = useToast();
  const [state, setState] = useState<StudioState>(defaultState);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<CustomProduct[]>([]);

  const [imageFile, setImageFile] = useState<{ data: string; mime: string; name: string; size: number } | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ data: string; mime: string } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);

  // When the user hand-edits the prompt textarea, we stash their text here.
  // null = use the auto-built prompt; string = user override (even "" is treated as deliberate).
  const [promptOverride, setPromptOverride] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      if (!membership) return;
      setTeamId(membership.team_id);

      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('custom_products').select('*').eq('team_id', membership.team_id).order('name')
      ]);
      setCategories(cats || []);
      setProducts(prods || []);
    })();
  }, []);

  const computedPrompt = buildPrompt(state, products);
  // Effective prompt sent everywhere (Generate request, Copy, display).
  // Hand-edit wins; otherwise use the auto-built one.
  const prompt = promptOverride ?? computedPrompt;
  const productsInCategory = state.category ? products.filter(p => p.category_id === state.category) : [];

  // These shot types get the catalog treatment: recompose + logo
  const isCatalogShot = state.shot === 'brand_conversion' || state.shot === 'catalog' || state.shot === 'angle';

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { toast('Please choose an image file'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setImageFile({ data: base64, mime: file.type, name: file.name, size: file.size });
      setGenerated(null);
    };
    reader.readAsDataURL(file);
  }

  async function analyzeImage() {
    if (!imageFile) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageFile.data, mime: imageFile.mime }),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();

      const catId = result.category_id;
      const validCat = categories.find(c => c.id === catId);
      const suggested = (result.suggested_name || '').toString().trim();
      const shape = (result.shape || '').toString().trim();

      const pool = validCat ? products.filter(p => p.category_id === catId) : products;
      const match = suggested
        ? pool.find(p => {
            const pn = p.name.toLowerCase();
            const sn = suggested.toLowerCase();
            return pn.includes(sn) || sn.includes(pn);
          })
        : null;

      if (match) {
        setState(s => ({ ...s, category: match.category_id, product: match.id }));
        toast(`Matched: ${match.name}`);
      } else {
        setState(s => ({
          ...s,
          category: validCat ? catId : s.category,
          product: 'one_off',
          productOneOffName: suggested || s.productOneOffName || '',
          productOneOffShape: shape || s.productOneOffShape || '',
        }));
        toast(suggested ? `Suggested: "${suggested}"` : 'Filled custom — review below');
      }
    } catch (e: any) {
      toast('Analysis failed');
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  }

  async function generate() {
    if (!prompt) { toast('Pick a product first'); return; }
    setGenerating(true);
    setGenError(null);
    setGenerated(null);

    // Debug: verify the prompt actually leaves the browser as expected.
    console.log(
      '[Studio] POST /api/generate — prompt source:',
      promptOverride !== null ? 'user-edited override' : 'auto-built',
      '| length:', prompt.length
    );
    console.log('[Studio] prompt body:\n' + prompt);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          sourceImage: imageFile?.data || null,
          sourceMime: imageFile?.mime || null,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || 'Generation failed');
      const result = await res.json();

      let finalImage = { data: result.imageBase64, mime: result.mimeType };

      // For catalog-style shots: mechanically recompose, then composite logo
      if (isCatalogShot) {
        try {
          finalImage = await recomposeProduct(finalImage.data, finalImage.mime);
        } catch (e: any) {
          console.warn('Recomposition failed:', e?.message);
        }
        try {
          finalImage = await compositeLogo(finalImage.data, finalImage.mime);
        } catch (e: any) {
          console.warn('Logo composite failed:', e?.message);
          toast(e?.message || 'Could not add logo');
        }
      }

      setGenerated(finalImage);
      toast('Image generated');
    } catch (e: any) {
      setGenError(e.message || 'Generation failed');
      toast('Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function downloadGenerated() {
    if (!generated) return;

    // base64 → Uint8Array → Blob (application/octet-stream forces Safari
    // to treat the link as a download rather than navigating to a PNG)
    const bin = atob(generated.data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    // Filesystem-safe filename: kanabco-<product>-<shot>-<ts>.png
    const productObj = state.product && state.product !== 'one_off'
      ? products.find(p => p.id === state.product)
      : null;
    const raw = productObj?.name || state.productOneOffName || 'Custom';
    const safe = (s: string) => s.replace(/[\/\\:*?"<>|]+/g, '-').replace(/\s+/g, '-').toLowerCase();
    const filename = `kanabco-${safe(raw)}-${safe(state.shot || 'image')}-${Date.now()}.png`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.target = '_self';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after the click has had time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function copyPrompt() {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    toast('Copied');
  }

  async function saveAsProduct() {
    if (state.product !== 'one_off') return;
    if (!state.productOneOffName?.trim() || !state.productOneOffShape?.trim()) {
      toast('Fill name and shape first');
      return;
    }
    if (!state.category) { toast('Pick a category'); return; }
    if (!teamId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: inserted, error } = await supabase
      .from('custom_products')
      .insert({
        team_id: teamId,
        category_id: state.category,
        name: state.productOneOffName.trim(),
        description: state.productOneOffName.trim(),
        shape: state.productOneOffShape.trim(),
        created_by: user?.id || null,
      })
      .select()
      .single();
    if (error || !inserted) { toast('Save failed'); return; }
    setProducts(p => [...p, inserted]);
    setState(s => ({ ...s, product: inserted.id }));
    toast('Saved to catalog');
  }


  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-10">
        <h1 className="font-serif text-3xl italic font-light leading-tight">Build a prompt, generate an image.</h1>
        <p className="text-text-muted mt-2">Every output in your locked Kanabco format — recomposed to exact specs, with the real logo composited on top.</p>
      </header>

      <Section num="01" title="Reference photo" hint="Optional but recommended">
        <UploadZone
          imageFile={imageFile}
          onFile={handleFile}
          onClear={() => setImageFile(null)}
          onAnalyze={analyzeImage}
          analyzing={analyzing}
        />
      </Section>

      <Section num="02" title="Product" hint={products.length === 0 ? 'Add some in Products page' : `${products.length} in catalog`}>
        <div className="mb-3">
          <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5 font-medium">Category</label>
          <select
            className="select"
            value={state.category || ''}
            onChange={e => setState(s => ({ ...s, category: e.target.value, product: null }))}
          >
            <option value="">— Pick category —</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({products.filter(p => p.category_id === c.id).length})
              </option>
            ))}
          </select>
        </div>

        {state.category && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {productsInCategory.map(p => (
              <button
                key={p.id}
                onClick={() => setState(s => ({ ...s, product: p.id }))}
                className={`card-tile ${state.product === p.id ? 'active' : ''}`}
              >
                <div className="font-semibold text-sm mb-1 leading-tight">{p.name}</div>
                <div className="text-xs text-text-muted leading-snug">{p.description}</div>
              </button>
            ))}
            <button
              onClick={() => setState(s => ({ ...s, product: 'one_off' }))}
              className={`card-tile border-dashed ${state.product === 'one_off' ? 'active' : ''}`}
            >
              <div className="font-semibold text-sm mb-1 leading-tight text-orange">+ Custom (one-off)</div>
              <div className="text-xs text-text-muted leading-snug">Describe inline for this generation only</div>
            </button>
          </div>
        )}

        {state.product === 'one_off' && (
          <div className="mt-3 bg-bg-card border border-orange/40 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-text-faint mb-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange"></span>
              <span>Fill or tweak below. Tip: click "Auto-detect product" above to have Gemini pre-fill these from your photo.</span>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-muted mb-1 font-medium">Product name <span className="text-text-faint normal-case lowercase">(for your reference)</span></label>
              <input
                type="text"
                value={state.productOneOffName || ''}
                onChange={e => setState(s => ({ ...s, productOneOffName: e.target.value }))}
                placeholder="e.g., Bouclé scoop armchair"
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-muted mb-1 font-medium">Shape description <span className="text-text-faint normal-case lowercase">(used in prompt)</span></label>
              <textarea
                value={state.productOneOffShape || ''}
                onChange={e => setState(s => ({ ...s, productOneOffShape: e.target.value }))}
                rows={3}
                placeholder='e.g., "a lounge armchair with rounded scoop seat, curved bolster back, and angular flared legs in pale wood"'
                className="input resize-none"
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-text-faint">Using this product more than once?</p>
              <button
                onClick={saveAsProduct}
                disabled={!state.productOneOffName?.trim() || !state.productOneOffShape?.trim()}
                className="text-xs text-orange hover:underline font-medium disabled:opacity-40 disabled:no-underline"
              >
                ⌑ Save to my catalog
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section num="03" title="Material & Color">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5 font-medium">Material type</label>
            <select className="select" value={state.fabric} onChange={e => setState(s => ({ ...s, fabric: e.target.value }))}>
              {fabrics.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-muted mb-1.5 font-medium">Color</label>
            <select
              className="select"
              value={state.color}
              onChange={e => setState(s => ({ ...s, color: e.target.value }))}
              disabled={state.fabric === 'keep'}
            >
              {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </Section>

      <Section num="04" title="Shot type">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {shots.map(s => (
            <button
              key={s.id}
              onClick={() => setState(p => ({ ...p, shot: s.id }))}
              className={`card-tile ${state.shot === s.id ? 'active' : ''}`}
            >
              <div className="text-lg mb-1.5 text-text-muted">{s.icon}</div>
              <div className="font-semibold text-sm mb-0.5">{s.name}</div>
              <div className="text-xs text-text-muted">{s.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      {state.shot === 'angle' && (
        <Section num="04b" title="Camera angle">
          <select className="select" value={state.angle} onChange={e => setState(s => ({ ...s, angle: e.target.value }))}>
            {angles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Section>
      )}
      {state.shot === 'lifestyle' && (
        <Section num="04b" title="Setting">
          <select className="select" value={state.setting} onChange={e => setState(s => ({ ...s, setting: e.target.value }))}>
            {settings.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Section>
      )}
      {state.shot === 'detail' && (
        <Section num="04b" title="Detail focus">
          <select className="select" value={state.detail} onChange={e => setState(s => ({ ...s, detail: e.target.value }))}>
            {details.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Section>
      )}

      <Section num="05" title="Preservation lock">
        <div className="bg-bg-card border border-border rounded-lg p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="font-semibold text-sm mb-0.5">Strict preservation mode</div>
            <div className="text-xs text-text-muted leading-relaxed">Adds aggressive language telling the AI to treat the source as ground truth and not alter anything outside the requested change.</div>
          </div>
          <Toggle checked={state.preservationLock} onChange={v => setState(s => ({ ...s, preservationLock: v }))} />
        </div>
      </Section>

      <div className="bg-navy text-white/90 rounded-2xl p-6 mt-10 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="font-serif italic text-lg text-white">
            Prompt
            {promptOverride !== null && (
              <span className="ml-2 text-[10px] uppercase tracking-wider not-italic font-sans text-orange align-middle">edited</span>
            )}
          </div>
          <div className="flex gap-2">
            {promptOverride !== null && (
              <button
                onClick={() => setPromptOverride(null)}
                disabled={!computedPrompt}
                className="btn btn-dark text-xs"
                title="Discard edits and use the auto-built prompt"
              >
                ↺ Reset to auto
              </button>
            )}
            <button onClick={copyPrompt} disabled={!prompt} className="btn btn-dark text-xs">⎘ Copy</button>
          </div>
        </div>
        <textarea
          value={prompt ?? ''}
          onChange={e => setPromptOverride(e.target.value)}
          placeholder="Pick a product to generate your prompt…"
          className="w-full font-mono text-[12.5px] leading-relaxed bg-transparent text-white/90 placeholder-white/40 placeholder:italic placeholder:font-sans focus:outline-none resize-y min-h-[200px]"
        />
        <div className="text-[10px] text-white/40 mt-2">
          Edit this text to tweak what Gemini receives. Changes are sent on Generate.
        </div>
      </div>

      <button
        onClick={generate}
        disabled={!prompt || generating}
        className="btn btn-primary w-full text-base py-3.5 mb-6"
      >
        {generating ? '✦ Generating image…' : '✦ Generate image with Gemini'}
      </button>

      {generated && (
        <div className="bg-bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-serif italic text-lg">
              Generated image
              {isCatalogShot && <span className="text-xs text-text-muted ml-2 not-italic">· recomposed + logo</span>}
            </div>
            <button onClick={downloadGenerated} className="btn btn-secondary text-xs">↓ Download</button>
          </div>
          <img
            src={`data:${generated.mime};base64,${generated.data}`}
            alt="Generated"
            className="w-full rounded-lg border border-border"
          />
        </div>
      )}

      {genError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-4 mb-6">
          <div className="font-semibold mb-1">Generation failed</div>
          <div className="text-xs opacity-80">{genError}</div>
        </div>
      )}
    </div>
  );
}

function Section({ num, title, hint, children }: { num: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-2.5 mb-3">
        <span className="section-num">{num}</span>
        <span className="section-title">{title}</span>
        {hint && <span className="ml-auto text-xs text-text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-orange' : 'bg-border-strong'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

function UploadZone({ imageFile, onFile, onClear, onAnalyze, analyzing }: {
  imageFile: { data: string; mime: string; name: string; size: number } | null;
  onFile: (file: File) => void;
  onClear: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  if (imageFile) {
    return (
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
        <img
          src={`data:${imageFile.mime};base64,${imageFile.data}`}
          alt="Reference"
          className="w-20 h-28 object-cover rounded-md border border-border"
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{imageFile.name}</div>
          <div className="text-xs text-text-muted">{(imageFile.size / 1024).toFixed(0)} KB · {imageFile.mime.split('/')[1].toUpperCase()}</div>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="mt-2 text-xs text-orange hover:underline disabled:opacity-50"
          >
            {analyzing ? 'Analyzing…' : '✦ Auto-detect product'}
          </button>
        </div>
        <button onClick={onClear} className="text-xs text-text-muted hover:text-text underline">Remove</button>
      </div>
    );
  }

  return (
    <label
      className={`block border-2 border-dashed rounded-2xl p-9 text-center bg-bg-card cursor-pointer transition-all ${
        dragging ? 'border-orange bg-orange/[0.04] scale-[1.005]' : 'border-border-strong hover:border-orange hover:bg-orange/[0.02]'
      }`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
      }}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <div className="w-11 h-11 mx-auto rounded-full bg-bg-soft flex items-center justify-center text-xl text-text-muted mb-3">⤒</div>
      <div className="text-sm">Drop your product photo here</div>
      <div className="text-xs text-text-faint mt-1">or click to browse · jpg, png, webp</div>
    </label>
  );
}
