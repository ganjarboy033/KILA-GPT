/* Mori AIXI — jembatan web/APK.
 *  • Di browser (Vercel): HTTP scraper Mori dialihkan ke /api/relay, media ke /api/media.
 *  • Di APK (Capacitor): shim HTTP TIDAK dipasang (HTTP native Mori dipakai apa adanya);
 *    mesin server (resolver/anime/komik) dipanggil ke URL server pilihan pamaké (opsional). */
(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  var native = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
    /; wv\)/.test(ua) || (location.protocol === 'https:' && location.hostname === 'localhost') || location.protocol === 'file:';
  window.MORI_NATIVE = native;

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function serverBase() {
    if (!native) return (window.MORI_API_BASE || '');
    return (store('mori_server_base') || '').replace(/\/+$/, '');
  }
  window.moriServerBase = serverBase;
  var API = function () { return serverBase() + '/api'; };

  /* ---- Registry Referer (per URL media) — dipakai proxy web & interceptor native ---- */
  var REFS = {};
  window.moriSetReferer = function (mediaUrl, referer) {
    if (!mediaUrl || !referer) return;
    REFS[mediaUrl] = referer;
    try { if (window.MoriMainBridge && window.MoriMainBridge.setMediaReferer) window.MoriMainBridge.setMediaReferer(mediaUrl, referer); } catch (e) {}
  };

  window.moriGetReferer = function (u) { return REFS[u]; };

  /* ---- Panggilan mesin server ---- */
  window.moriServerExtract = function (url, platform) {
    var base = serverBase();
    if (native && !base) return Promise.resolve(null);   // APK tanpa server: lewati
    return fetch(API() + '/scrapr', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, platform: platform || 'auto' })
    }).then(function (r) { return r.json(); });
  };
  window.moriServerBrowse = function (params) {
    return fetch(API() + '/scrapr?' + new URLSearchParams(params).toString()).then(function (r) { return r.json(); });
  };

  if (native) {
    window.moriProxyUrl = function (u) { return u; };
    return;           // ← APK: selesai, JANGAN ganti CapacitorHttp / src media
  }

  /* ================= MODE WEB ================= */
  function relay(method, o) {
    var payload = {
      url: o.url, method: method, headers: o.headers || {},
      timeout: o.readTimeout || o.connectTimeout || 30000,
      responseType: o.responseType || undefined
    };
    if (o.data !== undefined) payload.data = o.data;
    if (o.params !== undefined) payload.params = o.params;
    if (payload.data instanceof URLSearchParams) payload.data = payload.data.toString();
    return fetch(API() + '/relay', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).then(function (r) { return r.json().catch(function () { return { status: 0, error: 'Respons relay teu valid' }; }); })
      .then(function (j) {
        if (!j || j.status === 0) throw new Error((j && j.error) || 'Relay gagal');
        return { status: j.status, headers: j.headers || {}, data: j.data, url: j.url || o.url };
      });
  }
  var CapacitorHttp = {
    get: function (o) { return relay('GET', o); },
    post: function (o) { return relay('POST', o); },
    put: function (o) { return relay('PUT', o); },
    delete: function (o) { return relay('DELETE', o); },
    request: function (o) { return relay((o.method || 'GET').toUpperCase(), o); }
  };
  window.Capacitor = window.Capacitor || {};
  window.Capacitor.isNativePlatform = function () { return false; };
  window.Capacitor.getPlatform = function () { return 'web'; };
  window.Capacitor.convertFileSrc = function (u) { return u; };
  window.Capacitor.Plugins = window.Capacitor.Plugins || {};
  window.Capacitor.Plugins.CapacitorHttp = CapacitorHttp;

  function useProxy() { return store('mori_web_proxy') !== 'false'; }
  window.moriProxyUrl = function (u, filename, download) {
    if (!u || !useProxy()) return u;
    try {
      var x = new URL(u, location.href);
      if (x.origin === location.origin || !/^https?:$/.test(x.protocol)) return u;
    } catch (e) { return u; }
    var q = '?url=' + encodeURIComponent(u);
    if (REFS[u]) q += '&referer=' + encodeURIComponent(REFS[u]);
    if (filename) q += '&filename=' + encodeURIComponent(filename);
    if (download) q += '&dl=1';
    return API() + '/media' + q;
  };
  try {
    var d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
      configurable: true, enumerable: d.enumerable, get: d.get,
      set: function (v) { d.set.call(this, typeof v === 'string' ? window.moriProxyUrl(v) : v); }
    });
  } catch (e) {}

  try {
    if (store('mori_web_init') !== '1') {
      store('mori_web_init', '1');
      store('mori_show_gallery', 'false');
      if (!store('mori_lang')) store('mori_lang', 'su');
    }
    var pal = store('mori_palette');
    if (pal && pal !== 'default') document.documentElement.setAttribute('data-palette', pal);
  } catch (e) {}

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }
})();
