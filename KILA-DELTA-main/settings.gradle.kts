@file:Suppress("UnstableApiUsage")

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "YMusicV4"

include(":commonUi")
include(":image-loader")
include(":desktopApp")
include(":androidApp")
include(":kmpCommon")
include(":projectCommon")
include(":kmpHttp:core")
include(":kmpHttp:json")
include(":kmpHttp:json-benchmark")
include(":kmpHttp:curl")
include(":kmpHttp:testing")
include(":kmpFfmpeg")
include(":media-store")
include(":media-scanner")
include(":dynamic-engine")
include(":engine-js")
include(":quickjs")
include(":player")
include(":mse")
include(":yt-media")
include(":download")
include(":iosAppKotlin")
include(":playground")
include(":playground-android")
include(":settings")
include(":remote-config")
include(":telemetry")
// includeBuild("YMusicLegacy")

// --- KILA Unduh (ex-Mori, Capacitor): modul library + plugin Capacitor-nya ---
// Dibuat oleh `bash mori/scripts/prepare-mori.sh` (CI menjalankannya sebelum Gradle).
val capacitorSettings = file("mori/android/capacitor.settings.gradle")
if (capacitorSettings.exists()) {
    var current: String? = null
    capacitorSettings.readLines().forEach { line ->
        Regex("""include\s+':([^']+)'""").find(line)?.let {
            current = it.groupValues[1]
            include(":${it.groupValues[1]}")
        }
        Regex("""projectDir\s*=\s*new File\('([^']+)'\)""").find(line)?.let {
            project(":$current").projectDir = file("mori/android/${it.groupValues[1]}").normalize()
        }
    }
    include(":mori")
    project(":mori").projectDir = file("mori/android/app")
}
