// PNG mínimo (RGBA/RGB/paleta 8 bits, sin entrelazado) para editar píxeles sin dependencias.
const zlib = require('zlib');
const fs = require('fs');
function read(file) {
  const b = fs.readFileSync(file); let p = 8, w, h, ct, idat = [], pal = null, trns = null;
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12]) throw new Error('png no soportado'); }
    else if (type === 'PLTE') pal = d; else if (type === 'tRNS') trns = d; else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const bpp = { 6: 4, 2: 3, 3: 1, 0: 1, 4: 2 }[ct]; const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp, out = Buffer.alloc(w * h * 4), prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]; raw.copy(cur, 0, y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, up = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = cur[i];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pp = a + up - c, pa = Math.abs(pp - a), pb = Math.abs(pp - up), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, s = x * bpp;
      if (ct === 6) cur.copy(out, o, s, s + 4);
      else if (ct === 2) { out[o] = cur[s]; out[o + 1] = cur[s + 1]; out[o + 2] = cur[s + 2]; out[o + 3] = 255; }
      else if (ct === 3) { const k = cur[s]; out[o] = pal[k * 3]; out[o + 1] = pal[k * 3 + 1]; out[o + 2] = pal[k * 3 + 2]; out[o + 3] = trns && k < trns.length ? trns[k] : 255; }
      else if (ct === 0) { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = 255; }
      else { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = cur[s + 1]; }
    }
    cur.copy(prev);
  }
  return { w, h, data: out };
}
function crc32(buf) { let c, crc = ~0; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; }
function chunk(type, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function write(file, img) {
  const { w, h, data } = img; const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; data.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}
const blank = (w, h) => ({ w, h, data: Buffer.alloc(w * h * 4) });
const get = (img, x, y) => { if (x < 0 || y < 0 || x >= img.w || y >= img.h) return [0, 0, 0, 0]; const o = (y * img.w + x) * 4; return [...img.data.subarray(o, o + 4)]; };
const set = (img, x, y, c) => { if (x < 0 || y < 0 || x >= img.w || y >= img.h) return; const o = (y * img.w + x) * 4; img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = c[3]; };
const frame = (sheet, f) => { const im = blank(48, 88); for (let y = 0; y < 88; y++) for (let x = 0; x < 48; x++) set(im, x, y, get(sheet, f * 48 + x, y)); return im; };
const hex = (c) => c[3] < 128 ? '..' : null;
module.exports = { read, write, blank, get, set, frame };
