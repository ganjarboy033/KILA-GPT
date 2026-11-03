'use strict';
// Endpoint mesin scrapr sisi-server (resolver, anime, komik + fallback sadaya platform).
const { cors, readJson, sendJson } = require('./_lib/guard');
const engine = require('./_lib/engine');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  try {
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    const body = req.method === 'POST' ? await readJson(req) : {};
    const p = { ...q, ...body };
    const action = String(p.action || 'extract');

    if (action === 'sites') return sendJson(res, 200, { status: true, sites: engine.listSites() });
    if (action === 'detect') {
      const url = engine.extractUrl(p.url);
      return sendJson(res, 200, { status: true, url, platform: engine.detectPlatform(url) });
    }
    if (action === 'search' || action === 'list') {
      const kind = p.kind === 'comic' ? 'comic' : 'anime';
      const result = await engine.browse({ kind, site: String(p.site || ''), action, query: p.q || p.query, url: p.url });
      return sendJson(res, 200, { status: true, result });
    }
    if (!p.url) return sendJson(res, 400, { status: false, message: 'URL diperyogikeun.' });
    const out = await engine.extract(p.url, { platform: p.platform, method: p.method });
    return sendJson(res, out.status ? 200 : 422, out);
  } catch (e) {
    return sendJson(res, e.status || 500, { status: false, message: e.message || 'Server error' });
  }
};
