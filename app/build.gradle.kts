plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "com.sanvex.game.tryharderloser"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.sanvex.game.tryharderloser"
        minSdk = 24
        targetSdk = 35
        versionCode = System.getenv("ANDROID_VERSION_CODE")?.toIntOrNull() ?: 1
        versionName = System.getenv("ANDROID_VERSION_NAME")?.takeIf { it.isNotBlank() } ?: "1.0.0"
    }

    signingConfigs {
        getByName("debug") {
            val tempKeystore = rootProject.file("debug.keystore")
            if (tempKeystore.exists()) {
                storeFile = tempKeystore
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
        create("release") {
            val releaseKeystorePath = System.getenv("ANDROID_KEYSTORE_PATH") ?: "release.keystore"
            val releaseKeystore = rootProject.file(releaseKeystorePath)
            if (releaseKeystore.exists()) {
                storeFile = releaseKeystore
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD") ?: "tryharderrelease"
                keyAlias = System.getenv("ANDROID_KEY_ALIAS") ?: "upload"
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD") ?: "tryharderrelease"
            }
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("debug")
            manifestPlaceholders["admobAppId"] = "ca-app-pub-3940256099942544~3347511713"
        }
        getByName("release") {
            isDebuggable = false
            isMinifyEnabled = false
            isShrinkResources = false
            manifestPlaceholders["admobAppId"] =
                System.getenv("ADMOB_APP_ID")?.takeIf { it.isNotBlank() }
                    ?: "ca-app-pub-3940256099942544~3347511713"
            val releaseSigning = signingConfigs.getByName("release")
            if (releaseSigning.storeFile != null) {
                signingConfig = releaseSigning
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(libs.androidx.webkit)
    implementation(libs.play.services.ads)
}
