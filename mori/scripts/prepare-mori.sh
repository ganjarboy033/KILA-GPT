#!/usr/bin/env bash
# Menyiapkan modul KILA Unduh (ex-Mori, Capacitor) agar bisa dikompilasi di dalam proyek KILA.
# Dijalankan dari akar repo oleh CI:  bash mori/scripts/prepare-mori.sh
set -euo pipefail
cd "$(dirname "$0")/.."          # -> mori/

npm install --no-audit --no-fund

# `cap sync` mengharapkan android/app/build.gradle; modul kita memakai .kts, jadi beri stub sementara.
echo "// stub sementara untuk cap sync" > android/app/build.gradle
npx cap sync android
rm -f android/app/build.gradle android/app/capacitor.build.gradle
rm -rf android/capacitor-cordova-android-plugins

# Daftar plugin Capacitor (selain inti) -> dibaca oleh android/app/build.gradle.kts
grep "^include" android/capacitor.settings.gradle \
  | sed -E "s/include ':([^']+)'.*/\1/" \
  | grep -v '^capacitor-android$' > android/app/mori-plugins.txt || true
echo "Plugin Capacitor:"; cat android/app/mori-plugins.txt

# Rapikan build.gradle modul Capacitor agar kompatibel dengan AGP 9 / Gradle 9.
python3 - <<'PY'
import re, pathlib
root = pathlib.Path("android/capacitor.settings.gradle").read_text()
dirs = re.findall(r"projectDir = new File\('([^']+)'\)", root)
def strip_block(text, head):
    m = re.search(head + r"\s*\{", text)
    while m:
        i, depth = m.end(), 1
        while depth and i < len(text):
            depth += (text[i] == '{') - (text[i] == '}')
            i += 1
        text = text[:m.start()] + text[i:]
        m = re.search(head + r"\s*\{", text)
    return text
for d in dirs:
    base = (pathlib.Path("android") / d).resolve()
    for name in ("build.gradle", "build.gradle.kts"):
        f = base / name
        if not f.exists():
            continue
        t = f.read_text()
        o = t
        t = strip_block(t, r"(?m)^buildscript")
        t = re.sub(r"(?m)^\s*(apply plugin:\s*['\"]kotlin-android['\"]|id\(?\s*['\"](kotlin-android|org\.jetbrains\.kotlin\.android)['\"]\s*\)?)\s*$", "", t)
        t = t.replace("lintOptions", "lint").replace("jcenter()", "")
        # AGP 9 menolak proguard-android.txt karena mematikan optimasi R8.
        t = t.replace("proguard-android.txt", "proguard-android-optimize.txt")
        # buildscript dihapus -> definisikan ulang kotlin_version (dipakai di dependencies Capacitor)
        if "plugins {" not in t and "kotlin_version" in t and "ext.kotlin_version" not in t:
            t = "ext.kotlin_version = '2.4.0'\n" + t
        if t != o:
            f.write_text(t)
            print("dipatch:", f)
PY
echo "Modul Mori siap."
