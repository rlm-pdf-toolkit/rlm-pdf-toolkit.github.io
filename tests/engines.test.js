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

/* ---------- document scanner ---------- */
/* a photograph of a sheet: a table, and a page seen at a slant through `H` */
function photoOfSheet(SC, W, Hh, sheetW, sheetH, quad, opts = {}) {
  const px = new Uint8ClampedArray(W * Hh * 4);
  const back = SC.homography(quad, [{ x: 0, y: 0 }, { x: sheetW, y: 0 }, { x: sheetW, y: sheetH }, { x: 0, y: sheetH }]);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const p = (y * W + x) * 4;
    const s = SC.apply(back, x + 0.5, y + 0.5);
    let c = [58, 46, 38];                                             // the table
    if (s.x >= 0 && s.x < sheetW && s.y >= 0 && s.y < sheetH) {
      const ink = (Math.floor(s.y / 9) % 2 === 0) && s.x > sheetW * 0.1 && s.x < sheetW * 0.9 && (Math.floor(s.x / 4) % 3 !== 0) && s.y > sheetH * 0.1 && s.y < sheetH * 0.9;
      const shade = opts.shadow ? 1 - 0.45 * (s.x / sheetW) : 1;       // light falling off across the page
      c = ink ? [30, 30, 90] : [238, 232, 214].map(v => v * shade);
    }
    px[p] = c[0]; px[p + 1] = c[1]; px[p + 2] = c[2]; px[p + 3] = 255;
  }
  return px;
}

test('scanner finds the four corners of a sheet photographed at a slant', () => {
  const SC = L.scanner();
  const quad = [{ x: 70, y: 30 }, { x: 250, y: 46 }, { x: 268, y: 214 }, { x: 52, y: 205 }];
  const px = photoOfSheet(SC, 320, 240, 210, 297, quad);
  const r = SC.detect(px, 320, 240);
  assert.ok(r, 'a sheet is found');
  r.quad.forEach((p, i) => assert.ok(Math.hypot(p.x - quad[i].x, p.y - quad[i].y) < 6, 'corner ' + i + ' off by ' + Math.hypot(p.x - quad[i].x, p.y - quad[i].y).toFixed(1)));
  assert.ok(r.confidence > 0.9);
});

test('scanner gives up honestly on a photograph with no sheet in it', () => {
  const SC = L.scanner();
  const px = new Uint8ClampedArray(160 * 120 * 4).fill(120);
  assert.equal(SC.detect(px, 160, 120), null);
});

test('scanner flattens a slanted A4 page back to A4 proportions', () => {
  const SC = L.scanner();
  /* an A4 sheet (1 : 1.414) seen in true perspective by a phone-like camera tilted towards its top */
  const f = 480, W = 640, Hh = 480, sheet = [[-105, -148.5], [105, -148.5], [105, 148.5], [-105, 148.5]];
  const quad = sheet.map(([X, Y]) => {
    const t = 0.5, Yr = Y * Math.cos(t), Zr = 520 + Y * Math.sin(t);     // tilt about the horizontal axis
    return { x: W / 2 + f * X / Zr, y: Hh / 2 + f * Yr / Zr };
  });
  const s = SC.flatSize(quad, W, Hh);
  const ratio = s.h / s.w;
  assert.ok(Math.abs(ratio - 297 / 210) < 0.06, 'height/width ' + ratio.toFixed(3) + ' should be near 1.414');
  /* and the corners of the flattened page come from the corners of the sheet */
  const src = photoOfSheet(SC, W, Hh, 210, 297, quad);
  const out = SC.warp(src, W, Hh, quad, 105, 148);
  const at = (x, y) => out[(y * 105 + x) * 4];
  assert.ok(at(2, 2) > 200 && at(102, 145) > 200, 'the edges of the flattened page are paper, not table');
});

test('scanner cleaning lifts a shadow so the paper is white and the ink stays dark', () => {
  const SC = L.scanner();
  const W = 200, Hh = 280;
  const full = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: Hh }, { x: 0, y: Hh }];
  const px = photoOfSheet(SC, W, Hh, W, Hh, full, { shadow: true });
  const paperBefore = px[(140 * W + 190) * 4];                         // the dark side, between lines
  const cleaned = SC.clean(px.slice(), W, Hh, 'auto');
  const lum = (a, x, y) => { const p = (y * W + x) * 4; return 0.299 * a[p] + 0.587 * a[p + 1] + 0.114 * a[p + 2]; };
  assert.ok(paperBefore < 150, 'the test page really is shadowed');
  for (const x of [10, 100, 190]) assert.ok(lum(cleaned, x, 4) > 235, 'paper at x=' + x + ' is white: ' + lum(cleaned, x, 4).toFixed(0));
  assert.ok(lum(cleaned, 100, 37) < 110, 'ink stays dark');
  const bw = SC.clean(px.slice(), W, Hh, 'bw');
  assert.ok(lum(bw, 190, 4) > 245 && lum(bw, 173, 37) < 60, 'black & white is crisp on both sides of the page');
  const orig = SC.clean(px.slice(), W, Hh, 'original');
  assert.equal(orig[(140 * W + 190) * 4], paperBefore, 'original leaves the picture alone');
});

test('scanner cleaning leaves a large photograph on a card evenly dark, with no glow in its middle', () => {
  const SC = L.scanner();
  const W = 360, Hh = 230, px = new Uint8ClampedArray(W * Hh * 4);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const p = (y * W + x) * 4, photo = x >= 30 && x < 150 && y >= 40 && y < 200;
    const v = photo ? [130, 100, 80] : [228, 232, 240];
    px[p] = v[0]; px[p + 1] = v[1]; px[p + 2] = v[2]; px[p + 3] = 255;
  }
  SC.clean(px, W, Hh, 'auto');
  const lum = (x, y) => { const p = (y * W + x) * 4; return 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2]; };
  const middle = lum(90, 120), edge = lum(34, 44);
  assert.ok(middle < 140, 'the photograph stays dark in its middle: ' + middle.toFixed(0));
  assert.ok(Math.abs(middle - edge) < 20, 'and even across it: middle ' + middle.toFixed(0) + ', edge ' + edge.toFixed(0));
  assert.ok(lum(300, 100) > 240, 'the card itself is white');
});
