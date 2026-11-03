# KILA (com.gandzar.kilamod)

Gabungan dua aplikasi sumber terbuka (keduanya GPL-3.0):

* **YMusic V4** (pemutar YouTube / YT Music) — basis aplikasi, kode di `androidApp/`, `commonUi/`, dst.
* **Mori AIXI** (pengunduh media) — modul **KILA Unduh** di `mori/` (Capacitor, jadi library `:mori`).

Lisensi asli tetap berlaku (`LICENSE`, `mori/LICENSE`, `mori/LICENSE-scrapr-MIT`); pembuat asli: kdev/YMusic dan coflyn/Mori.

## Cara build di GitHub
1. Upload seluruh isi zip ini ke repo GitHub (akar repo = folder ini).
2. Tab **Actions → KILA Android → Run workflow**.
3. Selesai (±40–90 menit pertama kali, ffmpeg dikompilasi lalu di-cache) → unduh artifact **kila-apks**.
   Pilih `*-arm64-v8a-release.apk` untuk HP modern.

Keystore dibuat otomatis dan disimpan di cache Actions (tanda tangan konsisten antar-build).
Kalau cache terhapus, tanda tangan berubah → uninstall dulu sebelum pasang versi baru.

## Yang berubah
* Paket `com.gandzar.kilamod` (nama paket Kotlin internal `io.ymusic.android` sengaja tidak diubah; aman & minim risiko).
* Nama **KILA**, ikon huruf A berbentuk delta (Δ).
* Menu samping: **KILA Unduh** membuka modul Mori. Pengaturan → **Tab**: centang/uncék tiap tab.
* Pengaturan → Pemutaran: tombol pintas **Equalizer** & **Komentar** di kontrol video (dekat CC & layar penuh).
* Bahasa **Basa Sunda** ditambahkan (sebagian string; sisanya jatuh ke Inggris). Indonesia sudah ada. Mori sudah punya Sunda/Indonesia.
* Mori: tombol SaveFrom & SnapYT dihapus; "Quick Save" → **KILA Unduh**; folder → `Download/KILA/Unduh/...`.
* Folder musik YMusic: pilih `Download/KILA/Musik` di Pengaturan → Unduhan → lokasi unduhan.

## Belum dikerjakan
* Jendela mengambang (overlay) — PiP bawaan YMusic tetap ada.
* Menyatukan folder YMusic otomatis ke `Download/KILA/Musik` (saat ini dipilih manual sekali).
* Terjemahan Sunda penuh (±600 string).
* Build belum pernah dijalankan: kalau Actions gagal, kirim log error-nya.
