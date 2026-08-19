# Implementation Contract: Sprint-015 Production Deployment Packaging & Mobile Platform Maturity

**Sprint ID:** PROD-PACKAGING-MOBILE-MATURITY-015 (SIS-PARENT-015)  
**Sprint Name:** Production Deployment Packaging & Mobile Platform Maturity  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-08-03  
**Target Execution:** 2026-08-04 to 2026-08-25  
**Estimated Duration:** 10–12 days (70–90 hours)  
**Risk Level:** Medium-High  
**Classification:** AIOS v3.0 Official Implementation Contract  
**Target Release Version:** v2.7.0 (Production Deployment Packaging, Push Notifications, Background Isolate Sync, WCAG 2.1 AA & 100% Test Coverage Milestone)

---

## Executive Summary

Sprint-015 executes **Production Deployment Packaging & Mobile Platform Maturity**, strategically evolving ThaibaHive v2.6.0 from a production-ready mobile companion into a fully deployable, enterprise-grade mobile platform. Building upon the encrypted offline persistence, executive analytics dashboard, Flutter CI quality gates, and Soundex/Levenshtein voice parser delivered in Sprint-014 (v2.6.0), this sprint establishes official App Store and Google Play release pipelines, implements real-time FCM/APNs push notifications for critical governance events, enables continuous Dart background isolate queue synchronization when the app is minimized, achieves full WCAG 2.1 AA accessibility compliance, and remediates the final 9 legacy test suites to reach 100% test coverage (150/150 passing test suites).

### Key Business Impact

- **Official App Store & Play Store Distribution Pipelines:** Automated signing, ProGuard/R8 obfuscation, iOS ExportOptions configuration, and GitHub Actions release workflows (`.github/workflows/mobile-release.yml`) enabling streamlined enterprise deployment and automated store updates across 23+ campuses.
- **Real-Time Critical Event Push Notifications (FCM & APNs):** Unified push notification engine (`push-notification-service.ts`) bridging critical SSE governance events (policy changes, circuit breaker triggers, emergency alerts) to mobile devices in under 3 seconds.
- **Continuous Background Isolate Offline Sync (99.9% Reliability):** Dart Isolate background worker (`background_sync_isolate.dart`) integrated with native Android WorkManager and iOS BackgroundFetch, executing background queue flushes without user intervention or foreground requirements.
- **100% WCAG 2.1 AA Accessibility Compliance:** Complete screen reader, keyboard navigation, ARIA landmark, and color contrast remediation across web authenticated shell pages, executive analytics, and Flutter mobile companion screens.
- **100% Test Suite Coverage (150/150 Passing):** Resolution of the remaining 9 legacy test suites by updating obsolete mock contracts and database seed schemas, eliminating false-negative CI build failures and securing long-term maintainability.

### Strategic Alignment

- Advances product version from v2.6.0 to **v2.7.0 (Production Packaging, Push Notifications, Background Sync, WCAG 2.1 AA & 100% Test Coverage Milestone)**.
- Unlocks enterprise MDM enrollment and official App Store/Play Store distribution channels for multi-campus deployments.
- Bridges Sprint-012 SSE Event Bus (`src/lib/sse/event-bus.ts`) and Sprint-013 Federated Governance to mobile push notifications.
- Extends Sprint-014 Encrypted Hive Persistence with background isolate execution capabilities.
- Achieves full regulatory accessibility compliance (WCAG 2.1 AA) for educational and public institution standards.

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation

The Sprint-015 specification is **technically sound, architecturally incremental, and fully compliant with AIOS v3.0 standards**. All work directly extends established production foundations:
- **Build & Packaging:** Reuses the GitHub Actions Flutter CI framework established in Sprint-014 (`.github/workflows/flutter-ci.yml`), adding release build flavors, Keystore signing steps, and iOS ExportOptions configurations.
- **Push Notification Engine:** Built on top of the established Sprint-012 SSE Event Bus (`event-bus.ts`). The `sse-push-bridge.ts` subscribes to existing `POLICY_PROPAGATED`, `CIRCUIT_BREAKER_STATE_CHANGED`, and `DLQ_THRESHOLD_EXCEEDED` events and dispatches via FCM/APNs Node.js admin SDK drivers.
- **Background Isolate Sync:** Extends Sprint-014's `OfflineSyncQueue` and `LocalDbAdapter`. The Dart background isolate initializes `LocalDbAdapter` independently using the shared `FlutterSecureStorage` AES key and drains the queue via standard `BackgroundFetch` / `WorkManager` callbacks.
- **WCAG 2.1 AA Compliance:** Utilizes standard Radix UI primitive accessibility hooks, ARIA landmarks, and Flutter `Semantics` wrapper widgets. Automated verification integrates `axe-core` assertions into Jest test suites.
- **Legacy Test Remediation:** Isolated to 9 identified legacy test files. Diagnostic analysis shows failure patterns stem from obsolete schema references (pre-Drizzle migration) and hardcoded port assumptions, which are resolved via standard test factory patterns established in Sprint-014 (`mock-next-request.ts` and `test-db.ts`).

### Technical Assessment & Risks Identified

1. **FCM & APNs Certificate Provisioning & Token Lifecycle Edge Cases**
   - *Challenge:* Invalid, expired, or revoked push tokens cause silent notification drops or APNs rejection; APNs requires valid Apple Developer P12/P8 certificates.
   - *Mitigation:* Implement token validation and auto-pruning in `push-notification-service.ts` (`PMM-006`); handle token refresh events in Flutter (`PMM-008`); store push credentials securely in environment variables.

2. **iOS & Android Background Execution & Battery Optimization Constraints**
   - *Challenge:* iOS `BackgroundFetch` restricts background execution frequency based on OS battery learning algorithms, while Android Doze Mode defers WorkManager tasks.
   - *Mitigation:* Design `background_sync_isolate.dart` (`PMM-010`) to handle transient execution windows gracefully, statefully saving progress after each batch write, and fallback to foreground sync on app resume.

3. **Isolate State & Database Lock Contention in Flutter**
   - *Challenge:* Concurrent access to Hive boxes from both the main UI isolate and background isolate can cause file lock errors on certain Android/iOS storage layers.
   - *Mitigation:* Implement inter-isolate messaging via `ReceivePort` / `SendPort` to coordinate box locking, or ensure the background isolate opens Hive boxes in read/write lock mode with short execution lifetimes (`PMM-010`).

4. **WCAG 2.1 AA Screen Reader Focus Traps in Modal Dialogs**
   - *Challenge:* Custom modal components in web shell pages may capture focus or fail to return focus to triggering elements when closed, failing WCAG 2.4.3 (Focus Order).
   - *Mitigation:* Enforce Radix UI `<Dialog>` primitives (`PMM-014`) across all modals, eliminating custom overlay `fixed inset-0` implementations.

5. **Legacy Test Suite Schema Drift**
   - *Challenge:* 9 legacy test suites expect old SQLite schema tables that were refactored in Drizzle migration.
   - *Mitigation:* Update test suite setup files (`PMM-017`) to use current `src/db/schema.ts` tables via `createTestDb()` factory.

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule** documented in `AGENTS.md`, this implementation contract was reviewed by **Qwen** (via `ask_qwen`), **OpenCode (Local-Ollama via `chat-with-local-ollama`)**, and **Claude Code** for technical verification and refinement. The following key recommendations were incorporated:

1. **Push Token Refresh & Exponential Backoff (OpenCode / Local-Ollama):** Recommended adding `onTokenRefresh` listener in `push_notification_service.dart` (`PMM-008`) and exponential backoff retry logic in `push-notification-service.ts` (`PMM-006`) to handle transient push gateway failures without dropping alerts.
2. **Isolate Lifecycle & Platform Channel Memory Management (OpenCode / Local-Ollama):** Recommended explicit isolate termination (`Isolate.kill()`) after background sync completion to prevent memory leaks in background processes (`PMM-010`).
3. **Multi-Environment Build Management & Signing Security (Qwen & OpenCode):** Recommended separating build configurations into explicit Flutter flavors (`dev`, `staging`, `prod`) and passing code-signing secrets via encrypted GitHub Secrets rather than committing signing configs (`PMM-001`, `PMM-002`, `PMM-004`).
4. **Automated WCAG CI Gate Integration (Claude Code & Qwen):** Suggested embedding automated `axe-core` accessibility checks into Jest unit/integration tests (`PMM-016`) to enforce WCAG 2.1 AA compliance as a build-blocking CI gate.
5. **Root-Cause Driven Test Remediation (Claude Code):** Recommended categorizing the 9 legacy test failures by failure mode (schema drift, unhandled async promise, obsolete route contract) before refactoring, ensuring zero test assertions are silently removed (`PMM-017`).

---

## Scope & Out of Scope

### In Scope

1. **App Store & Play Store Packaging Pipeline:**
   - Android Keystore signing configuration, Gradle release flavor setup, and ProGuard/R8 obfuscation rules.
   - iOS Xcode ExportOptions.plist configuration, distribution profile setup, and App Store Connect signing.
   - Web bundle optimization (Next.js tree-shaking, dynamic route code-splitting, asset compression).
   - Automated GitHub Actions release pipeline (`.github/workflows/mobile-release.yml`) building signed `.aab` (Android) and `.ipa` (iOS) artifacts.

2. **Push Notification Infrastructure (FCM/APNs):**
   - Push device token database schema (`push_notification_tokens` table in `packages/db`).
   - Token registration & management API handler (`/api/mobile/push/register`).
   - Backend Push Notification Service (`push-notification-service.ts`) supporting FCM and APNs drivers with exponential backoff retries.
   - SSE-to-Push Bridge (`sse-push-bridge.ts`) converting critical governance events (`POLICY_PROPAGATED`, `CIRCUIT_BREAKER_STATE_CHANGED`, `EMERGENCY_ALERT`) into mobile push alerts.
   - Flutter push notification service client (`push_notification_service.dart`) with token refresh listeners and local alert notifications.

3. **Background Isolate Sync:**
   - Dart Background Isolate worker (`background_sync_isolate.dart`) for background queue execution.
   - Platform channel integration with Android WorkManager and iOS BackgroundFetch.
   - Background sync status endpoint (`/api/mobile/sync/background-status`) and sync audit logging.
   - Storage isolation and AES key retrieval in background isolate context via `FlutterSecureStorage`.

4. **WCAG 2.1 AA Accessibility Audit & Remediation:**
   - Web accessibility remediation across authenticated shell layout (`src/app/(shell)/`), Executive Analytics Dashboard (`/admin/executive/analytics`), and core forms.
   - ARIA landmarks, roles, keyboard focus order, aria-labels, and high-contrast color verification (4.5:1 ratio).
   - Flutter `Semantics` widget wrapping across voice copilot, mobile navigation, and offline sync screens.
   - Automated accessibility validation test suite (`accessibility-wcag.test.ts`) integrated into CI.

5. **Legacy Test Suite Remediation & Sprint Certification:**
   - Systematic refactoring and fixing of all 9 failing legacy test suites to achieve 150/150 (100%) test pass rate.
   - Comprehensive Sprint-015 verification test suite (`sprint-015-verification.test.ts`).
   - Security Invariants & Audit test suite (`sprint-015-security-audit.test.ts`).
   - Architecture Guide (`docs/mobile-packaging-push-accessibility-guide.md`), AIOS documentation updates (`.ai/FEATURES.md`, `.ai/CHANGELOG.md`, `.ai/PROJECT_STATUS.md`), and Sprint-015 Execution Log.

### Explicitly Out of Scope

- Purchasing official Apple Developer or Google Play Console paid organization accounts (contract handles workflow & build pipeline readiness; account setup is an administrative task).
- Submitting app builds to live public App Store / Play Store review tracks during sprint execution (artifacts are uploaded to private test tracks / internal testflight).
- Custom biometric authentication hardware drivers beyond standard OS LocalAuthentication APIs.
- Developing new business features outside packaging, push notifications, background sync, accessibility, and test remediation.
- Modifying underlying core database engines (SQLite / PostgreSQL schema remains intact except for new push token table).

---

## Detailed Task Breakdown

### Phase 1: App Store & Play Store Packaging Pipeline

#### Task PMM-001: Android App Bundle (.aab) Packaging & Keystore Signing Configuration (Flutter)
- **Task ID:** PMM-001
- **Description:** Configure Android release signing for the Flutter mobile project. Set up `key.properties` loading in `mobile/android/app/build.gradle`, create release signing configs, configure release build types with `signingConfig signingConfigs.release`, and enable Android App Bundle (.aab) generation. Ensure sensitive Keystore passwords are read strictly from environment variables or `key.properties` (git-ignored).
- **Files:**
  - `mobile/android/app/build.gradle` [MODIFY]
  - `mobile/android/key.properties.example` [NEW]
  - `mobile/android/app/proguard-rules.pro` [MODIFY — add Flutter & Hive obfuscation rules]
  - `.gitignore` [MODIFY — ensure `*.keystore`, `*.jks`, `key.properties` are ignored]
- **Dependencies:** None (foundational task for Phase 1)
- **Acceptance Criteria:**
  - `mobile/android/app/build.gradle` successfully loads signing credentials from environment variables or `key.properties`.
  - Gradle task `flutter build appbundle --release` executes cleanly and outputs a signed `.aab` file in `mobile/build/app/outputs/bundle/release/`.
  - `.gitignore` contains rules preventing any `.keystore`, `.jks`, or `key.properties` file from being committed.
  - ProGuard/R8 obfuscation rules in `proguard-rules.pro` preserve Hive, Flutter, and Riverpod reflection classes without build breakage.
- **Verification Method:** Run `cd mobile && flutter build appbundle --release --dry-run` and inspect Gradle build output for zero signing errors.
- **Estimated Complexity:** Medium

---

#### Task PMM-002: iOS IPA Export & App Store Connect Signing Configuration (Flutter)
- **Task ID:** PMM-002
- **Description:** Configure iOS build packaging for App Store Connect distribution. Create `ExportOptions.plist` template for automated xcodebuild IPA packaging, configure `Runner.xcodeproj` project settings for App Store release, and document code-signing certificate and provisioning profile setup for manual/CI runners.
- **Files:**
  - `mobile/ios/ExportOptions.plist` [NEW]
  - `mobile/ios/Runner.xcodeproj/project.pbxproj` [MODIFY — update release build configurations]
  - `mobile/ios/Runner/Info.plist` [MODIFY — update version keys, background mode capabilities]
- **Dependencies:** None
- **Acceptance Criteria:**
  - `ExportOptions.plist` configured with `method: app-store`, `uploadSymbols: true`, `uploadBitcode: false`, and dynamic provisioning profile mapping.
  - `Info.plist` includes required `UIBackgroundModes` entries (`fetch`, `remote-notification`) for push notifications and background sync.
  - `flutter build ipa --release --export-options-plist=ios/ExportOptions.plist --no-codesign` generates valid iOS release payload structure.
  - CocoaPods dependencies build cleanly in release configuration.
- **Verification Method:** Run `cd mobile && flutter build ipa --release --no-codesign` and verify clean build exit code.
- **Estimated Complexity:** Medium-High

---

#### Task PMM-003: Flutter & Web Release Build Optimization (ProGuard/R8 & Bundle Splitting)
- **Task ID:** PMM-003
- **Description:** Optimize production build bundles for both Web (Next.js) and Mobile (Flutter). Configure Next.js `next.config.ts` for route-based bundle splitting, dynamic imports for heavy components (charts, analytics), and tree-shaking optimization. Tune Flutter compilation flags (`--split-debug-info`, `--obfuscate`, `--target-platform android-arm64,android-x64`).
- **Files:**
  - `next.config.ts` [MODIFY — add bundle analyzer & optimization options]
  - `mobile/android/app/build.gradle` [MODIFY — configure R8 shrinker]
  - `docs/build-optimization-guide.md` [NEW]
- **Dependencies:** PMM-001, PMM-002
- **Acceptance Criteria:**
  - Next.js initial JS bundle size reduced by ≥ 15% via dynamic component imports for `/admin/executive/analytics`.
  - Flutter release build uses `--split-debug-info=build/app/outputs/symbols` and `--obfuscate` flags.
  - `npx next build` generates optimized production bundle with 0 build warnings.
  - Documentation saved to `docs/build-optimization-guide.md` summarizing build size metrics and symbol de-obfuscation procedures.
- **Verification Method:** Execute `npx next build` and `flutter build apk --release --split-debug-info=build/symbols`. Verify output sizes and clean compilation.
- **Estimated Complexity:** Medium

---

#### Task PMM-004: GitHub Actions Automated Mobile Release Workflow
- **Task ID:** PMM-004
- **Description:** Create an automated GitHub Actions release workflow `.github/workflows/mobile-release.yml` that triggers on version tags (`v*.*.*`). The workflow checks out code, sets up Flutter & Java/Android SDK, decodes signing keystores from GitHub Secrets, builds signed Android App Bundles (.aab) and iOS release IPAs, uploads release artifacts, and generates release draft notes.
- **Files:**
  - `.github/workflows/mobile-release.yml` [NEW]
- **Dependencies:** PMM-001, PMM-002, PMM-003
- **Acceptance Criteria:**
  - Workflow triggers automatically on push of git tags matching `v*.*.*` or manual `workflow_dispatch`.
  - Android Job: sets up JDK 17, Flutter 3.24+, decodes `ANDROID_KEYSTORE_BASE64` secret, executes `flutter build appbundle --release`, and uploads `.aab` as workflow artifact.
  - iOS Job (macOS runner): sets up Xcode, decodes provisioning profile secrets, executes `flutter build ipa --release`, and uploads `.ipa` artifact.
  - Security check: ensure temporary keystore and provisioning profile files are destroyed in workflow `always()` cleanup step.
  - GitHub Release Draft created automatically with build artifact links.
- **Verification Method:** Test workflow syntax locally via `actionlint` or push a test tag to verify full job execution on GitHub Actions.
- **Estimated Complexity:** High

---

### Phase 2: Push Notification Infrastructure (FCM/APNs)

#### Task PMM-005: Push Notification Device Token Database Schema & API Route
- **Task ID:** PMM-005
- **Description:** Create the Drizzle database schema table `push_notification_tokens` for storing FCM/APNs registration tokens, platform identifiers (android/ios/web), user IDs, device metadata, and updated timestamps. Implement the authentication-protected API route handler `/api/mobile/push/register` for registering, updating, and de-registering device tokens.
- **Files:**
  - `packages/db/schema/push-tokens.ts` [NEW]
  - `packages/db/index.ts` [MODIFY — export push token schema]
  - `src/app/api/mobile/push/register/route.ts` [NEW]
  - `src/lib/validation/schemas.ts` [MODIFY — add push token registration schema]
  - `src/lib/__tests__/push-token-api.test.ts` [NEW]
- **Dependencies:** None (foundational DB & API task for Phase 2)
- **Acceptance Criteria:**
  - Table `push_notification_tokens` created with fields: `id` (UUID PK), `userId` (FK to users), `token` (TEXT unique), `platform` (ENUM 'android', 'ios', 'web'), `deviceModel` (TEXT), `isActive` (BOOLEAN), `createdAt`, `updatedAt`.
  - POST `/api/mobile/push/register` requires authenticated user session (`requireAuth(handler)`), validates body via Zod `pushTokenSchema`, upserts token record (updating `updatedAt` and setting `isActive = true`).
  - DELETE `/api/mobile/push/register` de-registers token (setting `isActive = false`).
  - API handler returns 200 `{ success: true, tokenId }` on success, 400 on invalid schema, 401 on unauthenticated.
  - Unit tests in `push-token-api.test.ts` pass with 100% assertion rate.
- **Verification Method:** Run `pnpm test src/lib/__tests__/push-token-api.test.ts`.
- **Estimated Complexity:** Medium

---

#### Task PMM-006: Backend Unified Push Notification Service (FCM/APNs Drivers)
- **Task ID:** PMM-006
- **Description:** Implement a unified backend push notification service `src/lib/notifications/push-notification-service.ts` supporting both FCM (Android/Web) and APNs (iOS) push notification providers. Features exponential backoff retries, invalid token auto-pruning, payload formatting, and batch dispatch to user devices.
- **Files:**
  - `src/lib/notifications/push-notification-service.ts` [NEW]
  - `src/lib/notifications/fcm-driver.ts` [NEW]
  - `src/lib/notifications/apns-driver.ts` [NEW]
  - `src/lib/__tests__/push-notification-service.test.ts` [NEW]
- **Dependencies:** PMM-005
- **Acceptance Criteria:**
  - `PushNotificationService.sendToUser(userId, title, body, data)` queries active push tokens for `userId` from DB and dispatches via appropriate driver (FCM or APNs).
  - Handles batch dispatches up to 500 tokens per call.
  - Auto-pruning: when FCM/APNs gateway returns `MessagingEntityNotFound` or `Unregistered` error, automatically sets token `isActive = false` in DB.
  - Exponential backoff retry: retries transient network errors (HTTP 500/503) up to 3 times with exponential backoff (200ms, 400ms, 800ms).
  - Fallback mode: if FCM/APNs credentials are missing in dev environment, logs alert to console without throwing.
  - Unit tests mock FCM/APNs responses and verify token auto-pruning, retry logic, and payload delivery.
- **Verification Method:** Run `pnpm test src/lib/__tests__/push-notification-service.test.ts`.
- **Estimated Complexity:** High

---

#### Task PMM-007: SSE-to-Push Notification Bridge for Critical Governance Events
- **Task ID:** PMM-007
- **Description:** Implement an event bridge `src/lib/notifications/sse-push-bridge.ts` connecting Sprint-012's SSE `event-bus.ts` (`src/lib/sse/event-bus.ts`) to `PushNotificationService` (PMM-006). Subscribes to high-priority governance events (`POLICY_PROPAGATED`, `CIRCUIT_BREAKER_STATE_CHANGED`, `DLQ_THRESHOLD_EXCEEDED`, `EMERGENCY_ANNOUNCEMENT`) and automatically converts them to mobile push notifications targeting super_admins, principals, and affected campus staff.
- **Files:**
  - `src/lib/notifications/sse-push-bridge.ts` [NEW]
  - `src/lib/sse/event-bus.ts` [MODIFY — register event bridge initializer]
  - `src/lib/__tests__/sse-push-bridge.test.ts` [NEW]
- **Dependencies:** PMM-005, PMM-006
- **Acceptance Criteria:**
  - `SsePushBridge.init()` attaches event listeners to `eventBus` on application startup.
  - `POLICY_PROPAGATED` event triggers push alert to institutional admins: title "Policy Updated", body with policy ID and status.
  - `CIRCUIT_BREAKER_STATE_CHANGED` event triggers high-priority push alert to super_admins: title "Governance Alert", body with circuit breaker status (OPEN/HALF_OPEN).
  - Dispatches push notifications within < 3 seconds of event publication on SSE bus.
  - Prevents notification storms: deduplicates rapid duplicate events for the same entity within a 10-second window.
  - Unit tests verify event bus subscription, notification formatting, and deduplication logic.
- **Verification Method:** Run `pnpm test src/lib/__tests__/sse-push-bridge.test.ts`.
- **Estimated Complexity:** Medium-High

---

#### Task PMM-008: Flutter Push Notification Service Integration & FCM/APNs Client
- **Task ID:** PMM-008
- **Description:** Create `PushNotificationService` in Flutter (`mobile/lib/core/notifications/push_notification_service.dart`) using `firebase_messaging` and `flutter_local_notifications`. Handles device token registration with `/api/mobile/push/register`, listens for token refresh events (`onTokenRefresh`), processes incoming push messages in foreground/background states, and surfaces local heads-up notifications.
- **Files:**
  - `mobile/lib/core/notifications/push_notification_service.dart` [NEW]
  - `mobile/lib/core/notifications/push_notification_provider.dart` [NEW]
  - `mobile/pubspec.yaml` [MODIFY — add `firebase_messaging`, `flutter_local_notifications`]
- **Dependencies:** PMM-005, PMM-006
- **Acceptance Criteria:**
  - `PushNotificationService.initialize()` requests user push notification permissions (iOS/Android 13+).
  - Fetches FCM device token and posts to `/api/mobile/push/register` with authenticated session cookie.
  - Listens to `FirebaseMessaging.instance.onTokenRefresh` and updates backend token registry automatically.
  - Foreground notifications: displays `flutter_local_notifications` banner when message arrives while app is open.
  - Background/Terminated state: tapping notification opens app and routes to relevant screen via `GoRouter` path specified in payload data (`/admin/executive/analytics` or `/governance/policy/:id`).
  - Unit tests verify provider state management and message routing logic.
- **Verification Method:** Run `cd mobile && flutter test test/core/notifications/push_notification_test.dart`.
- **Estimated Complexity:** High

---

#### Task PMM-009: Push Notification Security & RBAC Audit Test Suite
- **Task ID:** PMM-009
- **Description:** Create a dedicated security test suite `src/lib/__tests__/push-notification-security.test.ts` verifying RBAC authorization for push token registration, token ownership isolation (users cannot overwrite other users' tokens), push payload data privacy (no sensitive passwords/PII in push payloads), and rate limiting on push registration API routes.
- **Files:**
  - `src/lib/__tests__/push-notification-security.test.ts` [NEW]
- **Dependencies:** PMM-005, PMM-006, PMM-007
- **Acceptance Criteria:**
  - Test: Unauthenticated requests to `/api/mobile/push/register` rejected with HTTP 401.
  - Test: User A cannot delete or modify push token registered to User B (HTTP 403 Forbidden).
  - Test: Push notification payload builder strips sensitive fields (passwords, internal secret keys) before dispatching to FCM/APNs.
  - Test: Rate limiting rejects > 10 token registration requests per minute per IP.
  - All security invariant assertions pass with 100% pass rate.
- **Verification Method:** Run `pnpm test src/lib/__tests__/push-notification-security.test.ts`.
- **Estimated Complexity:** Medium

---

### Phase 3: Background Isolate Sync

#### Task PMM-010: Dart Background Isolate Sync Engine (Flutter)
- **Task ID:** PMM-010
- **Description:** Implement `background_sync_isolate.dart` in Flutter. This module executes in an independent Dart Isolate, allowing offline sync queue processing when the app is backgrounded or minimized. It initializes `LocalDbAdapter` independently using the AES key from `FlutterSecureStorage`, reads pending `SyncRecord` entries from Hive outbox queue, and dispatches HTTP sync requests to backend APIs.
- **Files:**
  - `mobile/lib/core/sync/background_sync_isolate.dart` [NEW]
  - `mobile/lib/core/sync/isolate_message_protocol.dart` [NEW]
  - `mobile/lib/core/sync/offline_sync_queue.dart` [MODIFY — expose thread-safe isolate sync helper]
- **Dependencies:** None (extends Sprint-014 offline queue persistence)
- **Acceptance Criteria:**
  - `backgroundSyncIsolateEntryPoint(SendPort sendPort)` runs cleanly in a standalone background isolate context.
  - Initializes Hive encrypted boxes via `LocalDbAdapter` using secure storage key without throwing UI thread errors.
  - Fetches pending offline records, orders by priority/timestamp, and transmits to `/api/sync/outbox` endpoint via HTTP client.
  - Updates record status in Hive to `synced` or `failed` (incrementing retry count).
  - Memory safety: sends completion message via `SendPort` and terminates isolate (`Isolate.kill()`) after queue flush or 30-second execution timeout.
  - Unit tests verify isolate message protocol and queue processing state transitions using mock HTTP client.
- **Verification Method:** Run `cd mobile && flutter test test/core/sync/background_sync_isolate_test.dart`.
- **Estimated Complexity:** High

---

#### Task PMM-011: Native WorkManager & BackgroundFetch Platform Channels (Android/iOS)
- **Task ID:** PMM-011
- **Description:** Integrate `workmanager` (Android) and `background_fetch` (iOS) plugins to schedule periodic background sync triggers for `background_sync_isolate.dart`. Configures battery-aware background constraints (requires network connection, defers during low battery) and handles OS background task registration.
- **Files:**
  - `mobile/lib/core/sync/background_task_manager.dart` [NEW]
  - `mobile/pubspec.yaml` [MODIFY — add `workmanager`, `background_fetch`]
  - `mobile/android/app/src/main/AndroidManifest.xml` [MODIFY — register WorkManager background service & permissions]
  - `mobile/ios/Runner/AppDelegate.swift` [MODIFY — register BackgroundFetch completion handler]
- **Dependencies:** PMM-010
- **Acceptance Criteria:**
  - `BackgroundTaskManager.initialize()` registers background task handler with `WorkManager` (Android) and `BackgroundFetch` (iOS).
  - Configures periodic sync task with minimum 15-minute execution interval.
  - Enforces OS background constraints: `NetworkType.connected`, `requiresBatteryNotLow: true`.
  - Android `AndroidManifest.xml` declares `RECEIVE_BOOT_COMPLETED` and `WAKE_LOCK` permissions for background tasks.
  - iOS `AppDelegate.swift` handles `BGTaskScheduler` callback and calls `BackgroundFetch.finish()`.
  - Unit tests verify `BackgroundTaskManager` initialization and task scheduling logic.
- **Verification Method:** Test background execution on Android emulator via `adb shell cmd jobscheduler run -f <package> <job_id>` and iOS simulator via Xcode debug background fetch trigger.
- **Estimated Complexity:** Medium-High

---

#### Task PMM-012: Background Sync Health Status API & Persistence
- **Task ID:** PMM-012
- **Description:** Create the API endpoint `/api/mobile/sync/background-status` and DB schema logger for tracking background sync execution health, isolate sync success/failure rates, battery constraints impact, and last background sync timestamp per mobile client device.
- **Files:**
  - `packages/db/schema/background-sync-logs.ts` [NEW]
  - `packages/db/index.ts` [MODIFY — export background sync log schema]
  - `src/app/api/mobile/sync/background-status/route.ts` [NEW]
  - `src/lib/__tests__/background-sync-api.test.ts` [NEW]
- **Dependencies:** PMM-010
- **Acceptance Criteria:**
  - Table `background_sync_logs` records: `id`, `userId`, `deviceId`, `recordsProcessed`, `recordsFailed`, `executionDurationMs`, `batteryLevel`, `networkType`, `createdAt`.
  - POST `/api/mobile/sync/background-status` records background isolate sync execution reports from mobile devices.
  - GET `/api/mobile/sync/background-status` allows super_admin and admin users to query background sync health metrics per institution/campus.
  - API handler returns 200 OK with summary statistics (average duration, success rate, total background records synced in last 24h).
  - Unit tests pass with 100% assertions.
- **Verification Method:** Run `pnpm test src/lib/__tests__/background-sync-api.test.ts`.
- **Estimated Complexity:** Medium

---

#### Task PMM-013: Background Isolate Sync Unit & Integration Test Suite
- **Task ID:** PMM-013
- **Description:** Create a comprehensive integration test suite `src/lib/__tests__/background-sync-integration.test.ts` testing the end-to-end background sync flow: mobile payload generation, encrypted Hive storage in isolate context, background API payload dispatch to `/api/sync/outbox`, status logging at `/api/mobile/sync/background-status`, and server-side DB mutation persistence.
- **Files:**
  - `src/lib/__tests__/background-sync-integration.test.ts` [NEW]
- **Dependencies:** PMM-010, PMM-011, PMM-012
- **Acceptance Criteria:**
  - Test: Simulated background isolate payload flush successfully updates target DB entities.
  - Test: Duplicate background sync dispatches are resolved via LWW (Last-Write-Wins) timestamp resolver without data corruption.
  - Test: Failed background requests remain in Hive outbox with incremented retry count and failure reason.
  - Test: Background sync health log updated accurately in DB.
  - All test assertions pass cleanly with zero flakiness.
- **Verification Method:** Run `pnpm test src/lib/__tests__/background-sync-integration.test.ts`.
- **Estimated Complexity:** Medium-High

---

### Phase 4: WCAG 2.1 AA Accessibility Audit & Remediation

#### Task PMM-014: Web Authenticated Shell & Executive Analytics WCAG 2.1 AA Remediation
- **Task ID:** PMM-014
- **Description:** Conduct a thorough accessibility remediation pass across web authenticated shell pages (`src/app/(shell)/`), sidebar navigation (`sidebar-nav.tsx`), modal dialogs, and the Executive Analytics Dashboard (`/admin/executive/analytics`). Fix HTML semantics, focus management, ARIA landmarks, aria-labels, screen reader announcements, keyboard navigation traps, and color contrast compliance (4.5:1 text, 3:1 graphical elements).
- **Files:**
  - `src/app/(shell)/layout.tsx` [MODIFY — add ARIA landmarks `<main>`, `<nav>`, `<header>`]
  - `src/components/layout/sidebar-nav.tsx` [MODIFY — add aria-expanded, keyboard arrow navigation]
  - `src/app/(shell)/admin/executive/analytics/page.tsx` [MODIFY — add aria-live regions for live SSE updates]
  - `src/components/admin/executive-*.tsx` [MODIFY — update color contrast & focus rings]
- **Dependencies:** None (foundational web UI task for Phase 4)
- **Acceptance Criteria:**
  - Navigation elements contain proper `role="navigation"`, `aria-label="Main Navigation"`, and `aria-current="page"` indicators.
  - Live dashboard metrics use `aria-live="polite"` so screen readers announce metric updates during SSE triggers without interrupting user focus.
  - Color contrast ratio for all body text, status badges (`<Badge>`), and gauge cards meets or exceeds 4.5:1 ratio against background.
  - All interactive buttons and inputs have visible focus indicators (`focus-visible:ring-2 focus-visible:ring-primary`).
  - Keyboard navigation allows full page interaction using `Tab`, `Shift+Tab`, `Enter`, and `Space` without getting trapped in modals or dropdowns.
- **Verification Method:** Inspect with Chrome DevTools Accessibility Tree & Lighthouse Accessibility audit (score = 100/100).
- **Estimated Complexity:** High

---

#### Task PMM-015: Flutter Mobile Companion Accessibility & Screen Reader (Semantics) Enhancement
- **Task ID:** PMM-015
- **Description:** Enhance mobile app accessibility across Flutter companion screens (`VoiceCopilotScreen`, `WebViewHandoffScreen`, dashboard tiles, navigation bar). Wrap interactive elements in `Semantics` widgets with descriptive `label`, `hint`, and `button` properties. Ensure screen reader support (TalkBack on Android, VoiceOver on iOS), high-contrast theme support, and dynamic text scaling (up to 200% font scale without layout overflow).
- **Files:**
  - `mobile/lib/features/copilots/presentation/screens/voice_copilot_screen.dart` [MODIFY — wrap voice UI in Semantics]
  - `mobile/lib/features/dashboard/presentation/screens/dashboard_screen.dart` [MODIFY — add Semantics to KPI tiles]
  - `mobile/lib/core/theme/app_theme.dart` [MODIFY — high contrast colors & dynamic text scaling support]
- **Dependencies:** None
- **Acceptance Criteria:**
  - `VoiceCopilotScreen`: microphone action button wrapped in `Semantics(label: 'Start voice copilot recording', button: true, hint: 'Double tap to activate voice recognition')`.
  - Intelligence answer card wrapped in `Semantics(liveRegion: true)` for automatic screen reader reading upon voice response arrival.
  - Text elements scale dynamically up to 2.0x font factor without clipping or text overflow bugs.
  - Color palette in `app_theme.dart` passes 4.5:1 contrast ratio for light and dark themes.
  - Flutter accessibility analyzer (`flutter analyze` with accessibility rules) passes with zero warnings.
- **Verification Method:** Enable TalkBack / VoiceOver in emulator/simulator and verify screen reader navigation flow across all screens.
- **Estimated Complexity:** Medium-High

---

#### Task PMM-016: Automated WCAG 2.1 AA Accessibility Validation Test Suite
- **Task ID:** PMM-016
- **Description:** Create an automated accessibility testing suite `src/lib/__tests__/accessibility-wcag.test.ts` using `axe-core` / `jest-axe` to audit rendered React component HTML outputs for WCAG 2.1 AA compliance. Tests check color contrast, missing alt attributes, unlabelled form inputs, invalid ARIA roles, and duplicate DOM IDs.
- **Files:**
  - `src/lib/__tests__/accessibility-wcag.test.ts` [NEW]
  - `package.json` [MODIFY — add `jest-axe` dev dependency]
- **Dependencies:** PMM-014
- **Acceptance Criteria:**
  - `accessibility-wcag.test.ts` renders key UI components (`SidebarNav`, `GovernanceHealthCard`, `ResilienceKpiGauge`, `VoiceCopilotUsagePanel`, `ExecutiveAnalyticsDashboard`) and executes `expect(await axe(container)).toHaveNoViolations()`.
  - Zero WCAG 2.1 AA violations reported across all audited components.
  - Test suite runs automatically as part of `pnpm test`.
  - 100% test assertion pass rate.
- **Verification Method:** Run `pnpm test src/lib/__tests__/accessibility-wcag.test.ts`.
- **Estimated Complexity:** Medium

---

### Phase 5: Technical Debt Remediation & Sprint Certification

#### Task PMM-017: Legacy Test Suite Contract & Schema Remediation (9 Failing Suites → 100% Pass)
- **Task ID:** PMM-017
- **Description:** Systematically remediate the 9 remaining failing legacy test suites to achieve 150/150 (100%) test suite pass rate. Fix obsolete database seed schemas (updating to current Drizzle schema), unhandled async Promise rejections, deprecated API signatures, and hardcoded port assumptions across the 9 target test files.
- **Files:**
  - `src/lib/__tests__/legacy-auth-flow.test.ts` [MODIFY — update mock auth & schema]
  - `src/lib/__tests__/legacy-finance-reports.test.ts` [MODIFY — update Drizzle schema seed]
  - `src/lib/__tests__/legacy-academic-grading.test.ts` [MODIFY — update grading API contracts]
  - `src/lib/__tests__/legacy-student-attendance.test.ts` [MODIFY — update attendance mock data]
  - `src/lib/__tests__/legacy-media-upload.test.ts` [MODIFY — update mock request helper]
  - `src/lib/__tests__/legacy-campus-ops.test.ts` [MODIFY — fix async promise rejection]
  - `src/lib/__tests__/legacy-notification-dispatch.test.ts` [MODIFY — update event bus mock]
  - `src/lib/__tests__/legacy-export-pdf.test.ts` [MODIFY — fix PDF stream buffer mock]
  - `src/lib/__tests__/legacy-system-backup.test.ts` [MODIFY — update file path mocks]
- **Dependencies:** None (standalone technical debt task)
- **Acceptance Criteria:**
  - All 9 legacy test suites updated to use current `createTestDb()` factory and `mockNextRequest()` helpers.
  - Zero skipped or failing test suites remain across the entire codebase.
  - Total test suite status: **150 / 150 passing test suites (100% coverage)**.
  - Total individual test assertions passing: ≥ 580 tests.
  - `pnpm test` completes with 0 errors and green pass status across all suites.
- **Verification Method:** Run `pnpm test` and verify test suite count: `Test Suites: 150 passed, 150 total`.
- **Estimated Complexity:** High

---

#### Task PMM-018: Sprint-015 End-to-End Production Hardening & Integration Test Suite
- **Task ID:** PMM-018
- **Description:** Create an end-to-end integration test suite `src/lib/__tests__/sprint-015-integration.test.ts` verifying the unified interaction of all Sprint-015 subsystems: mobile release package build specs, push notification token registration, SSE-to-push event bridging, background isolate sync status logging, and WCAG accessibility compliance.
- **Files:**
  - `src/lib/__tests__/sprint-015-integration.test.ts` [NEW]
- **Dependencies:** PMM-005, PMM-007, PMM-012, PMM-016, PMM-017
- **Acceptance Criteria:**
  - Test: Registering a push token via `/api/mobile/push/register` and publishing a `POLICY_PROPAGATED` event on SSE bus successfully triggers push notification payload dispatch to the registered token.
  - Test: Background sync status post to `/api/mobile/sync/background-status` correctly updates background sync health metrics.
  - Test: Executive analytics API handler returns valid WCAG-compliant data structure.
  - 100% pass rate on all integration assertions. Zero flaky tests.
- **Verification Method:** Run `pnpm test src/lib/__tests__/sprint-015-integration.test.ts`.
- **Estimated Complexity:** Medium-High

---

#### Task PMM-019: Security Invariants & Governance Audit Test Suite
- **Task ID:** PMM-019
- **Description:** Create a comprehensive security audit test suite `src/lib/__tests__/sprint-015-security-audit.test.ts` verifying all security invariants across Sprint-015 features: (1) Push notification token endpoint authentication & RBAC, (2) Background sync API tenant isolation, (3) FCM/APNs credential secrecy in release builds, and (4) Release packaging signature integrity.
- **Files:**
  - `src/lib/__tests__/sprint-015-security-audit.test.ts` [NEW]
- **Dependencies:** PMM-005, PMM-009, PMM-012
- **Acceptance Criteria:**
  - Security Invariant 1: Unauthenticated or unauthorized role access to push or background sync endpoints is strictly blocked (HTTP 401/403).
  - Security Invariant 2: Tenant isolation verified — background sync records from Institution A cannot be accessed or modified by users from Institution B.
  - Security Invariant 3: Verify no plaintext FCM/APNs private keys or Keystore passwords exist in public source code or committed artifacts.
  - Security Invariant 4: Code signing configurations verify signature checksum integrity.
  - All 4 security invariants verified and passing.
- **Verification Method:** Run `pnpm test src/lib/__tests__/sprint-015-security-audit.test.ts`.
- **Estimated Complexity:** Medium

---

#### Task PMM-020: Sprint-015 Architecture Guide, AIOS Documentation Update & Execution Log
- **Task ID:** PMM-020
- **Description:** Write the technical architecture guide `docs/mobile-packaging-push-accessibility-guide.md` documenting Sprint-015 features: release packaging configuration, FCM/APNs push notification bridge architecture, background isolate sync engine design, WCAG 2.1 AA accessibility guidelines, and legacy test remediation strategies. Update `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` to reflect v2.7.0 completion. Save the Sprint-015 Execution Log.
- **Files:**
  - `docs/mobile-packaging-push-accessibility-guide.md` [NEW]
  - `.ai/FEATURES.md` [MODIFY — add Sprint-015 features]
  - `.ai/CHANGELOG.md` [MODIFY — add v2.7.0 entry]
  - `.ai/PROJECT_STATUS.md` [MODIFY — update status to v2.7.0 / Sprint-015 complete]
  - `.ai/execution/Sprint-015-Execution-Log.md` [NEW]
- **Dependencies:** PMM-001 through PMM-019
- **Acceptance Criteria:**
  - `docs/mobile-packaging-push-accessibility-guide.md` documents: Android/iOS release packaging workflows, push notification service architecture & token lifecycle, Dart background isolate synchronization patterns, WCAG 2.1 AA accessibility standards & testing, and test suite remediation notes.
  - `.ai/FEATURES.md` updated with feature entries for all 5 Phase focus areas.
  - `.ai/CHANGELOG.md` updated with `v2.7.0` release entry detailing all 20 tasks.
  - `.ai/PROJECT_STATUS.md` updated to reflect `Product Version: 2.7.0`, `Sprint ID: PROD-PACKAGING-MOBILE-MATURITY-015`, `Status: ✅ Completed & Released`, and `Test Status: 150/150 passing (100%)`.
  - `Sprint-015-Execution-Log.md` saved with all 20 tasks marked complete, files created/modified, acceptance criteria status, and build/test verification results.
- **Verification Method:** Verify all documentation files are saved, formatted in valid GitHub Markdown, and accurate.
- **Estimated Complexity:** Low-Medium

---

## Task Matrix & Dependencies

| Task ID | Description | Primary Files | Dependencies | Complexity |
| :--- | :--- | :--- | :--- | :--- |
| **PMM-001** | Android App Bundle (.aab) & Keystore Signing Config | `build.gradle`, `key.properties.example`, `proguard-rules.pro` | None | Medium |
| **PMM-002** | iOS IPA Export & App Store Connect Signing Config | `ExportOptions.plist`, `project.pbxproj`, `Info.plist` | None | Med-High |
| **PMM-003** | Flutter & Web Release Build Optimization | `next.config.ts`, `build.gradle`, `build-optimization-guide.md` | PMM-001, PMM-002 | Medium |
| **PMM-004** | GitHub Actions Automated Mobile Release Workflow | `.github/workflows/mobile-release.yml` | PMM-001, 002, 003 | High |
| **PMM-005** | Push Device Token DB Schema & API Route | `push-tokens.ts`, `/api/mobile/push/register/route.ts` | None | Medium |
| **PMM-006** | Backend Unified Push Notification Service (FCM/APNs) | `push-notification-service.ts`, `fcm-driver.ts`, `apns-driver.ts` | PMM-005 | High |
| **PMM-007** | SSE-to-Push Notification Event Bridge | `sse-push-bridge.ts`, `event-bus.ts` | PMM-005, PMM-006 | Med-High |
| **PMM-008** | Flutter Push Notification Service & FCM Client | `push_notification_service.dart`, `pubspec.yaml` | PMM-005, PMM-006 | High |
| **PMM-009** | Push Notification Security & RBAC Audit Test Suite | `push-notification-security.test.ts` | PMM-005, 006, 007 | Medium |
| **PMM-010** | Dart Background Isolate Sync Engine | `background_sync_isolate.dart`, `isolate_message_protocol.dart` | None | High |
| **PMM-011** | WorkManager & BackgroundFetch Platform Channels | `background_task_manager.dart`, `AndroidManifest.xml`, `AppDelegate.swift` | PMM-010 | Med-High |
| **PMM-012** | Background Sync Health Status API & Persistence | `background-sync-logs.ts`, `/api/mobile/sync/background-status` | PMM-010 | Medium |
| **PMM-013** | Background Sync Unit & Integration Test Suite | `background-sync-integration.test.ts` | PMM-010, 011, 012 | Med-High |
| **PMM-014** | Web Shell & Executive Analytics WCAG 2.1 AA Remediation | `layout.tsx`, `sidebar-nav.tsx`, `executive-*.tsx` | None | High |
| **PMM-015** | Flutter Companion Screen Reader & Semantics | `voice_copilot_screen.dart`, `app_theme.dart` | None | Med-High |
| **PMM-016** | Automated WCAG 2.1 AA Accessibility Test Suite | `accessibility-wcag.test.ts` | PMM-014 | Medium |
| **PMM-017** | Legacy Test Suite Contract & Schema Remediation (9 Suites) | 9 legacy test files in `src/lib/__tests__/` | None | High |
| **PMM-018** | Sprint-015 E2E Production Hardening Test Suite | `sprint-015-integration.test.ts` | PMM-005, 007, 012, 016, 017 | Med-High |
| **PMM-019** | Security Invariants & Governance Audit Test Suite | `sprint-015-security-audit.test.ts` | PMM-005, 009, 012 | Medium |
| **PMM-020** | Architecture Guide, AIOS Docs & Execution Log | `docs/`, `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, `.ai/PROJECT_STATUS.md`, Execution Log | PMM-001..019 | Low-Med |

### Dependency Graph

```
Phase 1: PMM-001 \
                  +---> PMM-003 ---> PMM-004
         PMM-002 /

Phase 2: PMM-005 ---> PMM-006 ---> PMM-007 ---> PMM-009
                         |
                         +--------> PMM-008

Phase 3: PMM-010 ---> PMM-011 \
          |                    +---> PMM-013
          +---------> PMM-012 /

Phase 4: PMM-014 ---> PMM-016
         PMM-015 (independent)

Phase 5: PMM-017 (independent)
         PMM-005,007,012,016,017 ---> PMM-018
         PMM-005,009,012 ----------> PMM-019
         All tasks ----------------> PMM-020
```

**Parallel Execution Opportunities:**
- Phase 1 (PMM-001..004), Phase 2 (PMM-005..009), Phase 3 (PMM-010..013), and Phase 4 (PMM-014..016) can begin in parallel.
- Task PMM-017 (Legacy Test Suite Remediation) is fully independent and can run concurrently alongside Phase 1–4 tasks.

---

## Risks & Mitigation Strategies

### High Risks

1. **App Store / Play Store Release Build Signing Rejection**
   - *Risk:* Incorrect certificate configurations, missing provisioning profiles, or missing privacy permission strings (`Info.plist`) cause automated store ingestion failures.
   - *Mitigation:* Conduct local pre-flight checks using `flutter build appbundle --release` and `flutter build ipa --release --no-codesign`; validate `Info.plist` strings against Apple Human Interface Guidelines (`PMM-001`, `PMM-002`).

2. **Push Notification Gateway Certificate Expiry & Connection Drops**
   - *Risk:* APNs P12 certificate or FCM service account credentials expire, halting all real-time push notification dispatches.
   - *Mitigation:* Implement environmental fallback logging in `PushNotificationService` (`PMM-006`) so missing/expired push credentials gracefully degrade to console warnings without crashing backend API endpoints; schedule annual certificate renewal reminders in ops docs.

3. **Background Execution OS Battery Restrictions**
   - *Risk:* iOS `BackgroundFetch` and Android Doze Mode throttle or defer background sync isolate execution when device battery is low.
   - *Mitigation:* Declare explicit background execution constraints (`requiresBatteryNotLow: true`, `NetworkType.connected`) in `BackgroundTaskManager` (`PMM-011`), and ensure the app executes immediate foreground catch-up sync whenever reopened.

### Medium Risks

1. **WCAG 2.1 AA Accessibility Scope Expansion**
   - *Risk:* Remediation across multiple complex executive analytics components discovers deep contrast or ARIA hierarchy issues requiring extensive component refactoring.
   - *Mitigation:* Focus remediation on core layout structures, navigation bars, and executive dashboard cards (`PMM-014`); leverage established Radix UI primitive accessibility defaults.

2. **Legacy Test Suite Schema Mismatches**
   - *Risk:* 9 legacy test suites contain outdated mock contracts or missing database table seeds that are complex to trace.
   - *Mitigation:* Use Sprint-014's `createTestDb()` in-memory factory and `mockNextRequest()` helper (`PMM-017`), standardizing seed initialization across all 9 suites.

3. **Push Notification User Permission Denial**
   - *Risk:* Users deny push notification permissions on mobile devices, preventing critical governance alert delivery.
   - *Mitigation:* Implement soft-prompt UI in Flutter (`PMM-008`) explaining the value of governance alerts before triggering native OS permission dialogs; provide in-app notification center fallback.

### Low Risks

1. **Release Build Binary Size Inflation**
   - *Risk:* Adding push notification and background fetch SDKs increases mobile binary size.
   - *Mitigation:* Apply ProGuard/R8 dead-code elimination and Flutter `--split-debug-info` compilation flags (`PMM-003`).

2. **Cross-Platform Push Formatting Differences**
   - *Risk:* FCM and APNs format notification payloads differently (data vs notification keys).
   - *Mitigation:* Abstract payload building inside `PushNotificationService` drivers (`PMM-006`), outputting normalized JSON payloads.

---

## Rollback Strategy & Contingency Plans

### Step-by-Step Rollback Procedures

1. **Web / API Rollback (Next.js):**
   - In the event of a critical API regression in push registration (`/api/mobile/push/register`) or background sync status (`/api/mobile/sync/background-status`), toggle runtime feature flags in `.env.production`:
     - Set `ENABLE_PUSH_NOTIFICATIONS=false`
     - Set `ENABLE_BACKGROUND_SYNC=false`
   - Revert git commit to `v2.6.0` release tag: `git checkout tags/v2.6.0` and redeploy web build.

2. **Mobile Companion Rollback (Flutter):**
   - If a background isolate sync or push notification crash occurs on deployed client devices:
     - Push an emergency hotfix build incrementing `pubspec.yaml` patch version (e.g. `2.7.1`).
     - Disable `background_sync_isolate` startup by setting `BackgroundTaskManager.enabled = false` via remote config payload.
     - Mobile companion automatically falls back to foreground-only sync and SSE real-time polling (Sprint-014 baseline behavior).

### Feature Degradation Paths

- **Push Notification Outage:** If FCM/APNs servers are unreachable, `sse-push-bridge.ts` catches gateway errors, logs telemetry, and relies on Sprint-012 SSE Event Bus for active web clients and periodic mobile foreground sync.
- **Background Isolate Suspension:** If OS battery saver suspends `WorkManager` / `BackgroundFetch`, offline mutations remain safely encrypted in local Hive boxes (`offline_sync_queue.dart`) until the user foregrounds the application, at which point standard foreground sync drains the queue.

---

## Definition of Done

Sprint-015 is officially considered **COMPLETE & READY FOR RELEASE CERTIFICATION** when all of the following criteria are met:

1. **Implementation Criteria:**
   - All 20 implementation tasks (PMM-001 through PMM-020) completed per specifications.
   - Android App Bundle (.aab) and iOS IPA release build configurations verified.
   - FCM/APNs push notification infrastructure operational with token management API and SSE event bridge.
   - Dart Background Isolate Sync Engine operational with WorkManager/BackgroundFetch platform channels.
   - Web authenticated shell and Flutter mobile screens pass WCAG 2.1 AA accessibility standards.
   - All 9 legacy test suites remediated and passing.

2. **Quality Gates & Build Criteria:**
   - **TypeScript Compilation:** 0 errors (`npx tsc --noEmit` clean).
   - **ESLint:** 0 errors, ≤ 5 warnings.
   - **Flutter Analysis:** 0 errors, 0 warnings (`flutter analyze` clean).
   - **Test Suite Pass Rate:** **150 / 150 test suites passing (100% pass rate)** with 0 failures and 0 skipped tests.
   - **Security Audit:** All 4 security invariants verified and passing in `sprint-015-security-audit.test.ts`.
   - **Accessibility Audit:** 0 WCAG 2.1 AA violations in `accessibility-wcag.test.ts`.

3. **Documentation & AIOS Artifact Criteria:**
   - Architecture Guide saved to `docs/mobile-packaging-push-accessibility-guide.md`.
   - `.ai/FEATURES.md` updated with Sprint-015 feature entries.
   - `.ai/CHANGELOG.md` updated with `v2.7.0` release notes.
   - `.ai/PROJECT_STATUS.md` updated to reflect `Product Version: 2.7.0`, `Sprint ID: PROD-PACKAGING-MOBILE-MATURITY-015`, and `Status: ✅ Completed & Released`.
   - Execution Log saved to `.ai/execution/Sprint-015-Execution-Log.md`.

---
