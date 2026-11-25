plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "com.tryharderloser.game"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.tryharderloser.game"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
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
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("debug")
        }
        getByName("release") {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(libs.androidx.webkit)
}
