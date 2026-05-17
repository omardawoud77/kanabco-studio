import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { analyzeProductImage } from '@/lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { image, mime } = await req.json();
    if (!image || !mime) return NextResponse.json({ error: 'Missing image' }, { status: 400 });

    const result = await analyzeProductImage(image, mime);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Analyze error:', err);
    return NextResponse.json({ error: err?.message || 'Analysis failed' }, { status: 500 });
  }
}
