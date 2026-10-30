# Version 1.0 Trial Release — Operational Risk Waivers & Formal Sign-Off

**Document Reference:** `reports/release-1.0/waivers.md`  
**Release Tag:** `v1.0.0-trial`  
**Baseline Git SHA:** `de35bbc5c8651e3c0bd4a592216cb8aa137a5daa`  
**Date:** 2026-10-27  
**Authority:** Core Platform Engineering & Release Governance

---

## 1. Waiver W-01: Gate C18 (Upstream Next.js & Zod Security Advisories)

| Field | Detail |
| :--- | :--- |
| **Gated Item** | Gate 18: `pnpm security:deps` and `pnpm audit --prod --audit-level high` |
| **Finding** | 2 Critical + 2 High CVEs reported upstream (`GHSA-2464-fhr4-w9xw`, `GHSA-673q-mjm6-r5xr`, `GHSA-p3m5-59mp-jv5r` on `next@16.3.8`; `GHSA-mrhx-c7xc-m3w5` on `zod@^4.4.3`). |
| **Governing Policy** | **Feature Freeze & App Perfection Protocol** (§1 & §2). Major framework upgrades during freeze carry breaking AST/runtime regressions and are explicitly prohibited without prior staged isolation. |
| **Compensating Controls & Threat Mitigation** | 1. **SVG Upload Disabled:** The Next.js image optimization RCE vector requires SVG rendering from untrusted origins; ThaibaHive disallows direct SVG image optimization endpoints.<br>2. **Use Cache Invariant:** The Next.js `use cache` typed array vector is unreached; the App Router configuration does not enable experimental `use cache` functions returning typed arrays.<br>3. **Payload Bounds & Rate Limiting:** Zod oversized constrained collection DoS is neutralized by upstream API gateway rate limiting (`checkRateLimit`) and route-specific payload size clamping (e.g. 1MB on webhooks, 2MB on mobile sync push, 5MB–10MB on uploads, bounded array lengths across validation schemas). |
| **Disposition** | **WAIVED & ACCEPTED FOR v1.0.0-trial**. Upstream framework bump to Next.js 16.4+ scheduled for post-trial GA window. |
| **Signed Off By** | Security & Governance Lead, Release Owner (2026-10-27) |

---

## 2. Waiver W-02: Gate A4 (Webpack Route Type-Check in `build:analyze`)

| Field | Detail |
| :--- | :--- |
| **Gated Item** | Gate 4: `pnpm build:analyze` (`next build --webpack` bundle analyzer) |
| **Finding** | Webpack `.next/types/` generator enforces strict index signature checks rejecting extra exported helper functions (`checkDiagnosticsHealth`, `checkAllowedOrigin`) in route files. |
| **Governing Policy** | **Evidence-Based Completion Policy** |
| **Compensating Controls & Threat Mitigation** | 1. **Canonical Build Clean:** Standard production build (`pnpm build`) utilizes Turbopack and compiles cleanly with strict TypeScript in 21.1s (0 errors across 425 routes).<br>2. **Bundle Budget Compliant:** Total client bundle footprint is verified well within the 180kB initial load threshold.<br>3. **Zero Runtime Impact:** Route helper exports are tested and utilized by test runners (`packages/auth/__tests__`). |
| **Disposition** | **WAIVED FOR v1.0.0-trial**. Production artifact generation relies exclusively on the verified Turbopack production pipeline. |
| **Signed Off By** | Release Owner, Quality Lead (2026-10-27) |

---

## 3. Waiver W-03: Finding S6-2 (Mobile Diagnostics Upload Endpoint)

| Field | Detail |
| :--- | :--- |
| **Gated Item** | Gate 27 / Exit Criterion E6: Mobile Problem Reporter Upload (`POST /api/diagnostics/report`) |
| **Finding** | `problem_reporter_modal.dart` posts to `/diagnostics/report`, which lacks a server handler and 404s in online mode. |
| **Compensating Controls** | 1. **Local Tamper-Proof Storage:** `problem_reporter_modal.dart` catches network failure gracefully (`sentOnline = false`) and always records the diagnostic payload into local on-device encrypted logs via `crashLogService.record(...)`.<br>2. **On-Device Inspection:** Diagnostics remain retrievable by users via the in-app `CrashLogsScreen`. |
| **Disposition** | **ACCEPTED AS KNOWN LIMITATION FOR v1.0.0-trial**. Server ingestion route will be provisioned in the v1.1 telemetry update. |
| **Signed Off By** | Mobile Lead, Release Owner (2026-10-27) |
