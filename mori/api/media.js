'use strict';
// Proxy streaming media (dukung Range) supaya CDN dengan hotlink-protection bisa diputar/diunduh.
const { assertPublicUrl, cors, safeFilename, sendJson } = require('./_lib/guard');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const REFERERS = [
  [/tiktok|musical\.ly|byteoversea|ibytedtos/i, 'https://www.tiktok.com/'],
  [/douyin|bytecdn|douyinvod|zjcdn/i, 'https://www.douyin.com/'],
  [/bilibili|bilivideo|hdslb|akamaized\.net.*bili/i, 'https://www.bilibili.com/'],
  [/pximg|pixiv/i, 'https://www.pixiv.net/'],
  [/pinimg/i, 'https://www.pinterest.com/'],
  [/xhscdn|xiaohongshu/i, 'https://www.xiaohongshu.com/'],
  [/twimg/i, 'https://x.com/'],
  [/redd\.it|redditmedia|redditstatic/i, 'https://www.reddit.com/'],
  [/scdn\.co|spotify/i, 'https://open.spotify.com/'],
  [/sndcdn|soundcloud/i, 'https://soundcloud.com/'],
  [/bcbits|bandcamp/i, 'https://bandcamp.com/'],
  [/ytimg|googlevideo|youtube/i, 'https://www.youtube.com/'],
];

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  try {
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    const raw = String(q.url || '');
    const u = await assertPublicUrl(raw);
    const base = { 'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'en-US,en;q=0.9' };
    if (req.headers.range) base.Range = req.headers.range;

    // Kandidat Referer berurutan: eksplisit → peta host → asal host sorangan → kaca sumber → tanpa Referer.
    const cands = [];
    const add = (v) => { if (v !== undefined && !cands.includes(v)) cands.push(v); };
    add(q.referer ? String(q.referer) : undefined);
    add((REFERERS.find(([re]) => re.test(u.hostname)) || [])[1]);
    add(`${u.protocol}//${u.host}/`);
    add(null);

    const ctrl = new AbortController();
    res.on('close', () => ctrl.abort());
    let up = null, lastStatus = 0;
    for (const ref of cands) {
      const headers = { ...base };
      if (ref) { headers.Referer = ref; try { headers.Origin = new URL(ref).origin; } catch {} }
      try {
        const r = await fetch(u.toString(), { headers, redirect: 'follow', signal: ctrl.signal });
        lastStatus = r.status;
        if (r.ok || r.status === 206) { up = r; break; }
        try { await r.body?.cancel(); } catch {}
        if (![401, 403, 404, 406, 429].includes(r.status) && r.status < 500) break;
      } catch (e) { if (ctrl.signal.aborted) return res.end(); lastStatus = 502; }
    }
    if (!up) return sendJson(res, lastStatus === 403 ? 403 : 502, { status: false, message: `Sumber mulangkeun ${lastStatus}` });

    res.statusCode = up.status;
    const pass = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];
    for (const h of pass) { const v = up.headers.get(h); if (v) res.setHeader(h, v); }
    if (!up.headers.get('accept-ranges')) res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=300');
    const dl = q.dl === '1' || q.dl === 'true' || q.forceDownload === 'true';
    let name = q.filename;
    if (!name) { try { name = decodeURIComponent(u.pathname.split('/').pop()) || 'mori_download'; } catch { name = 'mori_download'; } }
    const clean = safeFilename(name);
    res.setHeader('Content-Disposition', `${dl ? 'attachment' : 'inline'}; filename="${clean.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(clean)}`);

    if (!up.body) return res.end();
    const reader = up.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(Buffer.from(value))) await new Promise((r) => res.once('drain', r));
    }
    res.end();
  } catch (e) {
    if (!res.headersSent) sendJson(res, e.status || 502, { status: false, message: e.message || 'Proxy gagal' });
    else res.end();
  }
};
