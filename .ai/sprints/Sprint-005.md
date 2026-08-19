# Implementation Contract: Sprint-005 Mobile Companion App Integration

**Sprint ID:** SIS-PARENT-005 (MOB-ENG-005)  
**Sprint Name:** Mobile Companion App Integration  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-07-31  
**Target Execution:** 2026-08-03 to 2026-08-11  
**Estimated Duration:** 7–9 days (49–63 hours)  
**Risk Level:** Medium  
**Classification:** AIOS v3.0 Official Implementation Contract  

---

## Executive Summary

Sprint-005 delivers the **Mobile Companion App Integration**, fulfilling strategic priority #1 from `PROJECT_STATUS.md` ("Mobile-first deployment across 23+ campuses"). This sprint bridges the core ThaibaHive web platform (Finance, Examination, Attendance, and Parent Portal) with the cross-platform Flutter companion app (`thaibahive_mobile_app`) using secure WebView nonce authentication handoff, mobile finance approval cards, real-time push notifications, offline-first synchronization, and mobile examination hall ticket / report card access.

**Key Business Impact:**
- **Instant Mobile Approvals:** Reduces expense and leave approval cycle time by 80% with push notifications and single-tap mobile approval cards.
- **Cross-Campus Accessibility:** Enables 23+ campuses to operate seamlessly on mobile for staff check-ins, invigilator hall ticket QR scanning, and parent fee/result tracking.
- **Seamless Web-Mobile Handoff:** One-time single-sign-on (SSO) handoff via encrypted short-lived nonces, eliminating re-authentication friction when opening web views in Flutter.
- **Offline Operational Continuity:** Staff and students maintain access to schedules, student profiles, and draft tasks during internet disruptions through a local Hive cache and CRDT sync engine.

**Strategic Alignment:**
- Builds on **Sprint-001's API Client Pattern** (`src/lib/api/client.ts`) and authorization mechanics (`@thaiba/auth`).
- Connects directly to **Sprint-003's Multi-Stage Approval Engine** for mobile expense and voucher authorization.
- Integrates with **Sprint-004's Examination System** to support mobile QR verification of hall tickets and DOB-encrypted PDF report card viewing.
- Leverages mobile conventions outlined in `AGENTS.md` (Riverpod state management, GoRouter navigation, `FlutterSecureStorage` token storage, and `WebViewHandoffScreen`).

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation
The Sprint-005 specification is **technically sound, highly feasible, and architecturally aligned**. The foundation for mobile integration already exists in the codebase:
- Flutter app scaffold in `thaibahive_mobile_app/` with established feature module directories (`lib/features/approvals`, `lib/features/attendance`, `lib/features/auth`, `lib/features/dashboard`).
- Active backend authentication handoff API (`/api/auth/mobile-handoff/nonce`) and JWT token verification system (`src/lib/auth/`).
- Dual-dialect Drizzle ORM schema for SQLite dev and PostgreSQL prod handling real-time data sync.
- Pre-existing offline storage engine using Hive (`offline_data_cache.hive`).

### Technical Assessment & Risks Identified

1. **WebView Nonce Authentication Security & XSS Mitigation**
   - *Challenge:* Securely passing JWT authentication from Flutter native state to embedded WebViews without exposing credentials in query parameters or risking XSS injection.
   - *Mitigation:* Implement strict short-lived single-use nonces stored in Redis/memory with 60-second TTL. Nonces exchange for HTTP-only cookies in `WebViewHandoffScreen` before rendering restricted web content.

2. **Offline-First Synchronization & Conflict Resolution**
   - *Challenge:* Synchronizing offline attendance entries and draft approvals when network connectivity is re-established without data loss or duplicate records.
   - *Mitigation:* Implement an Outbox Queue in Flutter using Hive and dynamic Last-Write-Wins (LWW) / Conflict-Free Replicated Data Type (CRDT) merge strategy on `/api/mobile/v1/sync`.

3. **Push Notification Delivery & Fatigue Control**
   - *Challenge:* Timely delivery of approval requests and result publications via FCM/APNs while avoiding notification spam.
   - *Mitigation:* Establish priority channels for critical alerts (approvals, emergencies) and granular user notification preference toggles stored per mobile device.

4. **Mobile Payload Optimization & Bandwidth Reduction**
   - *Challenge:* Mobile devices operating on low-bandwidth 3G/4G campus networks requiring small payloads and minimal latency.
   - *Mitigation:* Implement dedicated lightweight serializers under `/api/mobile/v1/` returning minified JSON payloads with essential fields and HTTP response caching headers (`ETag`, `Cache-Control`).

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule**, this contract was submitted to **Qwen**, **OpenCode**, and **Claude Code** for peer review and optimization. The following enhancements were incorporated into the contract:

1. **WebView Nonce Security (OpenCode / Ollama):** Enforced server-side single-use nonce validation, strict 60-second expiration, HTTPS-only transport, CORS header restrictions, and XSS sanitization during WebView URL loading.
2. **Notification Preference Controls (OpenCode / Ollama):** Added task `MOB-009` explicit granular preference toggles (approvals, attendance, exams, announcements) to prevent notification fatigue and optimize battery usage on mobile devices.
3. **Attendance Real-Time Clock & Location Integrity (OpenCode / Ollama):** Integrated server-timestamp verification in `MOB-007` to prevent client clock manipulation during mobile check-in/out, with append-only audit trail logging for compliance.
4. **Offline Cache Encryption & Memory Management (OpenCode / Qwen):** Required AES-256 encryption on local Hive offline cache files using keys stored in `FlutterSecureStorage` and established cache size limits to prevent performance degradation on low-end devices.
5. **Mobile API Response Batching & Compression (Claude Code):** Added gzip compression, ETag caching headers, and paginated response wrappers for mobile sync routes in `MOB-003` to minimize network latency on campus mobile networks.
6. **QR Hall Ticket Verification Security (OpenCode):** Added cryptographic HMAC-SHA256 signature verification and graceful error handling for invalid or tampered QR codes during invigilator hall ticket scanning in `MOB-005`.

---

## Scope & Out of Scope

### In Scope

1. **Mobile Authentication & WebView Nonce Handoff:**
   - Handoff nonce endpoint `/api/auth/mobile-handoff/nonce` verification and client-side `WebViewHandoffScreen`.
   - Token persistence via `FlutterSecureStorage` under `AppConstants.storageTokenKey`.
   - Auto-refresh token interceptor for Flutter API HTTP client.

2. **Mobile Finance Approval Workflows:**
   - Riverpod providers and UI screens for pending approval cards in `lib/features/approvals/`.
   - Single-tap Approve / Reject dialogs with mandatory rejection reason modal.
   - Real-time status update badge sync with web platform.

3. **Mobile Examination Integration (Hall Ticket & Report Card):**
   - Invigilator camera QR scanner view for hall ticket verification.
   - Student/Parent mobile hall ticket display with fee lock status alert.
   - DOB-encrypted PDF report card viewer with local storage download options.

4. **Mobile Staff & Student Attendance Interface:**
   - Staff mobile check-in/out with server timestamp and geolocation verification.
   - Student attendance roster view with daily/monthly visual statistics.

5. **Real-time Sync Engine & Offline Outbox Queue:**
   - Offline storage manager using Hive (`offline_data_cache.hive`).
   - Sync queue manager processing pending offline actions upon network restoration.
   - Server-side conflict resolution endpoint (`/api/mobile/v1/sync`).

6. **Push Notification Service (FCM Integration):**
   - Mobile FCM device token registration API (`/api/mobile/v1/notifications/register`).
   - Deep-linking notification payload handler routing users to specific approval, exam, or message screens.
   - User notification preferences management screen.

7. **Parent Portal Mobile Shell (Student 360 View):**
   - Unified mobile dashboard aggregating student attendance, fee status, exam grades, and announcements.
   - Multi-child switcher for parents with multiple enrolled students.

8. **Automated Testing & Security Audit:**
   - Flutter unit and widget test suites for Riverpod providers and screens.
   - Mobile API security test suite verifying RBAC and tenant isolation.
   - Documentation update: `docs/mobile-companion-guide.md`, `.ai/FEATURES.md`, and `.ai/CHANGELOG.md`.

### Explicitly Out of Scope

- Direct native mobile app payment SDK integration (e.g., Apple Pay/Google Pay SDKs); fee payments route securely through the embedded web WebView payment portal.
- Native hardware optical mark recognition (OMR) camera scanner for exam evaluation.
- Full offline replication of multi-year historical archives; offline cache is limited to active term data.

---

## Risk Analysis & Mitigation Strategies

| Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **WebView Nonce Exposure / Replay Attack** | High | Low | Single-use nonces with 60-second TTL, bound to client IP/User-Agent, invalidated immediately upon exchange. |
| **Offline Sync Data Conflict / Duplication** | High | Medium | Implement Outbox Queue with UUID idempotency keys and LWW conflict resolution on server sync route. |
| **FCM Push Notification Delivery Failures** | Medium | Medium | Implement fallback polling in app foreground state and log delivery statuses in backend notification queue. |
| **Unencrypted Sensitive Data in Local Mobile Cache** | High | Low | Encrypt local Hive boxes using AES keys generated and saved inside `FlutterSecureStorage`. |
| **Device OS Compatibility Fragmentation (iOS/Android)** | Medium | Medium | Test against minimum target versions (Android 8.0+ / iOS 14.0+) using Flutter standard widgets and adaptive layouts. |

---

## Rollback Strategy

In the event of critical mobile operational issues or deployment failure:

1. **Backend Feature Flag Disable:** Set environment variable `NEXT_PUBLIC_MOBILE_APP_ENABLED=false`. Backend mobile APIs will respond with HTTP 503 `Service Unavailable` and clear error details.
2. **WebView Fallback Route:** If native mobile screens encounter errors, the Flutter app's `GoRouter` error boundary redirects users to the secure WebView fallback loading the web platform shell.
3. **Additive Backend Migrations:** Mobile-specific API endpoints and database fields (`fcm_tokens`, `device_registrations`) are strictly additive. Deactivating mobile routes does not impact core web operations.
4. **App Store Rollback / Remote Config:** Use remote configuration flag `min_supported_version` to force older stable app builds or display scheduled maintenance notices.

---

## Implementation Tasks

The sprint is structured into 12 sequential implementation tasks:

```
MOB-001 ──► MOB-002 ──► MOB-003 ──► MOB-004 ──► MOB-005 ──► MOB-006
                                     │           │
                                     ├──► MOB-007 ──► MOB-008
                                     │           │
                                     └──► MOB-009 ──► MOB-010 ──► MOB-011 ──► MOB-012
```

---

### Task MOB-001: Mobile Project Environment & Dependency Configuration

- **Task ID:** MOB-001
- **Description:** Audit, upgrade, and configure dependencies in `thaibahive_mobile_app/pubspec.yaml`. Ensure Flutter SDK 3.x compatibility, configure `flutter_riverpod`, `go_router`, `flutter_secure_storage`, `hive_flutter`, `cached_network_image`, `mobile_scanner`, and `firebase_messaging`.
- **Files:**
  - `[MODIFY] thaibahive_mobile_app/pubspec.yaml`
  - `[MODIFY] thaibahive_mobile_app/analysis_options.yaml`
  - `[NEW] thaibahive_mobile_app/lib/core/config/app_config.dart`
- **Dependencies:** None
- **Acceptance Criteria:**
  1. `pubspec.yaml` updated with all required dependencies with non-conflicting versions.
  2. `flutter pub get` completes cleanly without version solver errors.
  3. `app_config.dart` provides environment-specific configuration constants (API base URL, timeout limits, storage keys).
  4. Analysis options configured for zero strict lint warnings in Flutter code.
- **Verification Method:** Run `flutter pub get` and `flutter analyze` inside `thaibahive_mobile_app/`.
- **Estimated Complexity:** Low-Medium (0.5 days)

---

### Task MOB-002: WebView Nonce Authentication Handoff & Secure Token Storage

- **Task ID:** MOB-002
- **Description:** Implement backend single-use nonce generation and exchange endpoints, and integrate client-side Flutter token management via `FlutterSecureStorage` and `WebViewHandoffScreen`.
- **Files:**
  - `[MODIFY] src/app/api/auth/mobile-handoff/nonce/route.ts`
  - `[NEW] src/lib/auth/mobile-nonce-service.ts`
  - `[NEW] thaibahive_mobile_app/lib/features/auth/services/token_storage_service.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/auth/screens/web_view_handoff_screen.dart`
  - `[NEW] src/lib/auth/__tests__/mobile-nonce.test.ts`
- **Dependencies:** MOB-001
- **Acceptance Criteria:**
  1. `/api/auth/mobile-handoff/nonce` issues a cryptographically random single-use nonce with 60-second TTL bound to authenticated user session.
  2. Exchange route validates nonce, invalidates it immediately, and sets secure HTTP-only session cookie for WebViews.
  3. `TokenStorageService` securely reads/writes JWT tokens using `FlutterSecureStorage` under `AppConstants.storageTokenKey`.
  4. `WebViewHandoffScreen` seamlessly executes nonce exchange before loading target web URL in WebView without prompting for password.
- **Verification Method:** Run `pnpm test src/lib/auth/__tests__/mobile-nonce.test.ts` and test Flutter web view handoff flow.
- **Estimated Complexity:** Medium (1 day)

---

### Task MOB-003: Mobile Lightweight API Serializers & REST Endpoints

- **Task ID:** MOB-003
- **Description:** Create dedicated backend REST API endpoints under `/api/mobile/v1/` optimized for low-bandwidth mobile devices, returning slim payload JSON representations for dashboard metrics, profile data, and notifications.
- **Files:**
  - `[NEW] src/app/api/mobile/v1/dashboard/route.ts`
  - `[NEW] src/app/api/mobile/v1/profile/route.ts`
  - `[NEW] src/lib/mobile/mobile-serializer.ts`
  - `[NEW] src/app/api/mobile/__tests__/mobile-api.test.ts`
- **Dependencies:** MOB-001
- **Acceptance Criteria:**
  1. `GET /api/mobile/v1/dashboard` returns minified JSON response (< 5KB payload) summarizing pending approvals, upcoming exams, and recent announcements.
  2. Response includes `ETag` headers for caching and supports gzip compression.
  3. All endpoints wrapped in `requireAuth` checking appropriate permission scopes.
  4. Unit tests confirm response structure and execution time under 100ms.
- **Verification Method:** Run `pnpm test src/app/api/mobile/__tests__/mobile-api.test.ts`.
- **Estimated Complexity:** Medium (1 day)

---

### Task MOB-004: Mobile Finance Approval Workflows & Action Cards

- **Task ID:** MOB-004
- **Description:** Implement Flutter UI screens and Riverpod state management for viewing and approving multi-stage finance vouchers, expense requests, and budget allocations on mobile.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/features/approvals/providers/approval_provider.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/approvals/screens/approval_list_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/approvals/widgets/approval_card.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/approvals/widgets/rejection_dialog.dart`
- **Dependencies:** MOB-002, MOB-003
- **Acceptance Criteria:**
  1. Renders list of pending financial approval vouchers with pull-to-refresh capability.
  2. Displays voucher details (amount, category, requester, attachments preview, approval chain steps).
  3. Provides one-tap "Approve" action with confirmation snackbar, and "Reject" action requiring a reason note.
  4. Connects to Sprint-003 backend approval engine (`/api/finance/approvals`), updating status in real-time.
- **Verification Method:** Execute Flutter unit tests for `approval_provider.dart` and perform manual screen verification.
- **Estimated Complexity:** Medium-High (1.5 days)

---

### Task MOB-005: Examination Hall Ticket Mobile Viewer & Invigilator QR Scanner

- **Task ID:** MOB-005
- **Description:** Build mobile screens for students to view digital examination hall tickets and for invigilators to scan/verify hall ticket QR codes using the device camera.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/features/examinations/screens/hall_ticket_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/examinations/screens/qr_scanner_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/examinations/providers/hall_ticket_provider.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/examinations/widgets/verification_result_modal.dart`
- **Dependencies:** MOB-002, MOB-003
- **Acceptance Criteria:**
  1. Student view renders hall ticket timetable, seat allocation, and QR code, displaying fee-lock warning banner if fees are pending.
  2. Invigilator `QrScannerScreen` accesses device camera via `mobile_scanner` and scans hall ticket QR code.
  3. Verification result modal calls `/api/examinations/hall-tickets/verify` and displays instant green (Cleared) or red (Blocked) verification status.
  4. Works in offline mode using pre-synced hall ticket verification keys.
- **Verification Method:** Test camera scanner on mobile device/emulator with sample hall ticket QR codes.
- **Estimated Complexity:** Medium-High (1.5 days)

---

### Task MOB-006: Student & Parent Mobile Report Card & Transcript Viewer

- **Task ID:** MOB-006
- **Description:** Develop the mobile report card viewer screen allowing students and parents to view published exam results, GPA breakdowns, and stream/download encrypted PDF report cards.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/features/examinations/screens/report_card_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/examinations/widgets/grade_summary_card.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/examinations/services/pdf_viewer_service.dart`
- **Dependencies:** MOB-003, MOB-005
- **Acceptance Criteria:**
  1. Displays term subject marks, letter grades, credit points, and overall SGPA/CGPA.
  2. Provides "Download PDF Report Card" button fetching encrypted PDF from Sprint-004 backend (`/api/examinations/report-cards`).
  3. Prompts for password (DOB `DDMMYYYY`) if PDF encryption is enabled.
  4. Integrates in-app PDF preview rendering cleanly across iOS and Android.
- **Verification Method:** Run Flutter widget tests for `report_card_screen.dart` and inspect PDF download.
- **Estimated Complexity:** Medium (1 day)

---

### Task MOB-007: Mobile Staff Attendance Check-in/Out & Student Roster View

- **Task ID:** MOB-007
- **Description:** Build staff mobile attendance check-in/out screen with timestamp verification and student attendance roster view for teachers.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/features/attendance/screens/staff_checkin_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/attendance/screens/student_roster_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/attendance/providers/attendance_provider.dart`
- **Dependencies:** MOB-002, MOB-003
- **Acceptance Criteria:**
  1. `StaffCheckinScreen` displays current server time, check-in/out button, and daily working hours summary.
  2. Captures geolocation coordinates (if enabled) and sends payload to `/api/attendance/check-in`.
  3. `StudentRosterScreen` allows teachers to mark student present/absent/late with simple toggle buttons.
  4. Supports offline caching for attendance submissions during low connectivity.
- **Verification Method:** Run unit tests for `attendance_provider.dart` and perform UI verification.
- **Estimated Complexity:** Medium (1 day)

---

### Task MOB-008: Real-time Sync Engine & Offline Outbox Queue

- **Task ID:** MOB-008
- **Description:** Create the Flutter offline data synchronization engine using Hive local storage and build backend endpoint `/api/mobile/v1/sync` for conflict-free data reconciliation.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/core/sync/offline_sync_engine.dart`
  - `[NEW] thaibahive_mobile_app/lib/core/sync/outbox_queue_manager.dart`
  - `[NEW] src/app/api/mobile/v1/sync/route.ts`
  - `[NEW] src/lib/mobile/__tests__/mobile-sync.test.ts`
- **Dependencies:** MOB-004, MOB-007
- **Acceptance Criteria:**
  1. Offline mutations (attendance entries, approval notes) stored locally in encrypted Hive box with UUID task IDs.
  2. `OfflineSyncEngine` listens to connectivity changes; automatically flushes Outbox Queue when network is restored.
  3. `/api/mobile/v1/sync` applies Last-Write-Wins (LWW) conflict resolution algorithm and returns updated state tokens.
  4. Backend sync unit test verifies zero duplicate entries and successful recovery after simulated network disconnect.
- **Verification Method:** Run `pnpm test src/lib/mobile/__tests__/mobile-sync.test.ts` and test offline queue flush in Flutter.
- **Estimated Complexity:** High (1.5 days)

---

### Task MOB-009: Push Notification Service & User Preference Controls

- **Task ID:** MOB-009
- **Description:** Integrate Firebase Cloud Messaging (FCM) / APNs in Flutter, implement device registration backend endpoints, deep-link payload routing, and user notification settings UI.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/core/notifications/push_notification_service.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/settings/screens/notification_preferences_screen.dart`
  - `[NEW] src/app/api/mobile/v1/notifications/register/route.ts`
  - `[NEW] src/app/api/mobile/v1/notifications/preferences/route.ts`
- **Dependencies:** MOB-001, MOB-002
- **Acceptance Criteria:**
  1. `PushNotificationService` registers device FCM token with `/api/mobile/v1/notifications/register`.
  2. Tapping a notification deep-links to the target screen (e.g., approval details screen or report card view) using `GoRouter`.
  3. `NotificationPreferencesScreen` allows users to toggle alert channels (Approvals, Attendance, Examinations, Circulars).
  4. Preferences persist to backend database and strictly control push notification dispatch.
- **Verification Method:** Test FCM payload dispatch via postman/script and verify deep-link navigation in Flutter.
- **Estimated Complexity:** Medium (1 day)

---

### Task MOB-010: Parent Portal Mobile Shell & Student 360 Summary

- **Task ID:** MOB-010
- **Description:** Build the dedicated Parent Portal mobile dashboard screen providing a consolidated 360-degree view of student attendance, fee dues, exam results, and school announcements.
- **Files:**
  - `[NEW] thaibahive_mobile_app/lib/features/parent_portal/screens/parent_dashboard_screen.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/parent_portal/widgets/student_summary_card.dart`
  - `[NEW] thaibahive_mobile_app/lib/features/parent_portal/widgets/multi_child_selector.dart`
  - `[NEW] src/app/api/mobile/v1/parent/student-360/route.ts`
- **Dependencies:** MOB-003, MOB-006, MOB-007
- **Acceptance Criteria:**
  1. `ParentDashboardScreen` renders active student overview (Attendance %, Pending Fee Balance, Latest Exam GPA, Recent Announcements).
  2. `MultiChildSelector` allows parents with multiple enrolled children to switch active student view dynamically.
  3. "Pay Fees" button opens embedded payment WebView using secure nonce handoff (`WebViewHandoffScreen`).
  4. Displays urgent alerts (e.g., low attendance warnings, pending fee deadlines) in prominent status banners.
- **Verification Method:** Run Flutter widget tests for `parent_dashboard_screen.dart` and verify multi-child switching.
- **Estimated Complexity:** Medium (1 day)

---

### Task MOB-011: Mobile Security Audit & API RBAC Test Suite

- **Task ID:** MOB-011
- **Description:** Perform thorough security validation of mobile API endpoints, checking JWT signature enforcement, RBAC permissions, cross-tenant isolation, and encrypted local storage.
- **Files:**
  - `[NEW] src/app/api/mobile/__tests__/mobile-security.test.ts`
  - `[NEW] thaibahive_mobile_app/test/security/secure_storage_test.dart`
- **Dependencies:** MOB-002, MOB-003, MOB-008
- **Acceptance Criteria:**
  1. Mobile API endpoints reject requests without authentic JWT or with expired tokens (HTTP 401).
  2. Staff attempting to access principal approval routes receive HTTP 403 Forbidden.
  3. Multi-tenant database queries enforce `institutionId` parameter check; cross-tenant access returns 0 records.
  4. Unit test confirms Flutter `FlutterSecureStorage` and Hive encryption keys are non-predictable and secure.
- **Verification Method:** Run `pnpm test src/app/api/mobile/__tests__/mobile-security.test.ts` and `flutter test test/security/secure_storage_test.dart`.
- **Estimated Complexity:** Medium (1 day)

---

### Task MOB-012: Automated Integration Tests, User Documentation & AIOS Registry Synchronization

- **Task ID:** MOB-012
- **Description:** Run full automated Flutter test suites, author comprehensive mobile user and technical documentation, and update AIOS project tracking registries.
- **Files:**
  - `[NEW] thaibahive_mobile_app/test/widget_test.dart`
  - `[NEW] docs/mobile-companion-guide.md`
  - `[MODIFY] .ai/FEATURES.md`
  - `[MODIFY] .ai/CHANGELOG.md`
- **Dependencies:** MOB-001 through MOB-011
- **Acceptance Criteria:**
  1. Flutter automated test suite (`flutter test`) passes with > 80% coverage on mobile feature modules.
  2. `docs/mobile-companion-guide.md` created detailing mobile app setup, nonce handoff flow, FCM setup, and offline sync architecture.
  3. `.ai/FEATURES.md` updated marking Mobile Companion App Integration as active/complete.
  4. `.ai/CHANGELOG.md` updated with release notes for v1.7.0.
- **Verification Method:** Run `flutter test` inside `thaibahive_mobile_app/` and verify clean doc formatting.
- **Estimated Complexity:** Medium (1 day)

---

## Detailed Specifications

### API Changes

#### 1. Endpoint: `POST /api/auth/mobile-handoff/nonce`
- **Description:** Issue a short-lived single-use nonce for authenticating WebViews from Flutter native app.
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Request Body:**
  ```json
  {
    "targetUrl": "/finance/approvals/v-10293",
    "deviceId": "flutter_device_uuid_88492"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "nonce": "mhn_9a8b7c6d5e4f3a2b1c0d",
    "expiresAt": "2026-08-03T10:01:00.000Z",
    "redirectUrl": "/auth/mobile-handoff/exchange?nonce=mhn_9a8b7c6d5e4f3a2b1c0d"
  }
  ```

#### 2. Endpoint: `GET /api/mobile/v1/dashboard`
- **Description:** Fetch lightweight mobile dashboard overview for authenticated user.
- **Headers:** `Authorization: Bearer <jwt_token>`
- **Response (200 OK):**
  ```json
  {
    "user": {
      "id": "usr_9912",
      "name": "Sarah Ahmed",
      "role": "principal",
      "institutionId": "inst_001"
    },
    "pendingApprovalsCount": 4,
    "upcomingExamsCount": 2,
    "unreadNotificationsCount": 1,
    "quickActions": ["finance_approvals", "attendance_checkin", "qr_verifier"]
  }
  ```

#### 3. Endpoint: `POST /api/mobile/v1/sync`
- **Description:** Sync batch offline mutation queue from mobile client to backend database.
- **Request Body:**
  ```json
  {
    "lastSyncedAt": "2026-08-03T08:00:00.000Z",
    "mutations": [
      {
        "id": "mut_001",
        "action": "STAFF_CHECKIN",
        "timestamp": "2026-08-03T08:30:00.000Z",
        "payload": { "location": "Main Gate", "latitude": 11.25, "longitude": 75.78 }
      }
    ]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "processedMutations": ["mut_001"],
    "failedMutations": [],
    "syncedAt": "2026-08-03T08:30:05.000Z"
  }
  ```

---

## Definition of Done (DoD)

Sprint-005 will be officially declared **100% COMPLETE** when all of the following conditions are met:

1. **Task Execution:**
   - All 12 tasks (MOB-001 through MOB-012) are fully implemented and integrated across backend and Flutter mobile codebase.
   - Mobile code strictly adheres to Flutter/Riverpod guidelines in `AGENTS.md` and AIOS coding standards.

2. **Build & Type Safety:**
   - `pnpm build` (Next.js web platform) completes with **0 errors**.
   - `pnpm typecheck` passes with **0 errors**.
   - `flutter analyze` inside `thaibahive_mobile_app/` passes with **0 errors and 0 strict warnings**.

3. **Test Suite Verification:**
   - Next.js backend mobile unit and security test suites (`mobile-api.test.ts`, `mobile-nonce.test.ts`, `mobile-sync.test.ts`, `mobile-security.test.ts`) pass with **100% success rate**.
   - Flutter unit and widget tests (`flutter test`) achieve > 80% coverage across mobile features.

4. **Security & Offline Sync Verification:**
   - WebView nonce handoff 100% verified (nonces single-use, 60s TTL, HTTPS-only).
   - Offline Outbox Queue and LWW conflict resolution verified during network disconnect/reconnect tests.
   - Encrypted local Hive storage verified using AES keys inside `FlutterSecureStorage`.

5. **Documentation & Handoff:**
   - Execution log recorded at `.ai/execution/Sprint-005-Execution-Log.md`.
   - `.ai/FEATURES.md` updated to mark Mobile Companion App Integration complete.
   - `.ai/CHANGELOG.md` updated with release notes for v1.7.0.
   - User guide created at `docs/mobile-companion-guide.md`.
   - Verification Engineer (Opencoder) issues passing Release Certificate.

---

### Sprint Team

**Product Engineering Manager:** Devin (AIOS)  
**Implementation Engineer:** Antigravity  
**Verification Engineer:** Opencoder  
**Architecture Lead:** AIOS Architecture Council  
**Security Auditor:** Antigravity Security  

---

*Contract Approved: 2026-07-31*  
*Classification: AIOS v3.0 Official Implementation Contract*  
*Target Release Version: v1.7.0*  
