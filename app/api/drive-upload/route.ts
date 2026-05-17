import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { uploadToDrive } from '@/lib/drive';

// googleapis depends on Node built-ins (e.g. `stream`), so this route can't run on edge.
export const runtime = 'nodejs';

interface UploadBody {
  generationId: string;
  imageDataUrl: string;
  productName: string;
  filename: string;
}

function decodeDataUrl(dataUrl: string): Buffer {
  const match = /^data:[^;]+;base64,(.+)$/.exec(dataUrl);
  const b64 = match ? match[1] : dataUrl;
  return Buffer.from(b64, 'base64');
}

function sanitizeProductName(name: string): string {
  return name.trim().replace(/[\/\\]+/g, '-') || 'Untitled';
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as Partial<UploadBody>;
    if (!body.generationId || !body.imageDataUrl || !body.productName || !body.filename) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const buffer = decodeDataUrl(body.imageDataUrl);
    const safeName = sanitizeProductName(body.productName);

    const { fileId, webViewLink } = await uploadToDrive(buffer, body.filename, safeName);

    // Codebase uses `library_entries`; spec referenced a non-existent `generations` table.
    const { error: updateErr } = await supabase
      .from('library_entries')
      .update({ drive_file_id: fileId, drive_view_link: webViewLink })
      .eq('id', body.generationId)
      .eq('user_id', user.id);
    if (updateErr) {
      return NextResponse.json(
        { message: `DB update failed: ${updateErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, viewLink: webViewLink });
  } catch (err: any) {
    const errorMessage = err?.message || 'Unknown error';
    const errorCode = err?.code || err?.status || 'NO_CODE';
    const errorDetails = err?.errors || err?.response?.data || null;
    console.error('[drive-upload] FAILED:', {
      message: errorMessage,
      code: errorCode,
      details: errorDetails,
      stack: err?.stack,
    });
    return NextResponse.json(
      {
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}
