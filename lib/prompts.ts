import { fabrics, colors, settings, details } from './data';
import type { StudioState, CustomProduct } from './types';

function studioStandards(): string {
  return `Kanabco brand format (match exactly):

BACKGROUND:
- Background: cool light gray, very subtle, almost white but with a faint cool gray tint, NOT warm, NOT beige, NOT cream. Hex #F0F0EE, RGB (240, 240, 238). This EXACT color, flat and uniform across the entire frame. No other shade, no warmer, no cooler, no lighter, no darker. Not white. Not warm. Not beige. Not cream. Exactly #F0F0EE. The background must be a single solid color edge to edge. NO studio backdrop, NO floor, NO surface, NO platform, NO horizon line, NO cyc wall, NO gradient, NO vignette, NO color variation anywhere. The product sits directly on this flat #F0F0EE field with only a very soft contact shadow directly beneath the product where it touches the ground.

COMPOSITION (CRITICAL — read carefully):
- Vertical portrait orientation, image taller than wide. The product must be LARGE within the frame — occupying 55-65% of the total image height (NOT smaller). The product is centered horizontally and positioned in the LOWER-MIDDLE of the frame: its vertical center sits at approximately 60% down from the top. Top 25% of frame is empty space (for logo composite later). Bottom 10-15% of frame is empty space below the product (so it doesn't touch the bottom edge). Generous side margins — product does not touch left or right edges. Think editorial furniture catalog: a clearly visible, prominently sized product with breathing room, not a tiny thumbnail floating in white space.

LIGHTING:
- Soft, even studio lighting from upper-front, producing one subtle natural ground shadow directly beneath the product. Cool-neutral color temperature — no warm yellow cast, no cool blue cast — colors true to the product's actual hue.

UPPER AREA:
- Leave the top 18% of the image as completely clean, empty #F0F0EE space. Do NOT draw, render, hallucinate, or paint any logo, text, wordmark, signature, watermark, brand name, letterforms, or graphic mark in this area. The top must be perfectly empty #F0F0EE — a real logo will be composited onto this space afterwards. Treat the top as untouched canvas.

STRICT EXCLUSIONS — the image must NOT contain any of:
- Logos, wordmarks, brand names, signatures, watermarks, text of any kind
- Arrows, icons, glyphs, UI elements, corner marks
- Studio backdrops, cyc walls, floors, surfaces, platforms, plinths, horizon lines
- Gradients, vignettes, environmental shadows extending beyond the product
- Any human figures, hands, body parts, faces, reflections
- Any other furniture or props
Only the product itself, with a soft contact shadow directly beneath it where it touches the ground, on the clean background described above.`;
}

function preservationBlock(enabled: boolean): string {
  if (!enabled) return '';
  return `

CRITICAL PRESERVATION REQUIREMENTS — READ CAREFULLY:
Treat the attached source image as the immutable ground truth for the PRODUCT itself (silhouette, proportions, materials, detailing). The COMPOSITION around the product should follow the Kanabco brand format above (small product, lots of negative space), but the product's own shape and design must not be altered.

Maintain pixel-faithfully (about the product only):
- The exact silhouette and outline of the product
- All internal proportions, panel positions, and component placements
- Every seam, edge, joint, and structural detail
- Material surface patterns, drape, grain, or texture
- All spatial relationships within the product

If you cannot make the requested fabric/color change without altering preserved elements, output with NO product changes rather than introducing unwanted alterations. Do not "improve", "enhance", "optimize", or "beautify" anything that was not specifically requested. The goal is surgical modification, not creative reinterpretation.

Note: the new image will be RECOMPOSED in the Kanabco format (smaller product, more negative space). The PRODUCT shape and detail is preserved; the FRAMING is repositioned.`;
}

function fabricClause(state: StudioState): string {
  const f = fabrics.find(x => x.id === state.fabric);
  if (state.fabric === 'keep' || !f) {
    return `Keep the material, color, finish, and all visible detailing exactly as they appear in the source image — do not change colors, materials, or finishes.`;
  }
  const c = colors.find(x => x.id === state.color);
  if (!c) return '';
  return `Re-render in ${f.name.toLowerCase()} in ${c.desc} (${f.tex}).`;
}

function getProductShape(state: StudioState, productCatalog: CustomProduct[]): string | null {
  if (!state.product) return null;
  if (state.product === 'one_off') {
    return state.productOneOffShape || null;
  }
  const p = productCatalog.find(x => x.id === state.product);
  return p?.shape || null;
}

export function buildPrompt(state: StudioState, productCatalog: CustomProduct[]): string | null {
  const shape = getProductShape(state, productCatalog);
  if (!shape) return null;

  const preservation = preservationBlock(state.preservationLock);

  if (state.shot === 'brand_conversion') {
    return `Restyle this product photo as a complete Kanabco-format catalog image.

Subject: a ${shape}. ${fabricClause(state)} Preserve every signature design feature (joinery, seams, hardware, surface details).

${studioStandards()}

Style: high-end furniture catalog photography, photorealistic, sharp detail, magazine-grade.${preservation}`;
  }

  if (state.shot === 'catalog') {
    return `Edit this Kanabco product photo. ${fabricClause(state)}

Subject: a ${shape}. Keep absolutely unchanged: silhouette, proportions, every component position, all detailing, frame, base.

${studioStandards()}

Style: high-end furniture catalog photography, photorealistic, sharp detail, magazine-grade.${preservation}`;
  }

  if (state.shot === 'detail') {
    const focusMap: Record<string, string> = {
      fabric_texture: 'the surface texture filling 70% of the frame',
      stitching: 'a single seam or stitch line — show thread, tension, and material on both sides',
      button_tufting: 'one tufted button pulled into the upholstery, showing the dimple and fabric gather around it',
      channel_tufting: 'two or three vertical ribbed channels meeting — show the soft fold between cushions, how the fabric tucks into the seam, and the dimensional shadows between ribs',
      piping: 'a length of contrast piping running along a corner or seam — show the cord under the fabric, the precise stitch on either side, and the way the piping defines the silhouette',
      leg_base: 'the leg or base meeting the upper structure — show material contrast and shadow',
      corner: 'a corner edge or profile — show the silhouette and how materials wrap or meet',
      cushion_arrangement: 'a tight composition of the layered cushions — show how they stack, the contrast in textures and tones',
      curve_profile: 'a tight shot along a curved edge — show the silhouette flowing in and out of frame, the way surface stretches around the curve, and the soft light gradient along the form',
      wood_grain: 'a tight shot of the wood surface — show the natural grain pattern, the depth of the finish, and how light catches the grain',
      hardware: 'a hardware element (handle, knob, hinge, or bracket) — show its form, finish, and how it meets the surrounding surface',
      material_join: 'the precise line where two different materials meet (e.g., wood-to-fabric, metal-to-stone) — show the contrast and the joinery detail'
    };
    const focus = focusMap[state.detail] || focusMap.fabric_texture;
    const f = fabrics.find(x => x.id === state.fabric);
    const fabricDesc = state.fabric === 'keep' || !f
      ? 'as it appears in the source image'
      : `${f.name.toLowerCase()} (${f.tex})`;
    return `Take this Kanabco ${shape} and create an extreme tactile close-up: ${focus}.

The material should be rendered ${fabricDesc} — faithfully showing structure, light absorption, and micro-shadows in the texture.

Framing: tight crop — the subject fills 70-80% of the frame. Not a small floating product on a large field; a close-up where the texture/detail is the dominant visual element.

Soft directional lighting from the upper left to show depth. Shallow depth of field, gentle bokeh in the background. Keep a clean #F0F0EE backdrop (cool light gray, RGB 240/240/238, NOT pure white, NOT warm, NOT cream) — no environment, no surface, no horizon.

The image must NOT contain any logos, brand names, wordmarks, signatures, watermarks, text, arrows, icons, glyphs, UI elements, corner marks, or any other graphic mark.

Style: premium tactile material photography, photorealistic, the kind of detail shot used on a luxury furniture brand's website.${preservation}`;
  }

  if (state.shot === 'lifestyle') {
    const s = settings.find(x => x.id === state.setting);
    const f = fabrics.find(x => x.id === state.fabric);
    if (!s) return null;
    const fabricDesc = state.fabric === 'keep' || !f ? '' : ` (re-rendered in ${f.name.toLowerCase()})`;
    return `Take this Kanabco ${shape}${fabricDesc} and place it inside ${s.desc}.

Composition: product anchored as the hero of the scene, room visible around it, natural human-eye level perspective. Mood: warm, airy, editorial.

Keep the exact product silhouette, proportions, and detailing identical to the source image — only the environment changes.

The image must NOT contain any logos, brand names, wordmarks, signatures, watermarks, text, arrows, icons, or UI glyphs anywhere in the frame. The room is bare of branding.

Photorealistic interior photography style, soft natural daylight from a window, warm neutral color palette, shallow depth of field. The product is the clear focal point of the room — well-lit, prominently positioned, occupying the central focus of the frame at roughly 50% of frame width.

Style: editorial interior photography, photorealistic, Architectural Digest / Kinfolk quality.${preservation}`;
  }

  if (state.shot === 'angle') {
    const angleMap: Record<string, string> = {
      three_quarter: 'a three-quarter front angle (camera positioned at roughly 30° off-center, slightly above the product)',
      front: 'a perfectly head-on straight-front view',
      side: 'a direct side profile view, camera level with the product',
      topdown: 'a flat top-down view from directly overhead, like a flat-lay',
      back_quarter: 'a three-quarter rear angle showing the back and side of the piece'
    };
    const angleDesc = angleMap[state.angle] || angleMap.three_quarter;
    return `Show this exact ${shape} from ${angleDesc}.

${fabricClause(state)} Keep identical to source: silhouette, proportions, every component position, all detailing, frame, base.

${studioStandards()}

Show the product from a ${angleDesc} angle, but keep all other framing identical to a standard catalog shot: product size 55-65% of frame height, centered horizontally, vertical center at ~60% down from top.

Style: high-end furniture catalog photography, photorealistic, sharp detail, magazine-grade. Visually consistent with other Kanabco catalog shots so this image sits naturally alongside them in a product gallery.${preservation}`;
  }

  return null;
}

export function buildEntryMeta(
  state: StudioState,
  productCatalog: CustomProduct[]
): { title: string; subtitle: string } {
  let productName = 'Unknown';
  if (state.product === 'one_off') {
    productName = state.productOneOffName || 'Custom one-off';
  } else if (state.product) {
    const p = productCatalog.find(x => x.id === state.product);
    productName = p?.name || 'Unknown';
  }

  const f = fabrics.find(x => x.id === state.fabric);
  const c = colors.find(x => x.id === state.color);
  const shotName = {
    brand_conversion: 'Brand conversion',
    catalog: 'Catalog',
    detail: 'Detail close-up',
    lifestyle: 'Lifestyle scene',
    angle: 'New angle'
  }[state.shot];
  return {
    title: `${productName} · ${shotName}`,
    subtitle: state.fabric === 'keep' ? 'original material' : `${f?.name.toLowerCase() || ''} · ${c?.name.toLowerCase() || ''}`,
  };
}
