# ThaibaHive Session Memory

This file captures temporary workspace statuses, daily investigations, known runtime bugs, and intermediate session workarounds.

## Active Status (2026-07-19)
- Currently deploying the **AIOS 1.0.0** (AI Context System) to the repository root.
- Clean compilation checked. No current typescript errors.
- SQLite dev database (`dev.db`) is locally initialized and seeded.

## Investigations & Experiments
- **Android Widget Dependency Alignment**: Native gradle dependencies in `thaibahive_mobile_app/android/app/build.gradle.kts` were aligned to prevent Kotlin target version clashes.
- **WebView Nonce Auth Handoff**: Tested Flutter Secure Storage handoff of JWT via `/auth/mobile-handoff/nonce` token exchange endpoint. 

## Active Workarounds
- **SQLite Date Formatting**: Because SQLite does not have a native date class, we store all timestamps as ISO 8601 strings and parse them on retrieval using `date-fns` to match target expectations.
- **Client Side Alert Handling**: Local notification options are mapped directly to `localStorage` options within `/settings` to keep the DB free of minor UI states.
