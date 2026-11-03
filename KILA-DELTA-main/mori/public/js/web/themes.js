// Mori AIXI — Pamilih Téma (palét, warna aksén kustom, modeu poék) disuntikkeun kana Setélan > Tampilan.
import { applyColorAccent } from "../modules/settings/appearance.js";
import { getInitialLanguage } from "../i18n/index.js";

const PALETTES = [
  { id: "default", dots: ["#fffbf2", "#1a1917", "#6e6a64"], name: { su: "Mori Asli", id: "Mori Asli", en: "Original Mori" } },
  { id: "forest", dots: ["#0f1a13", "#6fd08c", "#17261c"], name: { su: "Leuweung Mori", id: "Hutan Mori", en: "Mori Forest" } },
  { id: "priangan", dots: ["#17130a", "#e6b94a", "#231c0e"], name: { su: "Priangan Kuring", id: "Emas Priangan", en: "Priangan Gold" } },
  { id: "cyber", dots: ["#0a0b18", "#00f0ff", "#c2188a"], name: { su: "Cyberpunk Neon", id: "Cyberpunk Neon", en: "Cyberpunk Neon" } },
  { id: "layung", dots: ["#1a0e0b", "#ff7a59", "#2a1612"], name: { su: "Layung Kasonten", id: "Layung Senja", en: "Sunset Aurora" } },
  { id: "sagara", dots: ["#07131f", "#4aa8ff", "#0e2236"], name: { su: "Sagara Biru", id: "Samudra Biru", en: "Oceanic Sapphire" } },
  { id: "amoled", dots: ["#000000", "#ffffff", "#0c0c0c"], name: { su: "Hideung Pekat", id: "Hitam Pekat", en: "AMOLED Black" } },
];

const L = {
  su: { title: "Kustomisasi Téma", accent: "Warna aksén", reset: "Balikkeun", dark: "Modeu poék", bg: "Latar animasi: tingali dina “Latar Hirup”" },
  id: { title: "Kustomisasi Tema", accent: "Warna aksen", reset: "Reset", dark: "Mode gelap", bg: "Latar animasi: lihat di “Latar Hidup”" },
  en: { title: "Theme Customizer", accent: "Accent color", reset: "Reset", dark: "Dark mode", bg: "Animated background: see “Live Background”" },
};
const tr = () => L[getInitialLanguage()] || L.en;
const pname = (p) => p.name[getInitialLanguage()] || p.name.en;

function render(card) {
  const cur = localStorage.getItem("mori_palette") || "default";
  const custom = localStorage.getItem("mori_accent_custom") || "";
  const l = tr();
  card.innerHTML = `
    <h4>🎨 ${l.title}</h4>
    <div class="mori-theme-grid">
      ${PALETTES.map((p) => `
        <button type="button" class="mori-swatch ${p.id === cur ? "active" : ""}" data-p="${p.id}" aria-label="${pname(p)}">
          <span class="dots">${p.dots.map((c) => `<i style="background:${c}"></i>`).join("")}</span>
          <span>${pname(p)}</span>
        </button>`).join("")}
    </div>
    <div class="mori-accent-row">
      <label for="moriAccent">${l.accent}</label>
      <input type="color" id="moriAccent" value="${custom || "#6fd08c"}" />
      <button type="button" class="mori-mini-btn" id="moriAccentReset">${l.reset}</button>
    </div>
    <p class="mori-muted" style="margin:10px 0 0">${l.bg}</p>`;
  card.querySelectorAll(".mori-swatch").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.p;
      localStorage.setItem("mori_palette", id);
      localStorage.removeItem("mori_accent_custom");
      applyColorAccent();
      render(card);
    }),
  );
  const picker = card.querySelector("#moriAccent");
  picker.addEventListener("input", () => {
    localStorage.setItem("mori_accent_custom", picker.value);
    applyColorAccent();
  });
  card.querySelector("#moriAccentReset").addEventListener("click", () => {
    localStorage.removeItem("mori_accent_custom");
    applyColorAccent();
    render(card);
  });
}

function init() {
  const list = document.querySelector("#settingsAppearance .settings-list");
  if (!list || document.getElementById("moriThemeCard")) return;
  const card = document.createElement("div");
  card.id = "moriThemeCard";
  card.className = "settings-item mori-theme-card";
  card.style.display = "block";
  list.insertBefore(card, list.firstChild);
  render(card);
  window.addEventListener("mori_language_changed", () => render(card));
  applyColorAccent();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
