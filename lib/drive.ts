import { google, drive_v3 } from 'googleapis';
import { Readable } from 'node:stream';

// Per-process cache: "rootId::productName" → subfolder fileId
const folderCache = new Map<string, string>();

function getRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set');
  }
  return id;
}

function getDriveClient(): drive_v3.Drive {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set');
  }
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return google.drive({ version: 'v3', auth });
}

async function findOrCreateSubfolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string
): Promise<string> {
  const cacheKey = `${parentId}::${name}`;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;

  // Escape backslashes and single-quotes for Drive's `q` syntax
  const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const q =
    `mimeType='application/vnd.google-apps.folder' and trashed=false ` +
    `and '${parentId}' in parents and name='${escaped}'`;

  const search = await drive.files.list({
    q,
    fields: 'files(id,name)',
    pageSize: 1,
    spaces: 'drive',
  });
  const existing = search.data.files?.[0]?.id;
  if (existing) {
    folderCache.set(cacheKey, existing);
    return existing;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  const newId = created.data.id;
  if (!newId) throw new Error('Drive folder create returned no id');
  folderCache.set(cacheKey, newId);
  return newId;
}

export async function uploadToDrive(
  buffer: Buffer,
  filename: string,
  productName: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient();
  const rootId = getRootFolderId();

  const subfolderId = await findOrCreateSubfolder(drive, rootId, productName);

  const uploadRes = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [subfolderId],
    },
    media: {
      mimeType: 'image/png',
      body: Readable.from(buffer),
    },
    fields: 'id',
  });
  const fileId = uploadRes.data.id;
  if (!fileId) throw new Error('Drive upload returned no file id');

  // No public-share permission grant — personal Drive accounts return 403
  // for `type: 'anyone'`. The file lives in the owner's folder; the link
  // below opens for them once signed into the owning Google account.
  const meta = await drive.files.get({
    fileId,
    fields: 'webViewLink',
  });
  const webViewLink =
    meta.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

  return { fileId, webViewLink };
}
