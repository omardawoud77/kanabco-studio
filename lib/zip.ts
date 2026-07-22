/**
 * Minimal ZIP builder (store method, no compression) — dependency-free.
 *
 * PNGs are already compressed, so "store" costs nothing over deflate here,
 * and ~80 lines beats shipping a zip library for one download button.
 * Entries are named under a top-level folder so extraction produces a folder.
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: (((d.getFullYear() - 1980) & 0x7f) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export function buildZip(files: { name: string; data: Uint8Array }[]): Blob {
  const encoder = new TextEncoder();
  const now = dosDateTime(new Date());
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  const le16 = (v: DataView, o: number, x: number) => v.setUint16(o, x, true);
  const le32 = (v: DataView, o: number, x: number) => v.setUint32(o, x, true);

  for (const f of files) {
    const name = encoder.encode(f.name);
    const crc = crc32(f.data);

    const lfh = new Uint8Array(30 + name.length);
    const lv = new DataView(lfh.buffer);
    le32(lv, 0, 0x04034b50);
    le16(lv, 4, 20);            // version needed
    le16(lv, 6, 0x0800);        // flags: UTF-8 names
    le16(lv, 8, 0);             // method: store
    le16(lv, 10, now.time);
    le16(lv, 12, now.date);
    le32(lv, 14, crc);
    le32(lv, 18, f.data.length);
    le32(lv, 22, f.data.length);
    le16(lv, 26, name.length);
    le16(lv, 28, 0);
    lfh.set(name, 30);
    localParts.push(lfh, f.data);

    const cdh = new Uint8Array(46 + name.length);
    const cv = new DataView(cdh.buffer);
    le32(cv, 0, 0x02014b50);
    le16(cv, 4, 20);            // version made by
    le16(cv, 6, 20);            // version needed
    le16(cv, 8, 0x0800);
    le16(cv, 10, 0);
    le16(cv, 12, now.time);
    le16(cv, 14, now.date);
    le32(cv, 16, crc);
    le32(cv, 20, f.data.length);
    le32(cv, 24, f.data.length);
    le16(cv, 28, name.length);
    le32(cv, 42, offset);       // local header offset
    cdh.set(name, 46);
    centralParts.push(cdh);

    offset += lfh.length + f.data.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  le32(ev, 0, 0x06054b50);
  le16(ev, 8, files.length);
  le16(ev, 10, files.length);
  le32(ev, 12, centralSize);
  le32(ev, 16, offset);

  return new Blob([...localParts, ...centralParts, eocd] as BlobPart[], {
    type: 'application/zip',
  });
}
