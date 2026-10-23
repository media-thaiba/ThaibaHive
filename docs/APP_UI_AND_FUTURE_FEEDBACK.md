# ThaibaHive — App UI and Future Feedback Tracker

> **Document Status**: Active Living Roadmap  
> **Last Updated**: October 22, 2026  
> **Purpose**: Centralized log of test user feedback, UI/UX polish requests, and feature requests. Use this document to monitor progress, verify completed changes, and track pending items.

---

## 📊 Summary Status Board

| # | Item Description | Category | Status | Date Logged | Date Resolved |
|---|------------------|----------|--------|-------------|---------------|
| 1 | Top-aligned sidebar across desktop viewports | UI / Layout | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 2 | Rename "Grievances" to "Complaints" across UI & routes | Terminology | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 3 | Availability page UX: clarify "Your Status" input vs. filters | UI / UX | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 4 | Academic Dashboard: add Institution Selector to filter stats | Academic | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 5 | Sign In with Google: configure Web & Android Client IDs | Authentication | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 6 | Public Privacy Policy (`/privacy`) and Terms (`/terms`) | Compliance | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 7 | Vercel production deployment memory & ignore fixes | DevOps / Build | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 8 | Quick availability status switcher in profile dropdown | UI / UX | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 9 | Move Search bar from top bar to sidebar (remove `Ctrl + K`) | UI / Layout | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 10 | Status Auto-Clear Duration (30m, 1h, End of Day) | Presence | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 11 | Canteen: User default meal setting ("Eating" vs "Skip Meal") | Canteen | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 12 | Canteen: Skip meal for a specific period of time / recurring | Canteen | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 13 | Canteen: Auto-skip meals when user is on approved leave | Automation | ✅ **DONE** | 2026-10-22 | 2026-10-22 |
| 14 | Android Passkey (WebAuthn / Credential Manager) integration | Mobile Auth | ✅ **DONE** | 2026-10-22 | 2026-10-22 |

---

## ✅ Completed Changes (Detailed Log)

### 1. Top-Aligned Sidebar
* **User Feedback**: *"The sidebar needs to align to top in all windows and screens. Presently it's aligned to the center."*
* **Implementation**: In `src/components/layout/desktop-side-nav.tsx`, removed `top-1/2` and `-translate-y-1/2` and anchored to `top-20` for clean vertical alignment on all laptop and desktop monitors.

### 2. Complaints Route & Terminology Migration
* **User Feedback**: *"Can we change grievances to complaints?"*
* **Implementation**:
  * Established canonical route at `/my-work/complaints` (`src/app/(shell)/my-work/complaints/page.tsx`).
  * Updated navigation link in `src/config/navigation.ts` to `/my-work/complaints` with label "Complaints".
  * Added 308 legacy redirect from `/my-work/grievances` &rarr; `/my-work/complaints` in `src/lib/navigation/legacy-redirects.ts` and fallback page redirect.
  * Updated user-facing headers, buttons, cards, and modal dialogs to "Complaints". Backend database tables and internal stores (`useGrievanceStore`) remain intact for seamless data compatibility.

### 3. Availability Page Clarity
* **User Feedback**: *"In the availability page there is option to filter Active Busy in a meeting & Away, but where is the option for the user to give that input?"*
* **Implementation**:
  * Added a distinct **"My Availability"** card header with live presence indicator and explicit "Update" button.
  * Added dedicated colleague filter chips (*All*, *Active*, *Busy*, *In Meeting*, *Away*) next to the directory search bar so filtering colleagues is intuitive and separate from personal status.

### 4. Academic Dashboard Institution Filter
* **User Feedback**: *"Need to add option to select the institution in the Academic Dashboard. We can show the total number of Students, classes and active academic years according to it only."*
* **Implementation**: Added an **Institution Selector** dropdown in `src/app/(shell)/school/page.tsx`. Dynamically passes `?institutionId=...` to `/api/academic/students`, `/api/academic/classes`, and `/api/academic/academic-years`, calculating counts specifically for the selected campus.

### 5. Google Sign-In Configured (Web + Mobile Backend)
* **User Feedback**: *"Why is Google Sign in is not configured for this build?"*
* **Implementation**:
  * Configured Google Client IDs in `.env` (Web and Android IDs stored as environment variables).
  * Web login form uses `NEXT_PUBLIC_GOOGLE_CLIENT_IDS` with Google Identity Services (GIS) and embeds the official Google Sign-In button.
  * Backend `/api/auth/google` verifies ID tokens against both `GOOGLE_CLIENT_IDS` and `NEXT_PUBLIC_GOOGLE_CLIENT_IDS` (deduplicating and validating both Web and Android mobile client audiences) and provides friendly feedback if an email is not in the staff directory.
  * Native Android mobile app uses the Android Client ID via Google Play Services and sends tokens to the same backend endpoint.

### 6. Public Privacy Policy & Terms of Service
* **User Feedback**: *"We have not made a privacy policy. Also, the link https://thaiba-hive.vercel.app/privacy is showing 404 page not found."*
* **Implementation**:
  * Built [`/privacy`](src/app/privacy/page.tsx) with Google API User Data Policy compliance and data retention terms.
  * Built [`/terms`](src/app/terms/page.tsx) with institutional user agreement and acceptable campus use policies.
  * Both deployed live on production Vercel domain.

### 7. Vercel Build Optimization & Memory Protection
* **Issue**: Vercel free tier build container failed with Out of Memory (OOM) error.
* **Implementation**:
  * Added `webpackBuildWorker: true` and `webpackMemoryOptimizations: true` to `next.config.ts`.
  * Set `NODE_OPTIONS="--max-old-space-size=6144"` in `package.json` to trigger V8 GC before container limits.
  * Anchored root report/test folders in `.vercelignore` (`/reports/`) so Vercel does not exclude `src/components/reports/`.

### 8. 1-Click Status Switcher in Profile Menu
* **User Feedback**: *"Can we add that option in the dashboard itself so that users can easily change their status if needed, rather than going to the availability page?"*
* **Implementation**: In `src/components/layout/user-avatar-dropdown.tsx`, embedded a quick availability status switcher (Active, Busy, In Meeting, Away) with dynamic presence dot coloring on the user's avatar. Available from every page in the application.

### 9. Android Passkey (WebAuthn / Credential Manager)
* **User Feedback**: *"Sign in with passkey is there in the web app, not in the android. How does it work ?"*
* **Implementation**:
  * **Backend**: Hardened [`src/app/api/auth/webauthn/login/complete/route.ts`](src/app/api/auth/webauthn/login/complete/route.ts) to return session `token` in body for mobile clients presenting `x-client-platform: mobile` header, matching the Google auth route pattern (`F-12`). Existing `/api/auth/webauthn/login/begin` already supports email-based challenge issuance for passkey login.
  * **Flutter Mobile**: Added `passkeys_android: ^1.1.1` dependency to `pubspec.yaml`.
  * **`lib/core/services/passkey_service.dart`**: New `PasskeyService` wrapping `passkeys_android` (Google Credential Manager API). Exposes `isAvailable()`, `isRegistered()`, `getKey()` (login assertion), `createKey()` (registration attestation), and local registration state persistence via `FlutterSecureStorage`.
  * **`lib/features/auth/data/auth_repository.dart`**: Added `loginWithPasskey(email)` (begin → device assertion → complete → session token), `registerPasskeyBegin()`, and `registerPasskeyComplete(attestation)` methods, all sending `X-Client-Platform: mobile` header.
  * **`lib/features/auth/data/auth_state.dart`**: Added `loginWithPasskey(email)` to `AuthNotifier` with standard loading/error/authenticated state transitions and FCM re-registration on success.
  * **`lib/features/auth/presentation/login_screen.dart`**: Added `AuthMode.passkey`, "Sign In with Passkey" button on the sign-in form, and a dedicated passkey login form with email input and passkey authenticate button.
  * **`lib/features/auth/presentation/passkey_enrollment_screen.dart`**: New screen for authenticated users to register a device passkey (challenge → device creation → server attestation → local mark registered).
  * **`lib/app/router.dart`**: Added `/auth/passkey/enroll` route (`passkeyEnroll`).
* **Scope Note**: Web uses W3C WebAuthn API (`navigator.credentials.get()`); Android uses Google Credential Manager API via `passkeys_android` package, paired with `/api/auth/webauthn/login/begin` and `/complete`. The Android Client ID from Item 5 is reserved for Google Play Services in the Flutter build — web GIS strictly uses the Web Client ID.

### 9. Move Search from Top Bar to Sidebar (Minimal, No `Ctrl + K`)
* **User Feedback**: *"Another thing is that the search my space option can be moved from the top bar to the side bar. No need to show the `Ctrl + K` in the search bar to make it minimal, just the option to search and simple text."*
* **Implementation**:
  * Moved the search button from the top navigation header (`src/components/layout/shell-nav.tsx`) into the desktop sidebar navigation rail (`src/components/layout/desktop-side-nav.tsx`).
  * Styled as a minimal search input button with a search icon and simple text `"Search my space..."` when expanded, and a compact centered search icon when collapsed.
  * Omitted the `Ctrl + K` keyboard badge for a clean aesthetic while keeping global `Ctrl + K` shortcut listeners active in `src/app/(shell)/layout.tsx`.

### 10. Availability Auto-Clear Duration
* **User Feedback**: *"For the period reminder for the status, we can go the recommended option 'Auto-Clear Duration' that the status auto-expires, and when the user selects 'Busy', 'In Meeting', or 'In a Break', they can choose the time period, is it for 30 minutes, for 1 hour, or until the end of the day."*
* **Implementation**:
  * Added `expiresAt` column to `presence` and `staffAvailability` tables across SQLite and PostgreSQL schemas.
  * Updated `POST /api/presence/status` and `PUT /api/availability` to accept duration presets (`30`, `60`, `"eod"` for End of Day / 6:00 PM) and calculate ISO expiration timestamps.
  * Added automatic expiration detection in `GET /api/presence` and `GET /api/availability`: when `expiresAt` is in the past, status automatically resolves to `active` / `available`.
  * In `src/components/layout/user-avatar-dropdown.tsx`, added duration selector buttons (30m, 1h, EOD, Never) with active timer display.
  * In `src/app/(shell)/my-work/availability/page.tsx`, added duration option buttons and expiry badges in the "My Availability" card.

### 11. Canteen: Default Meal Setting per User
* **User Feedback**: *"We need an option to keep the default setting for a user as 'Eating' or 'Skip Meal' because some staff regularly skip meals. So, rather than updating or selecting the 'Skip Meal' every day in the app, they can set the default to 'Skip Meal'."*
* **Implementation**:
  * Created `staffMealPreferences` table storing `defaultBreakfast`, `defaultLunch`, and `defaultDinner` ("eating" or "skip").
  * Built `GET /api/canteen/preferences` and `PUT /api/canteen/preferences` endpoints with Zod schema validation.
  * In `src/app/(shell)/my-work/canteen/page.tsx`, added a "Meal Preferences & Schedule" dialog where staff can set their default daily choice for each meal without needing to manually toggle "Skip" every day.

### 12. Canteen: Period & Recurring Meal Skips
* **User Feedback**: *"Also, we can give an option that 'Skip Meal' for a period of time or 'Skip Meal' regularly."*
* **Implementation**:
  * Added `skipStartDate`, `skipEndDate`, and `recurringSkipDays` (day indexes 0=Sun..6=Sat) to `staffMealPreferences`.
  * In `src/app/(shell)/my-work/canteen/page.tsx`, staff can pick a date window (e.g., Nov 1 to Nov 5) or select days of the week (e.g. Every Friday).
  * The daily meal view evaluates precedence: explicit manual daily choice &gt; scheduled period skip &gt; recurring day skip &gt; user default meal preference.
  * Shows context badges in the UI: "Scheduled Period Skip", "Regular Weekly Skip", or "Default: Skip Meal".

### 13. Canteen & Leave Auto-Integration
* **User Feedback**: *"And also, when they are on leave, the 'Skip Meal' should automatically turn on."*
* **Implementation**:
  * Created `src/lib/canteen/leave-integration.ts` with `autoSkipMealsForLeave` and `revertAutoSkippedMealsForLeave`.
  * Integrated directly into the approval transaction in `src/app/api/leaves/[id]/route.ts` and `src/app/api/approvals/route.ts`: when leave is approved, all 3 daily meals for every day of the approved leave are automatically created/updated with `status: "skip"` and `notes: "Auto-skipped: On Approved Leave"`.
  * If the leave request is deleted, auto-skipped meals for that period are cleaned up automatically.
  * Unit tested with 100% pass rate in `src/app/api/canteen/__tests__/canteen-feedback-features.test.ts`.

### 14. Mobile (Android) Passkey Support & OTA Release
* **User Feedback**: *"Sign in with passkey is there in the web app, not in the android. How does it work ?"*
* **Implementation**:
  * **Backend**: Hardened `src/app/api/auth/webauthn/login/complete/route.ts` to return session token in response body for mobile clients presenting `X-Client-Platform: mobile`.
  * **Android Native (Google Credential Manager)**: Integrated `passkeys_android` with `PasskeyService` (`lib/core/services/passkey_service.dart`) supporting biometric passkey authentication and device enrollment via Google Password Manager.
  * **Mobile UI**: Added "Sign In with Passkey" in `login_screen.dart` and dedicated enrollment screen at `/auth/passkey/enroll`.
  * **In-App (OTA) Update Integration**: Mounted `UpdateBanner` in `_DynamicBottomNavShell` (`lib/app/router.dart`), mirroring MediaHive's in-app updater.
  * **Production Release**: Universal Release APK `v3.42.1+16` built with `minSdk = 28`, published as GitHub Release asset, and wired to `/api/system/update`.

---

## ⏳ Pending / Future Feedback Items

*All 14 test user feedback and polish items are currently complete and verified.*
