# Firebase Setup Guide — ThaibaHive Mobile

FCM push notifications require Firebase config files that are **never committed**
to the repository. Each developer must generate their own copies from the Firebase
console and place them in the correct locations.

---

## Prerequisites

- Access to the ThaibaHive Firebase project (ask the project owner to add you)
- Firebase console: https://console.firebase.google.com

---

## Step 1 — Download the config files

### Android: `google-services.json`

1. Open the Firebase console → select the **ThaibaHive** project
2. Go to **Project Settings** → **Your apps**
3. Select the Android app (`com.thaiba.hive`)
4. Click **Download google-services.json**
5. Place the file at:
   ```
   thaibahive_mobile_app/android/app/google-services.json
   ```

### iOS: `GoogleService-Info.plist`

1. Open the Firebase console → select the **ThaibaHive** project
2. Go to **Project Settings** → **Your apps**
3. Select the iOS app (bundle ID: `com.thaiba.thaibahive`)
4. Click **Download GoogleService-Info.plist**
5. Place the file at:
   ```
   thaibahive_mobile_app/ios/Runner/GoogleService-Info.plist
   ```

---

## Step 2 — Verify the `google-services` plugin is applied

The `android/app/build.gradle.kts` already has the Firebase plugin configured via
the Flutter build system. No changes needed there.

---

## Step 3 — Check FCM works

Build and run the app. Look for this log line in logcat / Xcode console:

```
[FCMService] Initial FCM token: <long token string>
[FCMService] Token registered with backend
```

If you see `FCM initialization warning:` instead, the config file is missing
or placed in the wrong location.

---

## What happens without these files

`FCMService.initialize()` is wrapped in a try/catch in `ServiceInitializer` and
is non-fatal — the app will launch but:

- No push notifications will be received
- The `/auth/fcm-token` backend endpoint will never be called
- `staff_device_tokens` will have no entry for your device

---

## Deep Links (Custom Scheme — no server config required)

`thaibahive://` links work without any server config on both Android and iOS.
Test with:

```bash
# Android
adb shell am start -W -a android.intent.action.VIEW -d "thaibahive://leaves/some-id" com.thaiba.hive

# iOS Simulator
xcrun simctl openurl booted "thaibahive://leaves/some-id"
```

## Universal Links / App Links (requires server config — currently deferred)

`https://thaibahive.app` deep links require:
- **iOS**: `https://thaibahive.app/.well-known/apple-app-site-association` with your Team ID and bundle ID
- **Android**: `https://thaibahive.app/.well-known/assetlinks.json` with your SHA-256 cert fingerprint

These are deferred until the domain is live. Use `thaibahive://` links in the meantime.
