// Modul KILA Unduh (ex-Mori) sebagai Android *library* di dalam proyek KILA.
// Versi AndroidX disalin dari android/variables.gradle Mori.
plugins {
    id("com.android.library")
}

android {
    namespace = "com.mori.downloader"
    compileSdk = 36
    defaultConfig {
        minSdk = 24
        consumerProguardFiles("consumer-rules.pro")
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }
    // jniLibs/ (libmorisec.so, terikat nama class com.mori.downloader.MainActivity) ikut otomatis.
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.coordinatorlayout:coordinatorlayout:1.3.0")
    implementation("androidx.core:core-splashscreen:1.2.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    api(project(":capacitor-android"))
    // Plugin Capacitor: daftar dibuat oleh mori/scripts/prepare-mori.sh (satu nama modul per baris).
    val pluginList = file("mori-plugins.txt")
    if (pluginList.exists()) {
        pluginList.readLines().map { it.trim() }.filter { it.isNotEmpty() }.forEach {
            implementation(project(":$it"))
        }
    }
}
