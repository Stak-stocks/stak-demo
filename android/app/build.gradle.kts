// In a Kotlin DSL script `java.util` would resolve against the `java` extension.
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")

}

// The Firebase config is per developer / CI (git-ignored; see google-services.json.example):
// the Google Services plugin only applies when the file is present, so a clean checkout
// still builds (Copilot review, PR #166).
if (file("google-services.json").exists()) apply(plugin = "com.google.gms.google-services")

// Release signing (audit 2026-09-04). The upload key is NOT in the repo:
// fill android/keystore.properties (git-ignored; template in
// keystore.properties.example) or export STAK_KEYSTORE_FILE /
// STAK_KEYSTORE_PASSWORD / STAK_KEY_ALIAS / STAK_KEY_PASSWORD in CI. With
// neither, assembleRelease still builds - unsigned - exactly as before.
val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun signingValue(key: String, env: String): String? =
    keystoreProps.getProperty(key)?.takeIf { it.isNotBlank() } ?: System.getenv(env)?.takeIf { it.isNotBlank() }
val releaseStoreFile = signingValue("storeFile", "STAK_KEYSTORE_FILE")

android {
    namespace = "com.stak.demo"
    compileSdk = 35


    defaultConfig {
        applicationId = "com.stak.demo"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (releaseStoreFile != null) {
            create("release") {
                storeFile = rootProject.file(releaseStoreFile)
                storePassword = signingValue("storePassword", "STAK_KEYSTORE_PASSWORD")
                keyAlias = signingValue("keyAlias", "STAK_KEY_ALIAS")
                keyPassword = signingValue("keyPassword", "STAK_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            // Signed when a keystore is configured (see the top of this file).
            signingConfig = signingConfigs.findByName("release")
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17

    }

    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    // The account lock behind "Account security" (Codex review, PR #167 mirror).
    implementation("androidx.biometric:biometric:1.1.0")
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation("androidx.compose.material:material-icons-extended")
    implementation("com.google.dagger:hilt-android:2.56.2")
    ksp("com.google.dagger:hilt-compiler:2.56.2")
    // Navigation
    implementation("androidx.navigation:navigation-compose:2.8.9")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    // Firebase
    implementation(platform("com.google.firebase:firebase-bom:33.12.0"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.android.gms:play-services-auth:21.3.0")

    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.google.code.gson:gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Images
    implementation("io.coil-kt:coil-compose:2.7.0")
    // Direct-media playback for the article hero (VideoView proved
    // unreliable inside Compose - silent surface/prepare failures).
    implementation("androidx.media3:media3-exoplayer:1.4.1")

    // Local settings
    implementation("androidx.datastore:datastore-preferences:1.1.4")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.9.0")

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
