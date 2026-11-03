'use strict';
// Deteksi platform + rantai metode scrapr (fallback berurutan) — meniru logika Mori & AIXI.

const RULES = [
  ['tiktok',     /(^|\.)(tiktok\.com|tt\.site)/i],
  ['douyin',     /(^|\.)(douyin\.com|iesdouyin\.com)/i],
  ['instagram',  /(^|\.)(instagram\.com|instagr\.am)/i],
  ['youtube',    /(^|\.)(youtube\.com|youtu\.be|music\.youtube\.com)/i],
  ['twitter',    /(^|\.)(twitter\.com|x\.com|fxtwitter\.com|fixupx\.com|vxtwitter\.com)/i],
  ['facebook',   /(^|\.)(facebook\.com|fb\.watch|fb\.com|fb\.me)/i],
  ['spotify',    /(^|\.)(spotify\.com|spotify\.link)/i],
  ['soundcloud', /(^|\.)(soundcloud\.com|snd\.sc)/i],
  ['applemusic', /(^|\.)music\.apple\.com/i],
  ['bandcamp',   /(^|\.)bandcamp\.com/i],
  ['pinterest',  /(^|\.)(pinterest\.[a-z.]+|pin\.it)/i],
  ['reddit',     /(^|\.)(reddit\.com|redd\.it)/i],
  ['threads',    /(^|\.)(threads\.net|threads\.com)/i],
  ['bilibili',   /(^|\.)(bilibili\.com|bilibili\.tv|b23\.tv|bili\.im)/i],
  ['pixiv',      /(^|\.)pixiv\.net/i],
  ['rednote',    /(^|\.)(xiaohongshu\.com|rednote\.com|xhslink\.com|xhslink\.cn)/i],
  ['terabox',    /(terabox|1024tera|nephobox|4funbox|mirrobox|momerybox|tibibox)/i],
  // Resolver file host
  ['mediafire',  /(^|\.)mediafire\.com/i],
  ['gdrive',     /(^|\.)(drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)/i],
  ['catbox',     /(^|\.)(catbox\.moe|litter\.catbox\.moe)/i],
  ['pixeldrain', /(^|\.)pixeldrain\.(com|dev)/i],
  ['sfile',      /(^|\.)(sfile\.co|sfile\.mobi)/i],
  ['krakenfiles',/(^|\.)krakenfiles\.com/i],
  ['doodstream', /(^|\.)(dood\.[a-z]+|doodstream\.com|ds2play\.com|d0o0d\.com|dooood\.com)/i],
  ['safelinku',  /(^|\.)(safelinku\.com|sfl\.gl)/i],
  ['sub2unlock', /(^|\.)(sub2unlock\.[a-z]+|sub4unlock\.[a-z]+)/i],
  ['rekonise',   /(^|\.)rekonise\.com/i],
  // Anime
  ['otakudesu',  /(^|\.)otakudesu\./i],
  ['nimegami',   /(^|\.)nimegami\./i],
  ['gogoanime',  /(^|\.)(gogoanime|anitaku|gogoanimes|megaplay)/i],
  ['animetosho', /(^|\.)animetosho\.org/i],
  // Komik
  ['komiku',     /(^|\.)komiku\./i],
  ['mangadex',   /(^|\.)mangadex\.org/i],
  ['kiryuu',     /(^|\.)kiryuu\./i],
  ['asurascans', /(^|\.)(asuracomic\.net|asurascans\.|asura)/i],
  ['komikcast',  /(^|\.)komikcast\./i],
  ['komikindo',  /(^|\.)komikindo\./i],
  ['bacakomik',  /(^|\.)bacakomik\./i],
  ['manhwaindo', /(^|\.)manhwaindo\./i],
  ['mangabats',  /(^|\.)(mangabats?\.)/i],
];

// [namespace, fungsi...]. Namespace "resolver"/"anime"/"comic" bertingkat.
const CHAINS = {
  tiktok:     ['tiktok', ['snaptik', 'tiktokio', 'ssstik', 'tikdownloader', 'savetik']],
  douyin:     ['douyin', ['direct']],
  instagram:  ['instagram', ['direct', 'indown', 'snapsave', 'snapinsta']],
  youtube:    ['youtube', ['ytmp3gg', 'ytmp3']],
  twitter:    ['twitter', ['direct', 'tvd', 'savetwt', 'tweeload']],
  facebook:   ['facebook', ['snapsave', 'fdown']],
  spotify:    ['spotify', ['spotisaver', 'spotidown', 'spotmate', 'soundloaders']],
  soundcloud: ['soundcloud', ['klickaud']],
  applemusic: ['applemusic', ['aplmate']],
  bandcamp:   ['bandcamp', ['direct', 'bandcampdownloader']],
  pinterest:  ['pinterest', ['direct', 'pindown']],
  reddit:     ['reddit', ['rapidsave']],
  threads:    ['threads', ['threadster']],
  bilibili:   ['bilibili', ['direct']],
  pixiv:      ['pixiv', ['ajax']],
  rednote:    ['rednote', ['direct']],
  terabox:    ['terabox', ['sechno']],
  mediafire:  ['resolver', ['mediafire']],
  gdrive:     ['resolver', ['gdrive']],
  catbox:     ['resolver', ['catbox']],
  pixeldrain: ['resolver', ['pixeldrain']],
  sfile:      ['resolver', ['sfile']],
  krakenfiles:['resolver', ['krakenfiles']],
  doodstream: ['resolver', ['doodstream']],
  safelinku:  ['resolver', ['safelinku']],
  sub2unlock: ['resolver', ['sub2unlock']],
  rekonise:   ['resolver', ['rekonise']],
  unshorten:  ['resolver', ['unshorten']],
  otakudesu:  ['anime', ['otakudesu']],
  nimegami:   ['anime', ['nimegami']],
  gogoanime:  ['anime', ['gogoanime']],
  animetosho: ['anime', ['animetosho']],
  komiku:     ['comic', ['komiku']],
  mangadex:   ['comic', ['mangadex']],
  kiryuu:     ['comic', ['kiryuu']],
  asurascans: ['comic', ['asurascans']],
  komikcast:  ['comic', ['komikcast']],
  komikindo:  ['comic', ['komikindo']],
  bacakomik:  ['comic', ['bacakomik']],
  manhwaindo: ['comic', ['manhwaindo']],
  mangabats:  ['comic', ['mangabats']],
};

const SHORTENERS = /(^|\.)(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|cutt\.ly|rb\.gy|shorturl\.at|dub\.sh|aka\.ms|s\.id|link\.id|bitly\.com|linktr\.ee)$/i;

function extractUrl(text) {
  const m = String(text || '').match(/https?:\/\/[^\s<>"']+/i);
  if (!m) return String(text || '').trim();
  return m[0].replace(/[)\],.;!?]+$/g, '').trim();
}

function detectPlatform(url) {
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch { return 'general'; }
  for (const [name, re] of RULES) if (re.test(host) || re.test(url)) return name;
  if (SHORTENERS.test(host)) return 'unshorten';
  return 'general';
}

module.exports = { RULES, CHAINS, extractUrl, detectPlatform };
