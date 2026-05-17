import { GoogleGenerativeAI } from '@google/generative-ai';

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenerativeAI(key);
}

/**
 * Analyzes a product image and returns category + suggested name + full shape description.
 * The studio can use this either to match an existing catalog item OR to pre-fill
 * a one-off custom product so the user only has to tweak.
 */
export async function analyzeProductImage(imageBase64: string, mimeType: string) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are an expert at identifying furniture and interior products. Look at this product photo and respond with ONLY a JSON object (no markdown fences, no extra prose).

Identify:
1. CATEGORY — choose exactly one id:
   - "sofas" — sofas, sectionals, loveseats, daybeds
   - "chairs" — armchairs, accent chairs, dining chairs, lounge chairs
   - "tables" — coffee tables, side tables, dining tables, console tables
   - "storage" — TV units, media consoles, wardrobes, dressers, shelves, sideboards, bookcases
   - "beds" — beds, headboards, bed frames
   - "other" — anything else (lighting, rugs, accessories)

2. SUGGESTED_NAME — a short, professional product name, 2-5 words. Style examples:
   "Piped L-sectional", "Bouclé scoop armchair", "Oak floating TV console", "Round travertine coffee table", "Channel-tufted velvet bed".
   Be specific about silhouette + a defining material/feature.

3. SHAPE — ONE detailed sentence (15-35 words) describing form, signature features, and material/finish — written in the style this app uses for AI prompts. Examples:
   • "lounge armchair with a rounded scoop seat, curved bolster back, and angular flared legs in pale wood"
   • "low wall-mounted floating TV console with brushed oak veneer surface, matte black recessed handles, and a single slim drawer running its full length"
   • "round coffee table with a thick honed travertine top resting on a solid cylindrical travertine base, soft sculptural silhouette"
   Use lowercase, no leading article. Describe what you see clearly enough that another AI could redraw it.

4. COLOR — the dominant color/finish in plain words (e.g., "powder blue", "warm stone grey", "natural oak", "matte black").

5. MATERIAL — primary material guess from this set: linen, boucle, cotton, performance, leather_aged, velvet_light, chenille_light, wood_oak, wood_walnut, lacquer_matte, lacquer_gloss, metal_brushed, stone_marble. If unsure, return "keep".

Respond with EXACTLY this JSON shape (no other keys, no trailing comma):
{"category_id":"chairs","suggested_name":"Bouclé scoop armchair","shape":"lounge armchair with a rounded scoop seat, curved bolster back, and angular flared legs in pale wood","color_description":"soft powder blue","material_guess":"boucle"}`;

  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
    { text: prompt }
  ]);

  const text = result.response.text().trim();
  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Generates an edited image using Gemini's image generation model (Nano Banana).
 */
export async function generateImage(prompt: string, sourceImageBase64?: string, sourceMimeType?: string) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

  const parts: any[] = [];
  if (sourceImageBase64 && sourceMimeType) {
    parts.push({ inlineData: { data: sourceImageBase64, mimeType: sourceMimeType } });
  }
  parts.push({ text: prompt });

  const result = await model.generateContent(parts);
  const response = result.response;

  for (const candidate of response.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        return {
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }
  }

  throw new Error('No image returned from Gemini');
}
