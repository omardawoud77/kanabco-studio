import type { Fabric, Color, Shot } from './types';

// Products are now stored per-team in the database (see custom_products table)
// Categories are seeded globally (see migration_002_categories.sql)

export const fabrics: Fabric[] = [
  { id: 'keep', name: 'Keep original (no swap)', tex: '' },
  { id: 'linen', name: 'Light linen', tex: 'natural slubbed weave, soft drape, matte finish, visible threads' },
  { id: 'boucle', name: 'Light bouclé', tex: 'looped textured pile, soft cloudy surface, matte, summery weight' },
  { id: 'cotton', name: 'Washed cotton', tex: 'soft brushed surface, slightly faded look, breathable matte finish' },
  { id: 'performance', name: 'Performance weave', tex: 'tight woven outdoor-grade texture, subtle sheen, durable feel' },
  { id: 'leather_aged', name: 'Pale aged leather', tex: 'soft worn leather, light patina, matte chalky finish' },
  { id: 'velvet_light', name: 'Light cotton velvet', tex: 'low-pile soft velvet, subtle sheen, dusty matte finish' },
  { id: 'chenille_light', name: 'Light chenille', tex: 'soft brushed chenille with a gentle nap, matte, summery feel' },
  { id: 'wood_oak', name: 'Oak wood finish', tex: 'warm natural oak with visible grain, matte sealed finish' },
  { id: 'wood_walnut', name: 'Walnut wood finish', tex: 'rich dark walnut with deep grain, satin sheen finish' },
  { id: 'lacquer_matte', name: 'Matte lacquer', tex: 'smooth flawless matte lacquer surface, no visible texture' },
  { id: 'lacquer_gloss', name: 'Glossy lacquer', tex: 'high-gloss reflective lacquer surface, mirror-like finish' },
  { id: 'metal_brushed', name: 'Brushed metal', tex: 'directional brushed metal texture, matte satin finish' },
  { id: 'stone_marble', name: 'Marble veining', tex: 'natural marble surface with characteristic veining, polished smooth' }
];

export const colors: Color[] = [
  { id: 'sand', name: 'Sand', desc: 'warm sandy beige' },
  { id: 'cream', name: 'Off-white cream', desc: 'soft creamy off-white' },
  { id: 'terracotta', name: 'Terracotta', desc: 'warm sun-baked terracotta' },
  { id: 'sage', name: 'Sage green', desc: 'muted dusty sage green' },
  { id: 'powder', name: 'Powder blue', desc: 'soft pale powder blue' },
  { id: 'butter', name: 'Butter yellow', desc: 'soft pale butter yellow' },
  { id: 'blush', name: 'Soft blush', desc: 'muted dusty blush pink' },
  { id: 'olive', name: 'Light olive', desc: 'pale warm olive green' },
  { id: 'stone', name: 'Warm stone grey', desc: 'soft warm stone grey' },
  { id: 'navy', name: 'Deep navy', desc: 'rich deep navy blue' },
  { id: 'charcoal', name: 'Charcoal', desc: 'deep warm charcoal grey' },
  { id: 'forest', name: 'Forest green', desc: 'deep moody forest green' },
  { id: 'cognac', name: 'Cognac', desc: 'warm rich cognac brown' },
  { id: 'rust', name: 'Rust', desc: 'deep autumnal rust orange' },
  { id: 'plum', name: 'Plum', desc: 'muted deep plum purple' },
  { id: 'white_pure', name: 'Pure white', desc: 'crisp clean pure white' },
  { id: 'black', name: 'Matte black', desc: 'deep matte black' }
];

export const shots: Shot[] = [
  { id: 'brand_conversion', name: 'Brand conversion', icon: '⇄', desc: 'New photo → Kanabco format' },
  { id: 'catalog', name: 'Catalog', icon: '▢', desc: 'Same angle, new fabric' },
  { id: 'detail', name: 'Detail close-up', icon: '◉', desc: 'Tactile texture shot' },
  { id: 'lifestyle', name: 'Lifestyle scene', icon: '⌂', desc: 'Full room context' },
  { id: 'angle', name: 'New angle', icon: '↻', desc: 'Different camera view' },
  { id: 'kanabco_st', name: 'Kanabco ST', icon: '⬚', desc: 'All 5 angles, one click' }
];

// The Kanabco ST set — one source photo in, five catalog views out.
// Turntable convention: the product rotates, the camera stays put.
// 0° = front of the piece faces the camera.
export const stViews = [
  {
    id: 'hero',
    name: '¾ Hero',
    required: true,
    desc: 'a three-quarter hero view — the piece rotated roughly 35° so the camera sees the front and one full side at once, camera slightly above seat height looking gently down. This is the signature Kanabco hero angle: the most flattering read of the silhouette, depth and volume all visible in one frame.'
  },
  {
    id: 'front_0',
    name: 'Front 0°',
    required: false,
    desc: 'a perfectly head-on straight-front elevation at 0° — the camera dead-centre and square to the front face of the piece, zero rotation, zero perspective skew. Left and right sides are equally hidden; you see the front face flat-on, like an architectural elevation drawing.'
  },
  {
    id: 'left_90',
    name: 'Left 90°',
    required: false,
    desc: 'a TRUE SIDE ELEVATION seen from the piece\'s LEFT end. The camera sits level with the piece, its lens axis running parallel to the sofa\'s length, aimed straight at the LEFT end panel. The left arm/end panel is the closest and dominant plane, seen flat-on like an architectural side elevation; behind it the piece\'s length recedes in compressed perspective. What IS visible: the side silhouette — arm profile, seat depth front-to-back, backrest angle. What is NOT visible: the front face of the seat cushions, the interior of the seat, the face of the back panel. CHECK before finishing: if you can see into the seat, see the fronts of the cushions, or see the back panel face-on, the camera has drifted toward a three-quarter view — that is WRONG; return to a flat 90° profile. If the piece has a chaise or extension at its far end, that extension appears at the far end of the profile projecting to its correct side — never deleted.'
  },
  {
    id: 'back_180',
    name: 'Back 180°',
    required: false,
    desc: 'the rear elevation at 180° — the camera sees the BACK of the piece square-on. Show how the back is honestly finished: the outside back panel, its seams, the top edge of the backrest from behind, the tips of any back cushions peeking above. The front face and seat interior are NOT visible. For asymmetric pieces (L-sectional / chaise): apply honest geometry — a chaise projecting forward is largely hidden behind the body from a level rear camera, and a straight-looking back is then CORRECT; but keep the module count identical to the source, and if any part of the chaise would genuinely peek beyond the silhouette at this angle, keep it visible. Never change the number of modules or invent a decorative rear.'
  },
  {
    id: 'right_270',
    name: 'Right 270°',
    required: false,
    desc: 'a TRUE SIDE ELEVATION seen from the piece\'s RIGHT end — the mirror opposite of the Left 90° view. Imagine standing at the RIGHT end of the sofa, level with it, looking along its length toward the LEFT end: that is the camera. The RIGHT end of the piece is the closest and dominant plane, seen flat-on; the rest of the piece recedes behind it in compressed perspective. Visible: the right-end silhouette — arm or end-panel profile, seat depth, backrest angle. NOT visible: the front faces of the seat cushions, the seat interior, the back panel face-on. COMMON FAILURES — both WRONG: (1) rendering from BEHIND the sofa so the long back panel dominates; (2) drifting to a three-quarter view that shows the seat interior. The camera is at the END of the piece, never behind it. If the piece has a chaise projecting forward at this end, the chaise end panel is the nearest element — render it faithfully in front of the main body, never deleted. The piece has EXACTLY the modules the source shows: never add a second chaise, an extra seat block, or an ottoman behind or beside the real chaise — an L-sectional stays an L and must never appear as a U-shape from this angle.'
  }
];

export const angles = [
  { id: 'three_quarter', name: '3/4 front (signature)' },
  { id: 'front', name: 'Straight front' },
  { id: 'side', name: 'Side profile' },
  { id: 'topdown', name: 'Top-down flat-lay' },
  { id: 'back_quarter', name: '3/4 back' }
];

export const settings = [
  { id: 'med_terrace', name: 'Mediterranean terrace', desc: 'whitewashed walls, terracotta tile floor, soft linen curtains catching a sea breeze, a stoneware vase with an olive branch, late afternoon golden light through tall arched doorways' },
  { id: 'coastal', name: 'Coastal light room', desc: 'a bright airy room with linen curtains billowing, pale wood floors, raw plaster walls, a single ceramic vase with dried pampas, soft diffused morning light from large windows facing the sea' },
  { id: 'sunlit', name: 'Sunlit minimal interior', desc: 'a minimalist Cairo apartment with high ceilings, raw plaster walls in warm off-white, oak wood floors, sheer linen curtains filtering harsh midday sun into soft warm bands of light across the floor' },
  { id: 'rooftop', name: 'Egyptian rooftop lounge', desc: 'an open rooftop terrace at golden hour with views of palm trees and distant city skyline, woven rattan accents, a low brass tray with mint tea, warm directional sunlight from the side' },
  { id: 'garden', name: 'Garden patio', desc: 'a shaded garden patio with climbing jasmine, stone pavers, a weathered wood side table with a glass of lemon water, dappled sunlight through leaves, very natural light feel' },
  { id: 'gallery', name: 'Gallery-style loft', desc: 'a high-ceilinged gallery-style loft with polished concrete floors, raw white walls, a single sculptural floor lamp, and soft diffused light from clerestory windows — minimal, sculptural, museum-like' },
  { id: 'modern_bedroom', name: 'Modern bedroom', desc: 'a serene modern bedroom with linen bedding, oak wood floors, soft morning light, neutral wall colors, minimal styling' },
  { id: 'dining_room', name: 'Contemporary dining room', desc: 'a contemporary dining space with warm wood floors, sculptural pendant lighting, neutral walls, soft natural light from large windows' }
];

export const details = [
  { id: 'fabric_texture', name: 'Fabric texture & weave' },
  { id: 'stitching', name: 'Stitching & seams' },
  { id: 'button_tufting', name: 'Button tufting' },
  { id: 'channel_tufting', name: 'Channel / ribbed tufting' },
  { id: 'piping', name: 'Contrast piping' },
  { id: 'leg_base', name: 'Leg / base detail' },
  { id: 'corner', name: 'Corner & edge profile' },
  { id: 'cushion_arrangement', name: 'Cushion layering' },
  { id: 'curve_profile', name: 'Curve / arc profile' },
  { id: 'wood_grain', name: 'Wood grain / finish' },
  { id: 'hardware', name: 'Hardware (handles, hinges)' },
  { id: 'material_join', name: 'Material join (e.g., wood-to-fabric)' }
];

export const defaultState = {
  product: null,
  category: 'sofas',
  fabric: 'keep',
  color: 'sand',
  shot: 'brand_conversion' as const,
  angle: 'three_quarter',
  setting: 'med_terrace',
  detail: 'fabric_texture',
  preservationLock: true,
};
