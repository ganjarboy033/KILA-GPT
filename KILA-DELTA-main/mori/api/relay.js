'use strict';
// Relay HTTP untuk shim CapacitorHttp di browser: scraper bawaan Mori bisa jalan tanpa CORS.
const { assertPublicUrl, cors, readJson, sendJson, httpError } = require('./_lib/guard');

const STRIP_REQ = new Set(['host', 'content-length', 'connection', 'origin-agent-cluster', 'x-forwarded-for']);

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { status: 0, error: 'Method Not Allowed' });
  try {
    const body = await readJson(req);
    const target = String(body.url || '');
    const u = await assertPublicUrl(target);
    const method = String(body.method || 'GET').toUpperCase();
    if (!['GET', 'POST', 'PUT', 'DELETE', 'HEAD'].includes(method)) throw httpError(400, 'Method teu diidinan');

    const headers = {};
    for (const [k, v] of Object.entries(body.headers || {})) {
      const lk = k.toLowerCase();
      if (STRIP_REQ.has(lk) || lk.startsWith('sec-fetch') || lk.startsWith('sec-ch')) continue;
      headers[k] = String(v);
    }
    if (body.params && typeof body.params === 'object') {
      for (const [k, v] of Object.entries(body.params)) u.searchParams.set(k, String(v));
    }
    let payload;
    if (body.data !== undefined && body.data !== null && method !== 'GET' && method !== 'HEAD') {
      if (typeof body.data === 'object') {
        const ct = Object.keys(headers).find((h) => h.toLowerCase() === 'content-type');
        if (ct && /x-www-form-urlencoded/i.test(headers[ct])) payload = new URLSearchParams(body.data).toString();
        else { payload = JSON.stringify(body.data); if (!ct) headers['Content-Type'] = 'application/json'; }
      } else payload = String(body.data);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(parseInt(body.timeout, 10) || 30000, 50000));
    let r;
    try {
      r = await fetch(u.toString(), { method, headers, body: payload, redirect: 'follow', signal: ctrl.signal });
    } finally { clearTimeout(timer); }

    const outHeaders = {};
    r.headers.forEach((v, k) => { outHeaders[k] = v; });
    const setCookie = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
    if (setCookie.length) outHeaders['set-cookie'] = setCookie;

    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 4 * 1024 * 1024) throw httpError(413, 'Respons kagedean (>4MB). Paké /api/media.');
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    let data;
    if (body.responseType === 'arraybuffer' || body.responseType === 'blob') data = buf.toString('base64');
    else data = buf.toString('utf8');
    if (!body.responseType || body.responseType === 'json') {
      if (ct.includes('json')) { try { data = JSON.parse(data); } catch {} }
    }
    sendJson(res, 200, { status: r.status, headers: outHeaders, data, url: r.url, base64: body.responseType === 'arraybuffer' || body.responseType === 'blob' });
  } catch (e) {
    sendJson(res, e.status || 502, { status: 0, error: e.name === 'AbortError' ? 'Timeout' : (e.message || 'Relay gagal') });
  }
};
