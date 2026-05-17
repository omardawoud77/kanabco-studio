import { fabrics, colors, settings, details } from './data';
import type { StudioState, CustomProduct } from './types';

function studioStandards(): string {
  return `Kanabco brand format (match exactly):

BACKGROUND:
- Background: warm cream, hex #EDEAE3, RGB (237, 234, 227). This EXACT color, flat and uniform across the entire frame. No other shade, no warmer, no cooler, no lighter, no darker. Not white. Not gray. Not beige. Exactly #EDEAE3. The background must be a single solid color edge to edge. NO studio backdrop, NO floor, NO surface, NO platform, NO horizon line, NO cyc wall, NO gradient, NO vignette, NO color variation anywhere. The product sits directly on this flat #EDEAE3 field with only a very soft contact shadow directly beneath the product where it touches the ground.

COMPOSITION (CRITICAL — read carefully):
- Vertical portrait orientation, 2:3 aspect ratio (image taller than wide, roughly 1024×1536 pixels).
- The product is SMALL within the frame. It should occupy ONLY about 25-30% of the total image height. Do NOT fill the frame with the product.
- The product is positioned in the LOWER HALF of the image. Its top edge starts roughly 50-55% down from the top of the image, and its bottom rests around 70-75% down.
- The product is horizontally centered with comfortable margins on left and right (do not let it touch the side edges).
- The entire UPPER HALF of the image (top 50%) is EMPTY #EDEAE3 space. This is essential — generous breathing room above the product is the defining feature of this composition.
- The bottom ~25% of the image is also mostly empty (product sits ABOVE the bottom edge, not flush against it).
- Think editorial magazine layout: a small product floating in a large field of negative space, not a cropped close-up.

LIGHTING:
- Soft, even studio lighting from upper-front, producing one subtle natural ground shadow directly beneath the product.

UPPER AREA:
- Leave the top 18% of the image as completely clean, empty #EDEAE3 space. Do NOT draw, render, hallucinate, or paint any logo, text, wordmark, signature, watermark, brand name, letterforms, or graphic mark in this area. The top must be perfectly empty #EDEAE3 — a real logo will be composited onto this space afterwards. Treat the top as untouched canvas.`;
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

Style: high-end furniture catalog photography, photorealistic, sharp detail, magazine-grade. Remember: the product should be SMALL within the frame, sitting in the lower half, with generous empty gray space above and around it.${preservation}`;
  }

  if (state.shot === 'catalog') {
    return `Edit this Kanabco product photo. ${fabricClause(state)}

Subject: a ${shape}. Keep absolutely unchanged: silhouette, proportions, every component position, all detailing, frame, base.

${studioStandards()}

Style: high-end furniture catalog photography, photorealistic, sharp detail, magazine-grade. Remember: the product should be SMALL within the frame, sitting in the lower half, with generous empty gray space above and around it.${preservation}`;
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

Soft directional lighting from the upper left to show depth. Shallow depth of field, gentle bokeh in the background. Keep a clean #EDEAE3 backdrop (warm cream, RGB 237/234/227, NOT pure white, NOT gray) — no environment, no surface, no horizon. Do not include any logo, text, or watermark.

Style: premium tactile material photography, photorealistic, the kind of detail shot used on a luxury furniture brand's website.${preservation}`;
  }

  if (state.shot === 'lifestyle') {
    const s = settings.find(x => x.id === state.setting);
    const f = fabrics.find(x => x.id === state.fabric);
    if (!s) return null;
    const fabricDesc = state.fabric === 'keep' || !f ? '' : ` (re-rendered in ${f.name.toLowerCase()})`;
    return `Take this Kanabco ${shape}${fabricDesc} and place it inside ${s.desc}.

Composition: product anchored as the hero of the scene, room visible around it, natural human-eye level perspective. Mood: warm, airy, editorial.

Keep the exact product silhouette, proportions, and detailing identical to the source image — only the environment changes. Remove the original studio background. Do not include any logo, text, or watermark — this is a lifestyle shot.

Style: editorial interior photography, photorealistic, soft natural light, Architectural Digest / Kinfolk quality.${preservation}`;
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

Style: high-end furniture catalog photography, photorealistic, sharp detail, magazine-grade. Visually consistent with other Kanabco catalog shots so this image sits naturally alongside them in a product gallery. Remember: the product should be SMALL within the frame, sitting in the lower half, with generous empty gray space above and around it.${preservation}`;
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
