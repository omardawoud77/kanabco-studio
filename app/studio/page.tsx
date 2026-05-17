'use client';

import { useState, useEffect } from 'react';
import { NavBar } from '@/components/NavBar';
import { ToastProvider, useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase-browser';
import { fabrics, colors, shots, angles, settings, details, defaultState } from '@/lib/data';
import { buildPrompt, buildEntryMeta } from '@/lib/prompts';
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
 * MECHANICAL RECOMPOSITION: takes Gemini's generated image (where the product
 * often fills most of the frame) and rebuilds the composition so the product
 * is small in the lower portion of the frame, on a clean #F1F1F1 background.
 *
 * Algorithm:
 *  1. Find the product's bounding box (any non-background pixel)
 *  2. Compute scale so product height = TARGET_HEIGHT_RATIO of canvas height
 *  3. Paint a clean #F1F1F1 canvas
 *  4. Draw the cropped product, scaled, positioned in lower portion
 */
async function recomposeProduct(base64: string, mime: string): Promise<{ data: string; mime: string }> {
  const img = await loadImage(`data:${mime};base64,${base64}`);
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  // 1. Get pixel data
  const probe = document.createElement('canvas');
  probe.width = W;
  probe.height = H;
  const probeCtx = probe.getContext('2d');
  if (!probeCtx) throw new Error('No canvas context');
  probeCtx.drawImage(img, 0, 0);
  const pixels = probeCtx.getImageData(0, 0, W, H).data;

  // 2. Find bounding box of non-background pixels.
  // Background = near-#F1F1F1 (neutral, brightness 225-250, low saturation).
  let minX = W, minY = H, maxX = 0, maxY = 0;
  let found = false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const avg = (r + g + b) / 3;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      // Background if: neutral (low sat) and bright (close to #F1F1F1)
      const isBg = sat < 12 && avg > 225 && avg < 252;
      if (!isBg) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }
  if (!found) {
    // Nothing detected — fall back to returning original
    return { data: base64, mime };
  }

  const pBoxW = maxX - minX + 1;
  const pBoxH = maxY - minY + 1;

  // 3. Compute target size. Product height = 32% of canvas height (gives breathing room).
  const TARGET_HEIGHT_RATIO = 0.32;
  const MAX_WIDTH_RATIO = 0.78; // never let product touch sides
  const targetHeight = Math.round(H * TARGET_HEIGHT_RATIO);
  let scale = targetHeight / pBoxH;
  let targetWidth = Math.round(pBoxW * scale);
  // Cap width
  const maxWidth = Math.round(W * MAX_WIDTH_RATIO);
  if (targetWidth > maxWidth) {
    scale = maxWidth / pBoxW;
    targetWidth = maxWidth;
  }
  const finalHeight = Math.round(pBoxH * scale);

  // 4. Position: horizontally centered, product bottom at ~75% of canvas height.
  const PRODUCT_BOTTOM_RATIO = 0.78;
  const destX = Math.round((W - targetWidth) / 2);
  const destBottom = Math.round(H * PRODUCT_BOTTOM_RATIO);
  const destY = destBottom - finalHeight;

  // 5. Build final canvas
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const outCtx = out.getContext('2d');
  if (!outCtx) throw new Error('No canvas context');
  outCtx.fillStyle = '#F1F1F1';
  outCtx.fillRect(0, 0, W, H);
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(
    img,
    minX, minY, pBoxW, pBoxH,       // source crop
    destX, destY, targetWidth, finalHeight  // dest
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
  const logoY = canvas.height * 0.10 - logoHeight / 2;
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
  const [saving, setSaving] = useState(false);

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

  const prompt = buildPrompt(state, products);
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
    const a = document.createElement('a');
    a.href = `data:${generated.mime};base64,${generated.data}`;
    a.download = `kanabco-${Date.now()}.png`;
    a.click();
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

  async function saveToLibrary() {
    if (!prompt || !state.product) { toast('Pick a product first'); return; }
    if (!teamId) { toast('No workspace found'); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      let imageUrl: string | null = null;
      if (generated) {
        const bin = Uint8Array.from(atob(generated.data), c => c.charCodeAt(0));
        const fileName = `${teamId}/${Date.now()}.png`;
        const { error: upErr } = await supabase.storage
          .from('generated-images')
          .upload(fileName, bin, { contentType: generated.mime, upsert: false });
        if (!upErr) {
          const { data } = supabase.storage.from('generated-images').getPublicUrl(fileName);
          imageUrl = data.publicUrl;
        }
      }

      const meta = buildEntryMeta(state, products);
      const { error } = await supabase.from('library_entries').insert({
        team_id: teamId,
        user_id: user.id,
        title: meta.title,
        subtitle: meta.subtitle,
        prompt,
        state: state as any,
        image_url: imageUrl,
        source_name: imageFile?.name || null,
      });
      if (error) throw error;
      toast('Saved to library');
    } catch (e: any) {
      console.error(e);
      toast('Save failed');
    } finally {
      setSaving(false);
    }
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
          <div className="font-serif italic text-lg text-white">Generated prompt</div>
          <div className="flex gap-2">
            <button onClick={saveToLibrary} disabled={!prompt || saving} className="btn btn-dark text-xs">
              {saving ? '…' : '⌑ Save'}
            </button>
            <button onClick={copyPrompt} disabled={!prompt} className="btn btn-dark text-xs">⎘ Copy</button>
          </div>
        </div>
        <div className="font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap min-h-[80px]">
          {prompt || <span className="opacity-50 italic font-sans">Pick a product to generate your prompt…</span>}
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
