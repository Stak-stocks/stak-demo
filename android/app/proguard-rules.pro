# Ktor + Supabase
-keep class io.ktor.** { *; }
-keepclassmembers class io.ktor.** { *; }
-keep class io.github.jan.supabase.** { *; }
-keepclassmembers class io.github.jan.supabase.** { *; }
-keep class io.github.jan.supabase.auth.** { *; }

# Kotlin serialization (used internally by Supabase)
-keepattributes *Annotation*, InnerClasses, Signature
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keep class **$$serializer { *; }
-keepclassmembers class ** { *** Companion; }

# Kotlin
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Gson reads and writes these by field name - API responses (Retrofit) and the
# pages and prices kept on the phone. Minified without these, R8 renames the
# fields, so responses parse to empty objects and saved pages read back broken.
-keepclassmembers class com.stak.demo.data.** { <fields>; <init>(...); }
-keep class com.stak.demo.ui.discover.LiveDetail { *; }
-keep class com.stak.demo.ui.discover.CompareValues { *; }
-keep class com.stak.demo.ui.discover.StockDetailCache$** { *; }
-keep class com.stak.demo.ui.mystak.MyStakViewModel$MyStakSnapshot$** { *; }


# Ktor's IntelliJ debugger check references java.lang.management, which Android
# doesn't have; R8 stopped every release build on it.
-dontwarn java.lang.management.ManagementFactory
-dontwarn java.lang.management.RuntimeMXBean
