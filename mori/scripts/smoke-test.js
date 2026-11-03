'use strict';
// Uji asap: jalankan server lokal + upstream tiruan, cek relay/media/scrapr/SSRF.
process.env.MORI_ALLOW_PRIVATE = '1';
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const up = http.createServer((req, res) => {
  if (req.url === '/json') { res.setHeader('Content-Type', 'application/json'); return res.end('{"ok":true}'); }
  if (req.url === '/echo' && req.method === 'POST') { let b = ''; req.on('data', (c) => (b += c)); return req.on('end', () => { res.setHeader('Set-Cookie', ['a=1; Path=/', 'b=2']); res.end('got:' + b + '|' + req.headers['x-test']); }); }
  if (req.url === '/video.mp4') {
    const buf = Buffer.alloc(1000, 7);
    const r = req.headers.range;
    if (r) { const m = /bytes=(\d+)-(\d*)/.exec(r); const s = +m[1], e = m[2] ? +m[2] : 999; res.writeHead(206, { 'Content-Type': 'video/mp4', 'Content-Range': `bytes ${s}-${e}/1000`, 'Content-Length': e - s + 1 }); return res.end(buf.slice(s, e + 1)); }
    res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': 1000 }); return res.end(buf);
  }
  if (req.url === '/hot.mp4') {   // hotlink-protected: butuh Referer = asal host ATAWA 'https://situs-asli.test/'
    const ref = req.headers.referer || '';
    const okRef = ref === `http://127.0.0.1:${up.address().port}/` || ref === 'https://situs-asli.test/ep1';
    if (!okRef) { res.statusCode = 403; return res.end('forbidden'); }
    res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': 100 }); return res.end(Buffer.alloc(100, 1));
  }
  if (req.url === '/hot2.mp4') {  // butuh Referer spesifik
    if (req.headers.referer !== 'https://situs-asli.test/ep1') { res.statusCode = 403; return res.end('forbidden'); }
    res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': 100 }); return res.end(Buffer.alloc(100, 2));
  }
  res.statusCode = 404; res.end();
}).listen(0);

(async () => {
  const upPort = up.address().port;
  const PORT = 3999;
  const srv = spawn(process.execPath, [path.join(__dirname, 'dev-server.js')], { env: { ...process.env, PORT }, stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 700));
  const base = `http://localhost:${PORT}`;
  let fail = 0;
  const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
  const post = (p, b) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(async (r) => ({ s: r.status, j: await r.json() }));
  try {
    const h = await (await fetch(base + '/api/health')).json();
    ok(h.status && h.engine, 'health + mesin scrapr dimuat');
    const r1 = await post('/api/relay', { url: `http://127.0.0.1:${upPort}/json` });
    ok(r1.j.status === 200 && r1.j.data && r1.j.data.ok === true, 'relay GET JSON diurai');
    const r2 = await post('/api/relay', { url: `http://127.0.0.1:${upPort}/echo`, method: 'POST', headers: { 'X-Test': 'zz', 'Content-Type': 'application/x-www-form-urlencoded' }, data: { q: 'a b' } });
    ok(r2.j.data === 'got:q=a+b|zz', 'relay POST form + header diteruskeun');
    ok(Array.isArray(r2.j.headers['set-cookie']) && r2.j.headers['set-cookie'].length === 2, 'relay maké Set-Cookie sakabéh');
    const m1 = await fetch(`${base}/api/media?url=${encodeURIComponent(`http://127.0.0.1:${upPort}/video.mp4`)}&dl=1&filename=tes.mp4`);
    ok(m1.status === 200 && (await m1.arrayBuffer()).byteLength === 1000 && /attachment/.test(m1.headers.get('content-disposition')), 'media proxy + attachment');
    const m2 = await fetch(`${base}/api/media?url=${encodeURIComponent(`http://127.0.0.1:${upPort}/video.mp4`)}`, { headers: { Range: 'bytes=10-19' } });
    ok(m2.status === 206 && (await m2.arrayBuffer()).byteLength === 10, 'media proxy ngadukung Range (206)');
    const hot = await fetch(`${base}/api/media?url=${encodeURIComponent(`http://127.0.0.1:${upPort}/hot.mp4`)}`);
    ok(hot.status === 200, 'proxy: 403 hotlink diatasi (Referer asal-host otomatis)');
    const hot2 = await fetch(`${base}/api/media?url=${encodeURIComponent(`http://127.0.0.1:${upPort}/hot2.mp4`)}&referer=${encodeURIComponent('https://situs-asli.test/ep1')}`);
    ok(hot2.status === 200, 'proxy: Referer kaca sumber ditarima (param referer)');
    const hot3 = await fetch(`${base}/api/media?url=${encodeURIComponent(`http://127.0.0.1:${upPort}/hot2.mp4`)}`);
    ok(hot3.status === 403, 'proxy: tanpa Referer bener → 403 jujur (teu ngarang)');
    const sc = await (await fetch(base + '/api/scrapr?action=sites')).json();
    ok(sc.sites.anime.otakudesu && sc.sites.comic.komiku.search, 'daptar situs anime/komik');
    const d = await (await fetch(base + '/api/scrapr?action=detect&url=' + encodeURIComponent('cek https://www.mediafire.com/file/x/y.zip nya'))).json();
    ok(d.platform === 'mediafire', 'detéksi platform ti téks campur');
    const dir = await post('/api/scrapr', { url: 'https://example.com/a/b/video.mp4' });
    ok(dir.j.status && dir.j.result.downloads[0].kind === 'video', 'URL berkas langsung → video');
  } catch (e) { console.error(e); fail++; }
  // SSRF — tanpa MORI_ALLOW_PRIVATE
  srv.kill();
  const srv2 = spawn(process.execPath, [path.join(__dirname, 'dev-server.js')], { env: { ...process.env, PORT: PORT + 1, MORI_ALLOW_PRIVATE: '0' }, stdio: 'inherit' });
  await new Promise((r) => setTimeout(r, 700));
  try {
    const bad = await fetch(`http://localhost:${PORT + 1}/api/relay`, { method: 'POST', body: JSON.stringify({ url: 'http://127.0.0.1:1/' }) });
    ok(bad.status === 403, 'SSRF: 127.0.0.1 diblokir');
    const bad2 = await fetch(`http://localhost:${PORT + 1}/api/media?url=${encodeURIComponent('http://169.254.169.254/latest/meta-data')}`);
    ok(bad2.status === 403, 'SSRF: metadata cloud diblokir');
  } catch (e) { console.error(e); fail++; }
  srv2.kill(); up.close();
  console.log(fail ? `\n${fail} uji gagal` : '\nSadaya uji lulus');
  process.exit(fail ? 1 : 0);
})();
