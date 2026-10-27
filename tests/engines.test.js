const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./load');
const { PDFLib } = L;

/* a PDF whose pages carry very different amounts of text, so sizes differ */
async function samplePdf(n = 24) {
  const doc = await PDFLib.PDFDocument.create();
  const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  for (let i = 0; i < n; i++) {
    const p = doc.addPage([595, 842]);
    const lines = [8, 60, 200][i % 3];
    for (let j = 0; j < lines; j++) p.drawText('Page ' + (i + 1) + ' line ' + j + ' ' + 'x'.repeat(20 + (j * 7) % 40), { x: 30, y: 800 - (j % 75) * 10, size: 8, font });
  }
  return new Uint8Array(await doc.save());
}

test('split by size: every part stays under its limit, and all pages are used once', async () => {
  const { Engine } = L.split();
  const e = await Engine.load(await samplePdf(), 'sample.pdf');
  await e.analyse();
  const limit = 20 * 1024;
  const parts = await e.planBySize([limit]);
  for (const p of parts) if (p.end - p.start > 1) assert.ok(p.size <= limit, 'part ' + p.part + ' is ' + p.size);
  const { missing, dup } = e.coverage(parts.map(p => [p.start, p.end]));
  assert.deepEqual(missing, []); assert.deepEqual(dup, []);
});

test('split: a different limit for each part, the last one repeating', async () => {
  const { Engine } = L.split();
  const e = await Engine.load(await samplePdf(), 'sample.pdf');
  await e.analyse();
  const parts = await e.planBySize([30 * 1024, 10 * 1024]);
  assert.equal(parts[0].target, 30 * 1024);
  assert.ok(parts.slice(1).every(p => p.target === 10 * 1024));
});

test('page ranges are read as people type them', async () => {
  const { Engine } = L.split();
  const e = await Engine.load(await samplePdf(10), 'sample.pdf');
  assert.deepEqual(e.parseRanges('1-3, 4, 5-end').ranges, [[0, 3], [3, 4], [4, 10]]);
  assert.equal(e.parseRanges('1-99').errors.length, 1);
  assert.equal(e.parseRanges('abc').errors.length, 1);
});

test('auto-split finds a new document where printed numbering restarts', () => {
  const D = L.detector();
  const pages = ['TAX INVOICE\nPage 1 of 2', 'rows\nPage 2 of 2', '  ', 'SHOW CAUSE NOTICE\nPage 1 of 3', 'x\nPage 2 of 3', 'y\nPage 3 of 3'];
  const found = D.detect(pages, { ink: [0.2, 0.2, 0.001, 0.2, 0.2, 0.2] });
  assert.deepEqual(found.map(b => b.page), [4]);
  assert.deepEqual(D.rangesFromCuts([3], 6, D.blankPages(pages, [0.2, 0.2, 0.001, 0.2, 0.2, 0.2])), [[0, 2], [3, 6]]);
  assert.deepEqual(D.parseOrder('3,1,2', 3).order, [2, 0, 1]);
  assert.deepEqual(D.parseOrder('4-2', 5).order, [3, 2, 1]);
});

test('page numbers skip blank pages, and continue or count them as chosen', () => {
  const N = L.numberer();
  assert.deepEqual(N.planNumbers(5, new Set([2]), 1, false), [1, 2, null, 3, 4]);
  assert.deepEqual(N.planNumbers(5, new Set([2]), 1, true), [1, 2, null, 4, 5]);
});

test('a point is placed correctly on pages saved turned 0, 90, 180 and 270 degrees', () => {
  const N = L.numberer();
  const W = 595, H = 842;
  /* the top-left corner of what the reader sees, on each turned page */
  assert.deepEqual(N.placeView(0, W, H, 0, 0), { x: 0, y: H, rotate: 0 });
  assert.deepEqual(N.placeView(90, W, H, 0, 0), { x: 0, y: 0, rotate: 90 });
  assert.deepEqual(N.placeView(180, W, H, 0, 0), { x: W, y: 0, rotate: 180 });
  assert.deepEqual(N.placeView(270, W, H, 0, 0), { x: W, y: H, rotate: -90 });
});

test('several pages per sheet: 9 pages four to a sheet make 3 sheets; a range leaves the rest alone', async () => {
  const I = L.imposer();
  const bytes = await samplePdf(9);
  const r = await I.impose(bytes, { per: 4, sheetMode: 'auto', gapMm: 4, marginMm: 6 });
  assert.equal(r.sheets, 3);
  const part = await I.impose(bytes, { per: 4, selected: new Set([2, 3, 4, 5]), keepOthers: true });
  assert.equal(part.sheets, 1 + 5);   // one sheet for pages 3-6, and the five others untouched
});

test('photo sizes: mm, cm, inches and pixels agree, and the DPI is written into the file', () => {
  const P = L.photo();
  assert.equal(P.toPx(35, 'mm', 300), 413);
  assert.equal(P.toPx(3.5, 'cm', 300), 413);
  assert.equal(P.toPx(2, 'in', 300), 600);
  assert.equal(P.toPx(350, 'px', 300), 350);
  /* a minimal JFIF header: density units and values are patched in place */
  const jpg = Uint8Array.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xFF, 0xD9]);
  const out = P.jpegSetDpi(jpg, 300);
  assert.equal(out[13], 1);
  assert.equal((out[14] << 8) | out[15], 300);
  assert.equal((out[16] << 8) | out[17], 300);
  assert.equal(P.crc32(Uint8Array.from([0x49, 0x45, 0x4E, 0x44])), 0xAE426082);   // the CRC every PNG IEND chunk carries
});

test('background mask clean-up keeps the person and drops a stray patch', () => {
  const S = L.seg();
  const w = 40, h = 40, a = new Float32Array(w * h);
  for (let y = 10; y < 38; y++) for (let x = 12; x < 28; x++) a[y * w + x] = 1;   // the person
  a[2 * w + 2] = a[2 * w + 3] = a[3 * w + 2] = 0.9;                               // a stray patch
  const out = S.cleanup(a, w, h);
  assert.ok(out[20 * w + 20] > 0.9);
  assert.ok(out[2 * w + 2] < 0.2);
  const g = S.guidedFilter(new Float32Array(w * h).fill(0.5), out, w, h, 3, 1e-3);
  assert.ok(g.every(v => v >= 0 && v <= 1));
});
