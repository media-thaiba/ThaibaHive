# ThaibaHive — App UI and Future Feedback Tracker

> **Document Status**: Active Living Roadmap  
> **Last Updated**: October 22, 2026  
> **Purpose**: Centralized log of test user feedback, UI/UX polish requests, and feature requests. Use this document to monitor progress, verify completed changes, and track pending items under the Feature Freeze & App Perfection Protocol.

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
| 10 | Status Auto-Clear Duration (30m, 1h, End of Day) | Presence | ⏳ **PENDING** | 2026-10-22 | — |
| 11 | Canteen: User default meal setting ("Eating" vs "Skip Meal") | Canteen | ⏳ **PENDING** | 2026-10-22 | — |
| 12 | Canteen: Skip meal for a specific period of time / recurring | Canteen | ⏳ **PENDING** | 2026-10-22 | — |
| 13 | Canteen: Auto-skip meals when user is on approved leave | Automation | ⏳ **PENDING** | 2026-10-22 | — |
| 14 | Android Passkey (WebAuthn / Credential Manager) integration | Mobile Auth | ⏳ **PENDING** | 2026-10-22 | — |

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
  * Backend `/api/auth/google` verifies ID tokens against `GOOGLE_CLIENT_IDS` (validating both Web and Android mobile client audiences) and provides friendly feedback if an email is not in the staff directory.
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

### 9. Move Search from Top Bar to Sidebar (Minimal, No `Ctrl + K`)
* **User Feedback**: *"Another thing is that the search my space option can be moved from the top bar to the side bar. No need to show the `Ctrl + K` in the search bar to make it minimal, just the option to search and simple text."*
* **Implementation**:
  * Moved the search button from the top navigation header (`src/components/layout/shell-nav.tsx`) into the desktop sidebar navigation rail (`src/components/layout/desktop-side-nav.tsx`).
  * Styled as a minimal search input button with a search icon and simple text `"Search my space..."` when expanded, and a compact centered search icon when collapsed.
  * Omitted the `Ctrl + K` keyboard badge for a clean aesthetic while keeping global `Ctrl + K` shortcut listeners active in `src/app/(shell)/layout.tsx`.

---

## ⏳ Pending / Future Feedback Items

### 10. Availability Auto-Clear Duration
* **User Feedback**: *"For the period reminder for the status, we can go the recommended option 'Auto-Clear Duration' that the status auto-expires, and when the user selects 'Busy', 'In Meeting', or 'In a Break', they can choose the time period, is it for 30 minutes, for 1 hour, or until the end of the day."*
* **Scope**:
  * When selecting a busy/meeting/away status in the profile menu or availability page, present quick duration presets:
    * ⏱️ 30 Minutes
    * ⏱️ 1 Hour
    * 🌅 Until End of Day (6:00 PM / midnight)
    * ♾️ Until I change it
  * Store expiration timestamp in presence record; automatically revert to "Active" when time elapses.
* **Target Status**: In architectural design.

### 11. Canteen: Default Meal Setting per User
* **User Feedback**: *"We need an option to keep the default setting for a user as 'Eating' or 'Skip Meal' because some staff regularly skip meals."*
* **Scope**:
  * Allow staff to configure permanent default meal preferences in `/my-work/settings` or `/my-work/canteen` (e.g. "Default Breakfast: Skip", "Default Lunch: Eating").
  * Pre-populates daily meal rosters without requiring manual daily clicks.
* **Target Status**: Pending challenge gate confirmation under Feature Freeze.

### 12. Canteen: Period / Recurring Meal Skips
* **User Feedback**: *"Also, we can give an option that 'Skip Meal' for a period of time or 'Skip Meal' regularly."*
* **Scope**:
  * Date range selector (e.g. from Oct 24 to Oct 28: Skip Lunch).
  * Recurring day-of-week rules (e.g. "Always skip dinner on Fridays").
* **Target Status**: Pending challenge gate confirmation under Feature Freeze.

### 13. Canteen & Leave Auto-Integration
* **User Feedback**: *"And also, when they are on leave, the 'Skip Meal' should automatically turn on."*
* **Scope**:
  * Event listener / trigger in `leaveApproval` action: When a leave request is marked `approved`, automatically mark all meals during that leave date window as `skip` in `canteenPreferences`.
  * Adjusts kitchen headcount calculations automatically.
* **Target Status**: Requires cross-module hook between Leave Management and Canteen.

### 14. Mobile (Android) Passkey Support
* **User Feedback**: *"Sign in with passkey is there in the web app, not in the android. How does it work ?"*
* **Technical Analysis**:
  * Web uses W3C WebAuthn API (`navigator.credentials.get()`).
  * Android requires Google Credential Manager API (`androidx.credentials.CredentialManager`).
  * Can be added to Flutter app using `local_auth` (local biometric check) or `passkeys_android` package paired with `/api/auth/webauthn/login/begin` and `/complete`.
* **Target Status**: Planned for next mobile sprint.
