import { fabrics, colors, settings, details, stViews } from './data';
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
Only the product itself, with a soft contact shadow directly beneath it where it touches the ground, on the clean background described above.

REFERENCE STYLE — match this visual format:
Premium editorial furniture catalog photography. Almost-monochromatic composition: a single product sitting in a vast empty field of soft cool-light-gray (#F0F0EE), no environment, no surface, no horizon. The product fills the lower-middle of the frame with calm, spacious negative space above and around it. Lighting is flat, even, top-front, like a studio softbox — colors are true to the product, no warm cast, no cool cast. The contact shadow beneath the product is BARELY visible — a faint, soft halo rather than a defined shadow. The overall feel is calm, restrained, expensive — the kind of hero shot on a luxury Italian furniture brand's catalog page.`;
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

/**
 * The slot the per-view instruction gets substituted into. The user can hand-edit
 * the master prompt in the studio textarea — as long as this token survives, all
 * five views inherit the edit. If they delete it, buildStSetPrompts appends the
 * view instruction instead so the set still renders.
 */
export const ST_VIEW_TOKEN = '[[VIEW]]';

/**
 * KANABCO ST — the five-view catalog set, written ONCE.
 * Every angle in the set is this exact prompt with [[VIEW]] swapped out, so all
 * five come back as one coherent shoot rather than five unrelated renders.
 */
function buildStMasterPrompt(shape: string, state: StudioState): string {
  return `KANABCO ST — SINGLE-VIEW RENDER FROM A FIVE-VIEW CATALOG SET.

The attached source photo shows a ${shape}. You are re-rendering that exact piece of furniture for a five-angle Kanabco catalog set: ¾ Hero, Front 0°, Left 90°, Back 180°, Right 270°. This request renders ONE view of that set.

THIS VIEW: ${ST_VIEW_TOKEN}

Output exactly ONE image containing exactly ONE product from that single viewpoint. Do NOT output a grid, a contact sheet, a collage, a turntable strip, side-by-side panels, or more than one view in the frame.

VIEWPOINT IS THE ONLY THING THAT CHANGES:
This is a camera/turntable rotation, not a redesign. Think of the piece sitting on a rotating platform in a studio: the camera never moves, the product turns. Re-render the SAME piece — same silhouette, same proportions, same joinery, same seams, same cushion count and arrangement, same legs and base, same material, same colour — simply seen from the stated angle.
- The rotation must be UNMISTAKABLE. Do NOT default to reproducing the source photo's viewpoint. If the source already happens to show this exact angle, match it; otherwise the rendered viewpoint MUST visibly differ from the source.
- Infer the unseen sides honestly from the piece's design logic. A back at 180° should look like the genuine back of THIS sofa — same upholstery, same panel lines, same finish quality — not an invented decorative rear.
- Every part visible in more than one view must be identical across views: same number of cushions, same seam placement, same leg style, same fabric nap direction, same colour value.

SET CONSISTENCY — these five images will sit in a row on a product page:
- Identical camera distance, identical focal length feel, identical product scale in frame across all five views. The piece must not grow or shrink between angles.
- Identical background, identical lighting setup, identical shadow softness and direction, identical colour temperature.
- Identical eye level: camera slightly above the seat, level horizon, no dutch tilt, no dramatic low or high angle (the ¾ Hero looks gently down; the four elevations are level).
- The product's vertical centre sits at the same height in the frame in all five images.

${fabricClause(state)}

${studioStandards()}

Catalog framing applies to this view: product occupies 55-65% of frame height, centred horizontally, generous negative space, clean empty top 18%. For side and rear views, scale to the piece's longest visible dimension at that angle so the product reads the same size as in the hero.

Style: high-end furniture catalog photography, photorealistic, sharp detail, magazine-grade. This image must sit naturally beside the other four views of the set — a viewer scrolling the row should read it as the same object photographed once and rotated, not as five different sofas.${preservationBlock(state.preservationLock)}`;
}

/**
 * Expands the (possibly hand-edited) master prompt into one prompt per view.
 */
export function buildStSetPrompts(
  masterPrompt: string
): { id: string; name: string; prompt: string }[] {
  return stViews.map(v => ({
    id: v.id,
    name: v.name,
    prompt: masterPrompt.includes(ST_VIEW_TOKEN)
      ? masterPrompt.split(ST_VIEW_TOKEN).join(v.desc)
      : `${masterPrompt}\n\nTHIS VIEW: ${v.desc}`,
  }));
}

export function buildPrompt(state: StudioState, productCatalog: CustomProduct[]): string | null {
  const shape = getProductShape(state, productCatalog);
  if (!shape) return null;

  const preservation = preservationBlock(state.preservationLock);

  if (state.shot === 'kanabco_st') {
    return buildStMasterPrompt(shape, state);
  }

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
    const c = colors.find(x => x.id === state.color);
    const fabricDesc = state.fabric === 'keep' || !f
      ? 'as it appears in the source image'
      : `${f.name.toLowerCase()}${c ? ' in ' + c.desc : ''} (${f.tex})`;
    return `Take this Kanabco ${shape} and create an extreme tactile close-up: ${focus}.

The material should be rendered ${fabricDesc} — faithfully showing structure, light absorption, and micro-shadows in the texture.

Framing: tight crop — the subject fills 70-80% of the frame. Not a small floating product on a large field; a close-up where the texture/detail is the dominant visual element.

Soft directional lighting from the upper left to show depth. Shallow depth of field, gentle bokeh in the background. Keep a clean #F0F0EE backdrop (cool light gray, RGB 240/240/238, NOT pure white, NOT warm, NOT cream) — no environment, no surface, no horizon.

The image must NOT contain any logos, brand names, wordmarks, signatures, watermarks, text, arrows, icons, glyphs, UI elements, corner marks, or any other graphic mark.

REFERENCE STYLE — match this visual format:
Premium tactile material photography. Extreme close-up where the fabric weave, fiber, stitching, or surface texture is the dominant visual element. Every thread, fold, crease, and micro-shadow is rendered with crisp detail. Lighting is soft and directional from the upper-left, revealing the material's structure and depth. Background is a soft, blurred, neutral off-white field with gentle creamy bokeh — out of focus, not competing for attention. The feel is the detail-shot you'd see on a luxury Italian furniture brand's product page.

Style: premium tactile material photography, photorealistic, the kind of detail shot used on a luxury furniture brand's website.${preservation}`;
  }

  if (state.shot === 'lifestyle') {
    const s = settings.find(x => x.id === state.setting);
    const f = fabrics.find(x => x.id === state.fabric);
    const c = colors.find(x => x.id === state.color);
    if (!s) return null;
    const fabricDesc = state.fabric === 'keep' || !f
      ? ''
      : ` (re-rendered in ${f.name.toLowerCase()}${c ? ' in ' + c.desc : ''})`;
    return `Take this Kanabco ${shape}${fabricDesc} and place it inside ${s.desc}.

Composition: product anchored as the hero of the scene, room visible around it, natural human-eye level perspective. Mood: warm, airy, editorial.

Keep the exact product silhouette, proportions, and structural detailing identical to the source image. ${state.fabric === 'keep' || !f
      ? 'Keep the material, color, and finish unchanged from the source.'
      : `The material and color MUST change as specified above: re-render the upholstery in ${f.name.toLowerCase()}${c ? ' in ' + c.desc : ''}. Do not leave it the source color — apply the new color faithfully across the entire upholstered surface.`} Only the product's environment changes around it.

STRICT EXCLUSIONS — the image must NOT contain any of:
- Logos, wordmarks, brand names, signatures, watermarks, text of any kind
- Arrows (↗, ➜, or any other), icons, glyphs, UI elements, corner marks, save buttons, share buttons, Pinterest-style overlays, "external link" indicators, decorative graphic elements
- Any other furniture or props that compete with the product as focal point
- Human figures, hands, body parts, faces, reflections
The room itself is bare of branding, signage, or any graphic overlay. Only the styled room and the Kanabco product within it.

Photorealistic interior photography style, soft natural daylight from a window, warm neutral color palette, shallow depth of field. The product is the clear focal point of the room — well-lit, prominently positioned, occupying the central focus of the frame at roughly 50% of frame width.

Style: editorial interior photography, photorealistic, Architectural Digest / Kinfolk quality — but WITHOUT any of the website overlays, share-icons, or save-buttons those magazines' digital editions often have.${preservation}`;
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
    return `VIEWPOINT CHANGE — render the same product from a NEW camera angle.

The source image shows a ${shape}. Re-render this exact same piece of furniture — recognizably the same product (same shape language, same joinery, same materials, same proportions, same color) — but seen from ${angleDesc}.

This is a viewpoint/camera-angle change. The product must be visibly rotated relative to the camera so the new angle is UNMISTAKABLE — do NOT simply reproduce the source image's viewpoint:
- "straight-front view" = camera dead-on with the product, no rotation, perfectly head-on
- "three-quarter front" = camera rotated ~30° off-center, slightly above
- "side profile" = camera 90° to the side, level with the product — you see the side silhouette, NOT the front
- "top-down flat-lay" = camera directly overhead pointing straight down — you see the top surface of the product, NOT the side
- "three-quarter back" = camera rotated ~30° behind, you see the back and one side of the piece

If the source image already happens to show ${angleDesc}, that's fine. Otherwise the rendered viewpoint MUST differ from the source — that is the entire purpose of this shot.

${fabricClause(state)}

Preserve the product's DESIGN DNA — the shape language, the joinery, the materials, the signature details, the color/fabric. What changes is the CAMERA POSITION, not the product itself.

${studioStandards()}

Catalog framing applies: product size 55-65% of frame height (relative to whichever dimension is longest at the new angle — for top-down, scale to the longer of width/height), centered, with generous negative space. Background, lighting, color treatment, and shadow style match the rest of the catalog set.

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
    angle: 'New angle',
    kanabco_st: 'Kanabco ST (5-view set)'
  }[state.shot];
  return {
    title: `${productName} · ${shotName}`,
    subtitle: state.fabric === 'keep' ? 'original material' : `${f?.name.toLowerCase() || ''} · ${c?.name.toLowerCase() || ''}`,
  };
}
