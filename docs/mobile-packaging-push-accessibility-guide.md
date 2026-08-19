# Mobile Deployment Packaging, Push Notifications & Accessibility Guide

**Sprint:** Sprint-015 (v2.7.0)  
**Target Architecture:** Production Mobile Companion Platform Maturity  

---

## 1. App Store & Play Store Packaging

- **Android App Bundle (.aab):**
  - Generated via `flutter build appbundle --release --split-debug-info=build/app/outputs/symbols`
  - Obfuscation and resource shrinking configured in `build.gradle.kts` and `proguard-rules.pro`
- **iOS App Store IPA:**
  - Export options specified in `ios/ExportOptions.plist` (`method: app-store`)
  - Background capabilities (`fetch`, `remote-notification`) declared in `Info.plist`
- **Automated CI/CD:**
  - GitHub Actions workflow defined in `.github/workflows/mobile-release.yml`

---

## 2. Push Notification Architecture (FCM/APNs)

- **Token Registration API:** `/api/mobile/push/register` (upserts FCM/APNs registration tokens into `push_notification_tokens` table)
- **Push Notification Service:** `src/lib/notifications/push-notification-service.ts` (features exponential backoff retry and invalid token auto-pruning)
- **SSE Event Bridge:** `src/lib/notifications/sse-push-bridge.ts` (bridges `POLICY_PROPAGATED` and `CIRCUIT_BREAKER_STATE_CHANGED` events to push notifications)
- **Flutter Service:** `lib/core/notifications/push_notification_service.dart`

---

## 3. Background Isolate Sync Engine

- **Dart Isolate Worker:** `lib/core/sync/background_sync_isolate.dart`
- **Message Protocol:** `lib/core/sync/isolate_message_protocol.dart`
- **Task Manager:** `lib/core/sync/background_task_manager.dart`
- **Health Reporting API:** `/api/mobile/sync/background-status` (logs status to `background_sync_logs` table)

---

## 4. WCAG 2.1 AA Accessibility Standards

- **ARIA Landmarks:** `<header role="banner">`, `<nav role="navigation">`, `<main role="main">`
- **Live Metric Announcements:** `aria-live="polite"` on real-time executive dashboard
- **Flutter Semantics:** `Semantics` wrappers around push-to-talk microphone actions and response cards
- **Automated Verification:** `src/lib/__tests__/accessibility-wcag.test.ts`
