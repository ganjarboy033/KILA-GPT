// Mori AIXI — Sumber tambahan: Jelajah Anime & Komik (via mesin server).
import { getInitialLanguage } from "../i18n/index.js";
import { openExternalUrl } from "../modules/core.js";

const L = {
  su: { anime: "🔎 Anime & Komik", title: "Anime & Komik", animeT: "Anime", comic: "Komik", search: "Teangan judul…", go: "Teang", close: "Tutup", pick: "Pilih hiji judul", none: "Teu manggih nanaon.", loading: "Sakeudeung…", back: "← Balik", srv: "URL server (Vercel anjeun)", srvHint: "Anime, komik jeung resolver butuh server. Tempelkeun URL deploy Vercel anjeun, contona https://aisimo.vercel.app", save: "Simpen", saved: "Kasimpen", web: "Sumber web", noLink: "Tempelkeun tautan heula.", copied: "Tautan disalin — tempelkeun di situs." },
  id: { anime: "🔎 Anime & Komik", title: "Anime & Komik", animeT: "Anime", comic: "Komik", search: "Cari judul…", go: "Cari", close: "Tutup", pick: "Pilih satu judul", none: "Tidak ditemukan.", loading: "Memuat…", back: "← Kembali", srv: "URL server (Vercel Anda)", srvHint: "Anime, komik, dan resolver butuh server. Tempel URL deploy Vercel Anda, mis. https://aisimo.vercel.app", save: "Simpan", saved: "Tersimpan", web: "Sumber web", noLink: "Tempel tautan dulu.", copied: "Tautan disalin — tempel di situs." },
  en: { anime: "🔎 Anime & Comics", title: "Anime & Comics", animeT: "Anime", comic: "Comics", search: "Search title…", go: "Search", close: "Close", pick: "Pick a title", none: "Nothing found.", loading: "Loading…", back: "← Back", srv: "Server URL (your Vercel)", srvHint: "Anime, comics and resolvers need a server. Paste your Vercel deployment URL, e.g. https://aisimo.vercel.app", save: "Save", saved: "Saved", web: "Web sources", noLink: "Paste a link first.", copied: "Link copied — paste it on the site." },
};
const l = () => L[getInitialLanguage()] || L.en;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const isNative = () => !!window.MORI_NATIVE;
const base = () => (window.moriServerBase ? window.moriServerBase() : "");

let sites = null, state = { kind: "anime", stack: [] }, sheet;

async function loadSites() {
  if (sites) return sites;
  const j = await window.moriServerBrowse({ action: "sites" });
  sites = j.sites || { anime: {}, comic: {} };
  return sites;
}

function build() {
  sheet = document.createElement("div");
  sheet.className = "mori-sheet hidden";
  sheet.innerHTML = `<div class="mori-sheet-body" role="dialog" aria-modal="true">
    <div class="mori-sheet-head"><h3></h3><button class="mori-mini-btn" data-x></button></div>
    <div data-srvbox style="display:none"><p class="mori-muted" data-srvhint></p>
      <div class="mori-row"><input data-srv type="url" inputmode="url" autocapitalize="off" /><button class="mori-mini-btn" data-srvsave></button></div></div>
    <div class="mori-row"><select data-kind></select><select data-site></select></div>
    <div class="mori-row"><input data-q type="search" /><button class="mori-mini-btn" data-go></button></div>
    <div data-out></div></div>`;
  document.body.appendChild(sheet);
  sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.dataset.x !== undefined) sheet.classList.add("hidden"); });
  sheet.querySelector("[data-kind]").addEventListener("change", (e) => { state.kind = e.target.value; fillSites(); });
  sheet.querySelector("[data-go]").addEventListener("click", search);
  sheet.querySelector("[data-q]").addEventListener("keydown", (e) => { if (e.key === "Enter") search(); });
  sheet.querySelector("[data-srvsave]").addEventListener("click", async () => {
    let v = sheet.querySelector("[data-srv]").value.trim().replace(/\/+$/, "");
    if (v && !/^https?:\/\//i.test(v)) v = "https://" + v;
    try { localStorage.setItem("mori_server_base", v); } catch (e) {}
    sites = null;
    sheet.querySelector("[data-out]").innerHTML = `<p class="mori-muted">${l().saved}: ${esc(v)}</p>`;
    try { await loadSites(); fillSites(); } catch (e) {}
  });
}

function text() {
  const t = l();
  sheet.querySelector("h3").textContent = t.title;
  sheet.querySelector("[data-x]").textContent = t.close;
  sheet.querySelector("[data-go]").textContent = t.go;
  sheet.querySelector("[data-q]").placeholder = t.search;
  sheet.querySelector("[data-srvhint]").textContent = t.srvHint;
  sheet.querySelector("[data-srvsave]").textContent = t.save;
  const srv = sheet.querySelector("[data-srv]");
  srv.placeholder = t.srv;
  srv.value = localStorage.getItem("mori_server_base") || "";
  sheet.querySelector("[data-srvbox]").style.display = isNative() ? "block" : "none";
  const k = sheet.querySelector("[data-kind]");
  k.innerHTML = `<option value="anime">${t.animeT}</option><option value="comic">${t.comic}</option>`;
  k.value = state.kind;
  sheet.querySelector("[data-out]").innerHTML = `<p class="mori-muted">${t.pick}</p>`;
}

function fillSites() {
  const sel = sheet.querySelector("[data-site]");
  const entries = Object.entries((sites || {})[state.kind] || {}).filter(([, c]) => c.search);
  sel.innerHTML = entries.map(([n]) => `<option value="${n}">${n}</option>`).join("");
}

function render(items, onPick, withBack) {
  const out = sheet.querySelector("[data-out]");
  if (!items.length) { out.innerHTML = `<p class="mori-muted">${l().none}</p>`; return; }
  out.innerHTML = (withBack ? `<button class="mori-mini-btn" data-back style="margin-bottom:10px">${l().back}</button>` : "") +
    `<ul class="mori-list">${items.map((it, i) => `<li><button data-i="${i}">${it.thumbnail ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(it.thumbnail)}" alt="">` : ""}<span>${esc(it.title)}</span></button></li>`).join("")}</ul>`;
  out.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => onPick(items[+b.dataset.i])));
  const back = out.querySelector("[data-back]");
  if (back) back.addEventListener("click", () => { const prev = state.stack.pop(); if (prev) prev(); });
}

function normItems(r) {
  const arr = Array.isArray(r) ? r : (r && (r.items || r.results || r.list)) || [];
  return arr.map((x) => ({
    title: x.title || x.name || x.episode || x.chapter || x.url,
    url: x.url || x.link || x.href,
    thumbnail: x.thumbnail || x.cover || x.image || "",
  })).filter((x) => x.url);
}

async function search() {
  const q = sheet.querySelector("[data-q]").value.trim();
  const site = sheet.querySelector("[data-site]").value;
  const out = sheet.querySelector("[data-out]");
  if (isNative() && !base()) { out.innerHTML = `<p class="mori-muted">${l().srvHint}</p>`; return; }
  if (!q || !site) return;
  out.innerHTML = `<p class="mori-muted">${l().loading}</p>`;
  state.stack = [];
  try {
    const j = await window.moriServerBrowse({ action: "search", kind: state.kind, site, q });
    if (!j.status) throw new Error(j.message);
    const items = normItems(j.result);
    const showResults = () => render(items, async (it) => {
      out.innerHTML = `<p class="mori-muted">${l().loading}</p>`;
      state.stack.push(showResults);
      try {
        const k = await window.moriServerBrowse({ action: "list", kind: state.kind, site, url: it.url });
        if (!k.status) throw new Error(k.message);
        render(normItems(k.result), (ep) => analyze(ep.url), true);
      } catch (e) { out.innerHTML = `<p class="mori-muted">${esc(e.message)}</p>`; }
    }, false);
    showResults();
  } catch (e) { out.innerHTML = `<p class="mori-muted">${esc(e.message || l().none)}</p>`; }
}

function analyze(url) {
  sheet.classList.add("hidden");
  const input = document.getElementById("urlInput");
  if (!input) return;
  input.value = url;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  document.getElementById("downloadBtn")?.click();
}

function openWeb(href) {
  try { openExternalUrl(href); } catch (e) { window.open(href, "_blank", "noopener"); }
}

function injectButtons() {
  const sec = document.querySelector("#homePage .input-section");
  if (!sec || document.getElementById("moriExploreBtn")) return;
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:12px";
  row.innerHTML = `
    <button id="moriExploreBtn" type="button" class="mori-explore-btn" style="flex:2 1 160px;margin:0"></button>
`;
  sec.appendChild(row);
  const ex = row.querySelector("#moriExploreBtn");
  ex.textContent = l().anime;
  ex.addEventListener("click", async () => {
    if (!sheet) build();
    text();
    sheet.classList.remove("hidden");
    if (isNative() && !base()) return;
    try { await loadSites(); fillSites(); } catch (e) { sheet.querySelector("[data-out]").innerHTML = `<p class="mori-muted">${esc(e.message)}</p>`; }
  });
  window.addEventListener("mori_language_changed", () => { ex.textContent = l().anime; if (sheet) text(); });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectButtons);
else injectButtons();
