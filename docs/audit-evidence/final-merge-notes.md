# Final Consolidation & Merge Decisions (`audit/final`)

This document records the architectural reconciliation and de-duplication decisions taken when consolidating `audit/antigravity-r1` (Round 11 backend + U1-U7) and `audit/ux` (Opencode commits + browser e2e suite) into the single canonical branch of record: `audit/final`.

---

## 1. Nonce CSP Architecture (`proxy.ts`, `security-headers.ts`, `layout.tsx`, `csp-nonce.ts`)

- **Single Source of Truth**: `src/lib/security/security-headers.ts` defines all security header constants (`SECURITY_HEADERS`, `HSTS_VALUE`, `PERMISSIONS_POLICY_VALUE`, `REPORTING_ENDPOINTS_VALUE`), CSP generation via `buildContentSecurityPolicy(isProd, nonce)`, and `generateCspNonce()`.
- **Proxy Middleware (`src/proxy.ts`)**: Generates a cryptographically strong WebCrypto nonce per request (`generateCspNonce()`), attaches it to both outgoing response headers and forwarded request headers (`x-nonce`, `Content-Security-Policy`), ensuring dynamic rendering receives the per-request nonce without drift.
- **Root Layout (`src/app/layout.tsx`)**: Reconciled the duplicate meta tags and unresolved variable reference (`_nonce`). Ingests `x-nonce` from request headers and injects a single valid `<meta name="csp-nonce" content={nonce} />` into document `<head>`.
- **Client Nonce Utility (`src/lib/csp-nonce.ts`)**: Kept clean browser helper `getClientCspNonce()` for child window / print / dynamic iframe DOM script execution.
- **Static Fallback (`next.config.ts`)**: `headers()` applies `securityHeaderPairs()` to all static routes, serving secure defaults with strict fallback policies.

---

## 2. Route Boundaries (`error.tsx` and `loading.tsx`)

- **Combined Coverage**: Retained all loading and error boundaries from both branches without omission:
  - From `audit/antigravity-r1` (U3): `academic/students`, `examinations`, `operations/supply`.
  - From `audit/ux` (U3/Opencode): `admin`, `admin/nfc`, `attendance`, `finance`, `leaves`, `media`, `parent`, `portal`, `staff`, `tasks`, `workspace`.
- **Consistency**: All error boundaries use standard UX recovery triggers with retry actions (`reset()`) and consistent accessible UI alert primitives (`role="alert"`).

---

## 3. Cache-Control & Edge Optimization Policies

- **API Routes**: `next.config.ts` enforces `private, no-store` as the base header rule for `/api/:path*`.
- **Proxy Dynamic Responses**: `src/proxy.ts` and `src/lib/edge/cache-control.ts` enforce `private, no-store, no-cache, must-revalidate` with `Pragma: no-cache` on dynamic and authenticated API endpoints.
- **Static & Media Thumbnails**: `PUBLIC_IMMUTABLE` (`public, max-age=31536000, immutable`) and `PUBLIC_MEDIA_THUMBNAIL` (`public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400`) are applied conditionally on verified public assets with Surrogate-Keys.
- **Test Assertions**: Reconciled `media-security.test.ts` and `edge-optimizer.test.ts` to strictly assert `private, no-store, no-cache, must-revalidate`.

---

## 4. Playwright End-to-End Suite Consolidation

- **Consolidated Spec Count**: All 7 Playwright specs retained and verified:
  1. `e2e/accessibility.spec.ts` (9 tests)
  2. `e2e/security-headers.spec.ts` (3 tests)
  3. `e2e/csp-audit.spec.ts` (10 tests)
  4. `e2e/keyboard-a11y.spec.ts` (7 tests)
  5. `e2e/route-boundaries.spec.ts` (4 tests)
  6. `e2e/reviews.spec.ts` (4 tests)
  7. `e2e/marketplace.spec.ts` (2 tests)
  **Total**: 39 Playwright browser tests across all 7 specs.
