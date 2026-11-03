'use strict';
// Pelindung SSRF + utilitas umum untuk semua fungsi API.
const dns = require('dns').promises;
const net = require('net');

const BLOCKED_HOSTS = [/^localhost$/i, /\.local$/i, /\.internal$/i, /^metadata\.google\.internal$/i];

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:');
  }
  return true;
}

/** Lempar error bila URL menuju jaringan internal / skema aneh. */
async function assertPublicUrl(raw) {
  const allowPrivate = process.env.MORI_ALLOW_PRIVATE === '1'; // HANYA untuk uji lokal
  let u;
  try { u = new URL(raw); } catch { throw httpError(400, 'URL teu valid.'); }
  if (!/^https?:$/.test(u.protocol)) throw httpError(400, 'Ngan http/https anu diidinan.');
  if (u.username || u.password) throw httpError(400, 'URL kalawan kredensial dilarang.');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (!allowPrivate && BLOCKED_HOSTS.some((r) => r.test(host))) throw httpError(403, 'Host dilarang.');
  if (net.isIP(host)) {
    if (!allowPrivate && isPrivateIp(host)) throw httpError(403, 'Alamat IP privat dilarang.');
    return u;
  }
  try {
    const addrs = await dns.lookup(host, { all: true });
    if (!allowPrivate && (!addrs.length || addrs.some((a) => isPrivateIp(a.address)))) throw httpError(403, 'Host ngarah ka jaringan internal.');
  } catch (e) {
    if (e.status) throw e;
    throw httpError(502, 'DNS gagal: ' + host);
  }
  return u;
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function cors(req, res) {
  const origin = req.headers.origin;
  const allow = process.env.ALLOWED_ORIGINS; // contoh: "https://situs.vercel.app,https://domain.com"
  if (origin) {
    let ok = !allow;
    if (allow) ok = allow.split(',').map((s) => s.trim()).includes(origin);
    // Selalu izinkan origin yang sama dengan host (deploy Vercel sendiri).
    try { if (new URL(origin).host === req.headers.host) ok = true; } catch {}
    if (ok) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return true; }
  return false;
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 2 * 1024 * 1024) throw httpError(413, 'Payload kagedean.');
    chunks.push(c);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

function safeFilename(name, fallback = 'mori_download') {
  const n = String(name || fallback)
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return n || fallback;
}

module.exports = { assertPublicUrl, httpError, cors, readJson, sendJson, safeFilename, isPrivateIp };
