# Mori AIXI — Web (Vercel) + APK Android

Hiji repo, dua hasil:
- **Web + API** → di-deploy otomatis ku **Vercel** (folder `api/` jeung `public/`).
- **APK Android** → dibangun otomatis ku **GitHub Actions** (folder `android/`, basisna Mori 4.5.1 asli: kode native, ikon, pangunduh latar, Share-target).

Basa bawaan **Sunda** (jeung Indonesia, English, 日本語, 한국어, 中文, العربية, Русский, Tagalog, हिन्दी). Aya 7 palét téma + pamilih warna aksén.

## 1. Upload ka GitHub
```bash
git init && git add . && git commit -m "Mori AIXI"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

## 2. Jieun APK (GitHub Actions)
1. Buka repo → tab **Actions** → workflow **Build Android APK** → **Run workflow** (otomatis jalan ogé unggal `git push`).
2. Antosan ± 8–15 menit. Réngsé → klik run-na → bagian **Artifacts** → unduh **Mori-AIXI-APK** (ZIP, eusina `Mori-AIXI.apk`).
3. Pasang di HP (idinan "instal tina sumber teu dipikawanoh"). APK-na *debug-signed*, bisa langsung diinstal.
Upami gagal, buka log step anu beureum jeung kirim ka kuring.

## 3. Web (Vercel)
vercel.com → **Add New → Project** → pilih repo → **Deploy** (setélan geus aya di `vercel.json`, tanpa build).

## Cara kerja
| | APK | Web |
|---|---|---|
| Scraper Mori (TikTok, IG, YouTube, Spotify…) | jalan di HP sorangan (HTTP native, IP HP) | lewat `/api/relay` |
| Resolver (MediaFire, GDrive…), Anime, Komik | via **server Vercel anjeun** (URL disetél sakali di tombol *Anime & Komik*) | `/api/scrapr` |
| Preview/pamuter & 403 hotlink | interceptor native (Referer bener, Range) | `/api/media` (nyobaan sababaraha Referer) |
| Unduh | pangunduh native Mori | via proxy `/api/media` |

- **Tempel → langsung periksa**: *Pariksa Otomatis* jeung *Témpél Otomatis* hurung sacara bawaan. Ekstraksi sisi-server ngabalapan 2–3 sumber sakaligus (nu pangheulana hasil meunang), cadangan tetep aya.
- **Tombol SaveFrom & SnapYT**: muka situs éta (SaveFrom otomatis ditambahan `savefrom.co.id/` samemeh tautan; SnapYT nyalin tautan ka clipboard). Ieu jalan pintas, lain scraper terintegrasi.
- Patch OTA scraper (asli Mori) **aktif di APK**: scraper dicokot tina repo `coflyn/Mori` (tanpa verifikasi tanda tangan). Pareuman ku ngarobah `WEB_BUILD = true` dina `public/js/modules/updateScrapers.js`.

## Watesan
- Scraper gumantung kana situs pihak-katilu; bisa robah/diblok iraha waé.
- Proxy `/api/media` ngagunakeun bandwidth Vercel.
- Hak cipta: ngundeh ngan kanggo kapentingan pribadi.

## Uji
`npm run dev` (http://localhost:3000, Node 20+) · `npm test` (uji backend)

## Lisénsi
Mori: GPL-3.0 (`LICENSE`). scrapr: MIT (`LICENSE-scrapr-MIT`). Proyék ieu: **GPL-3.0-or-later**.
