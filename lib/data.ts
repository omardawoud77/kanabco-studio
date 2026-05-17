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
  { id: 'angle', name: 'New angle', icon: '↻', desc: 'Different camera view' }
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
