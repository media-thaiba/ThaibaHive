# Production Build & Release Optimization Guide

**Version:** 1.0  
**Target Release:** v2.7.0 (Sprint-015)  

---

## 1. Web Bundle Optimization (Next.js)

### Bundle Splitting & Tree-Shaking Configuration
- Package imports optimized in `next.config.ts`: `lucide-react`, `@radix-ui/react-icons`, `date-fns`, `lodash`.
- Standalone output enabled for containerized Docker deployments (`output: "standalone"`).
- Static assets cached immutably with `Cache-Control: public, max-age=31536000, immutable`.
- Bundle analysis triggered via `ANALYZE=true npx next build`.

---

## 2. Flutter Mobile Release Optimization (Android & iOS)

### Android ProGuard / R8 Obfuscation & Shrinking
- `isMinifyEnabled = true` and `isShrinkResources = true` in `build.gradle.kts`.
- Reflection preservation rules in `proguard-rules.pro` for:
  - Flutter engine (`io.flutter.**`)
  - Local authentication (`androidx.biometric.**`)
  - Firebase messaging (`com.google.firebase.messaging.**`)
  - Hive storage (`hive.**`, `com.google.gson.**`)
  - WorkManager & BackgroundFetch (`androidx.work.**`, `com.transistorsoft.tsbackgroundfetch.**`)

### Build Compilation Flags
```bash
# Android App Bundle (.aab)
flutter build appbundle --release --split-debug-info=build/app/outputs/symbols --obfuscate

# iOS App Store IPA
flutter build ipa --release --export-options-plist=ios/ExportOptions.plist
```

---

## 3. Symbol De-obfuscation & Debugging
- Debug symbols saved to `build/app/outputs/symbols`.
- De-obfuscate stack traces using:
```bash
flutter symbolize -i stacktrace.txt -d build/app/outputs/symbols/app.android-arm64.symbols
```
