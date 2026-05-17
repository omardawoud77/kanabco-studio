import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { generateImage } from '@/lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { prompt, sourceImage, sourceMime } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const result = await generateImage(prompt, sourceImage || undefined, sourceMime || undefined);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Generate error:', err);
    return NextResponse.json(
      { error: err?.message || 'Generation failed' },
      { status: 500 }
    );
  }
}
