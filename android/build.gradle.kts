// Top-level build file: plugin versions for all modules. The app module applies
// ksp/hilt/google-services by id, so their versions are pinned here.
plugins {
	alias(libs.plugins.android.application) apply false
	alias(libs.plugins.kotlin.android) apply false
	alias(libs.plugins.kotlin.compose) apply false
	id("com.google.devtools.ksp") version "2.1.20-1.0.31" apply false
	id("com.google.dagger.hilt.android") version "2.56.2" apply false
	id("com.google.gms.google-services") version "4.4.2" apply false
}
