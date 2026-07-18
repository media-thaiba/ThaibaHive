# ThaibaHive ProGuard Rules for release builds

# Keep Dio and related classes
-keep class io.flutter.plugins.** { *; }
-keep class io.flutter.embedding.** { *; }

# Keep Hive classes
-keep class com.google.gson.** { *; }
-keep class hive.** { *; }

# Keep open_filex
-keep class com.crazecoder.openfile.** { *; }

# Keep permission_handler
-keep class com.baseflow.permissionhandler.** { *; }

# Keep connectivity_plus
-keep class com.github.adee42.connectivity.** { *; }

# Keep Sentry
-keep class io.sentry.** { *; }

# General Android rules
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Suppress warnings/errors for optional Play Core Split Install classes
-dontwarn com.google.android.play.core.**
-dontwarn com.google.android.play.core.tasks.**
-dontwarn com.google.android.play.core.splitinstall.**
-dontwarn com.google.android.play.core.splitcompat.**
