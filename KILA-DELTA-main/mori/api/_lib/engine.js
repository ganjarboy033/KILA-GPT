'use strict';
// Mesin ekstraksi: membungkus @coflyn/scrapr (bundle self-contained) dengan rantai fallback,
// timeout per-metode, dan normalisasi hasil ke format yang dipahami UI Mori.
const { CHAINS, detectPlatform, extractUrl } = require('./detect');

let _scrapr = null;
function scrapr() {
  if (!_scrapr) _scrapr = require('./scrapr.cjs');
  return _scrapr;
}

function withTimeout(promise, ms, label) {
  let t;
  const timer = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${label}: timeout ${ms / 1000}s`)), ms); });
  return Promise.race([promise, timer]).finally(() => clearTimeout(t));
}

function resolveFn(platform, method) {
  const entry = CHAINS[platform];
  if (!entry) return null;
  const [ns, list] = entry;
  const root = scrapr()[ns];
  if (!root) return null;
  if (ns === 'anime' || ns === 'comic') {
    const site = list[0];
    return root[site] && root[site][method || 'scrape'];
  }
  return root[method];
}

function methodsFor(platform, preferred) {
  const entry = CHAINS[platform];
  if (!entry) return [];
  const [ns, list] = entry;
  if (ns === 'anime' || ns === 'comic') return ['scrape'];
  if (preferred && list.includes(preferred)) return [preferred, ...list.filter((m) => m !== preferred)];
  return list;
}

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|flac|ogg|opus)(\?|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|bmp)(\?|$)/i;
const VIDEO_EXT = /\.(mp4|webm|mkv|mov|m3u8|flv)(\?|$)/i;

function kindOf(item) {
  const t = String(item.type || '').toLowerCase();
  const u = String(item.url || '');
  if (t.includes('audio') || t.includes('mp3') || t.includes('music') || AUDIO_EXT.test(u)) return 'audio';
  if (t.includes('image') || t.includes('photo') || t.includes('picture') || IMAGE_EXT.test(u)) return 'image';
  if (t.includes('video') || t.includes('mp4') || /\d+p/.test(t) || VIDEO_EXT.test(u)) return 'video';
  return 'file';
}

function labelOf(item, kind, idx) {
  const q = item.quality || item.label || item.resolution;
  if (kind === 'audio') return q && !/audio/i.test(q) ? `MP3 ${q}` : 'MP3';
  if (kind === 'image') return 'PHOTO';
  if (kind === 'video') {
    const raw = String(item.type || '');
    if (q) return /^\d+p?$/i.test(String(q)) ? `${String(q).replace(/p?$/i, 'p')}` : String(q);
    if (/\d+p/i.test(raw)) return raw;
    return idx === 0 ? 'MP4' : `MP4 ${idx + 1}`;
  }
  return item.type || q || 'FILE';
}

function normalize(raw, platform, originalUrl) {
  const data = (raw && raw.result) || raw || {};
  let list = Array.isArray(data.downloads) ? data.downloads : [];
  if (!list.length && (data.download || data.url)) list = [{ url: data.download || data.url, type: data.type }];
  if (!list.length && Array.isArray(data.images)) list = data.images.map((u) => ({ url: typeof u === 'string' ? u : u.url, type: 'image' }));

  const seen = new Set();
  const downloads = list
    .filter((d) => d && typeof (d.url || d.downloadUrl || d.link) === 'string')
    .map((d) => ({ ...d, url: d.url || d.downloadUrl || d.link }))
    .filter((d) => (seen.has(d.url) ? false : (seen.add(d.url), true)))
    .map((d, i) => {
      const kind = kindOf(d);
      return { ...d, kind, type: labelOf(d, kind, i), referer: d.referer || originalUrl };
    });

  const items = Array.isArray(data.items) ? data.items : [];
  const author = typeof data.author === 'object' && data.author ? (data.author.name || data.author.username || '') : (data.author || data.uploader || '');
  const thumb = data.thumbnail || data.cover || data.image || (downloads.find((d) => d.thumbnail) || {}).thumbnail || (downloads.find((d) => d.kind === 'image') || {}).url || '';

  return {
    title: data.title || data.desc || data.caption || `${platform.toUpperCase()} media`,
    author: String(author || ''),
    thumbnail: thumb,
    duration: data.duration || '',
    kind: data.type || (items.length ? 'playlist' : (downloads[0] && downloads[0].kind) || 'media'),
    downloads,
    items,
    sourceUrl: originalUrl,
  };
}

/**
 * Ekstrak media dari satu URL. Mengembalikan { status, platform, method, result } atau { status:false, message, tried }.
 */
async function extract(input, opts = {}) {
  const url = extractUrl(input);
  let platform = (opts.platform && opts.platform !== 'auto') ? String(opts.platform).toLowerCase() : detectPlatform(url);
  const budgetMs = opts.budgetMs || 50000;
  const perMethod = opts.perMethodMs || 22000;
  const started_at = Date.now();
  const tried = [];

  // Link pendek/tak dikenal → coba "unshorten" dulu, lalu deteksi ulang.
  if (platform === 'general' || platform === 'unshorten') {
    try {
      const un = scrapr().resolver.unshorten;
      const r = await withTimeout(un(url), 12000, 'unshorten');
      const dest = r && r.status && r.result && r.result.url;
      if (dest && dest !== url) {
        const again = detectPlatform(dest);
        if (again !== 'general' && again !== 'unshorten') return extract(dest, { ...opts, platform: again, budgetMs: budgetMs - (Date.now() - started_at) });
        // Hasil unshorten berupa file langsung?
        if (r.result.downloads || /\.(mp4|mp3|zip|pdf|jpe?g|png|webp|m4a)(\?|$)/i.test(dest)) {
          return { status: true, platform: 'unshorten', method: 'unshorten', result: normalize(r, 'unshorten', url) };
        }
        return { status: true, platform: 'unshorten', method: 'unshorten', result: normalize({ result: { title: 'Tautan kahontal', downloads: [{ url: dest, type: 'file' }] } }, 'unshorten', url) };
      }
    } catch (e) { tried.push({ method: 'unshorten', error: e.message }); }
    if (platform === 'general') {
      // Terakhir: URL langsung ke berkas media?
      if (/\.(mp4|webm|mp3|m4a|wav|jpe?g|png|webp|gif|pdf|zip)(\?|$)/i.test(url)) {
        return { status: true, platform: 'direct', method: 'direct', result: normalize({ result: { title: decodeURIComponent(url.split('?')[0].split('/').pop() || 'Berkas'), downloads: [{ url, type: undefined }] } }, 'direct', url) };
      }
      return { status: false, platform, message: 'URL acan dirojong. Cobian tautan ti platform anu aya dina daptar.', tried };
    }
  }

  const methods = methodsFor(platform, opts.method);
  if (!methods.length) return { status: false, platform, message: `Platform ${platform} teu kapanggih.`, tried };

  // Balapan berjenjang: sérvér kahiji jalan heula; upami teu aya hasil dina 3 detik (atawa gagal),
  // sérvér satuluyna dimimitian babarengan. Nu mimiti hasil, nu meunang → leuwih gancang tanpa ngurangan cadangan.
  const STAGGER = opts.staggerMs || 3000;
  const won = await new Promise((resolve) => {
    let started = 0, pending = 0, done = false, timer = null;
    const finish = (v) => { if (done) return; done = true; clearTimeout(timer); resolve(v); };
    const startNext = () => {
      if (done) return;
      clearTimeout(timer);
      if (started >= methods.length) { if (pending === 0) finish(null); return; }
      const m = methods[started++];
      const fn = resolveFn(platform, m);
      if (typeof fn !== 'function') return startNext();
      const left = budgetMs - (Date.now() - started_at);
      if (left < 2500) { started = methods.length; if (pending === 0) finish(null); return; }
      pending++;
      Promise.resolve()
        .then(() => withTimeout(Promise.resolve(fn(url, opts.options)), Math.min(perMethod, left), `${platform}.${m}`))
        .then((raw) => {
          if (raw && raw.status === false) { tried.push({ method: m, error: raw.message || 'gagal' }); return; }
          const result = normalize(raw, platform, url);
          if (result.downloads.length || result.items.length) finish({ method: m, result });
          else tried.push({ method: m, error: 'hasil kosong' });
        })
        .catch((e) => tried.push({ method: m, error: (e && e.message) || String(e) }))
        .finally(() => { pending--; if (!done) startNext(); });
      timer = setTimeout(startNext, STAGGER);
    };
    startNext();
  });
  if (won) return { status: true, platform, method: won.method, result: won.result, tried };
  const last = tried.length ? tried[tried.length - 1].error : 'teu aya hasil';
  return { status: false, platform, message: `Sadaya server gagal (${last}).`, tried };
}

/** Cari anime/komik, atau daftar episode/chapter. */
async function browse({ kind, site, action, query, url }) {
  const ns = scrapr()[kind];
  if (!ns || !ns[site]) throw Object.assign(new Error('Situs teu kapanggih.'), { status: 404 });
  const mod = ns[site];
  const fnName = action === 'search' ? 'search' : (kind === 'anime' ? 'getEpisodes' : 'getChapters');
  const fn = mod[fnName];
  if (typeof fn !== 'function') throw Object.assign(new Error(`${site} teu ngarojong ${fnName}.`), { status: 400 });
  const arg = action === 'search' ? query : url;
  const raw = await withTimeout(Promise.resolve(fn(arg)), 25000, `${site}.${fnName}`);
  if (raw && raw.status === false) throw Object.assign(new Error(raw.message || 'gagal'), { status: 502 });
  return raw && raw.result !== undefined ? raw.result : raw;
}

function listSites() {
  const s = scrapr();
  const out = { anime: {}, comic: {} };
  for (const kind of ['anime', 'comic']) {
    for (const site of Object.keys(s[kind] || {})) {
      const m = s[kind][site];
      if (!m || (typeof m !== 'function' && typeof m !== 'object')) continue;
      out[kind][site] = {
        search: typeof m.search === 'function',
        list: typeof (kind === 'anime' ? m.getEpisodes : m.getChapters) === 'function',
      };
    }
  }
  return out;
}

module.exports = { extract, browse, listSites, normalize, detectPlatform, extractUrl };
