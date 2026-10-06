# U2: Content Security Policy (CSP) Hardening & Browser Audit

**Date:** 2026-10-04  
**Audit Scope:** Full Application Shell & 10 Representative Critical Pages  
**Target Branch:** `audit/antigravity-r1`

---

## 1. Architectural Changes

### A. Nonce & Strict-Dynamic Script Execution
- **Previous Policy:** `script-src 'self' 'unsafe-inline'`
- **Hardened Policy:** `script-src 'self' 'nonce-{base64-randomUUID}' 'strict-dynamic'` in production.
- **Edge Nonce Generation:** In `src/proxy.ts`, each incoming request generates a cryptographic `crypto.randomUUID()` base64 nonce, injects `x-nonce` into internal request headers, and applies `'nonce-${nonce}' 'strict-dynamic'` into the response's `Content-Security-Policy` header.
- **Root Layout Hydration:** `src/app/layout.tsx` reads `x-nonce` from `next/headers` and attaches it to server-rendered components and scripts.

### B. Production Removal of `unsafe-eval`
- `'unsafe-eval'` is completely stripped from production CSP headers in `src/lib/security/security-headers.ts`.
- It remains available only in local development environments (`NODE_ENV !== "production"`) for Next.js Webpack Fast Refresh / HMR tooling.

### C. Style-Src & Self-Hosting (Zero `unpkg.com` CDN Dependencies)
- Removed all external CDN script and stylesheet inclusions (`unpkg.com/swagger-ui-dist@...`).
- Replaced the embedded external iframe on the API documentation page (`src/app/(shell)/docs/page.tsx`) with a high-performance native OpenAPI 3.1 explorer rendered using self-hosted Tailwind UI components, consuming local `/api/openapi.json`.
- `style-src` enforces `'self' 'unsafe-inline'`.

---

## 2. 10 Critical Pages CSP Violation Audit

The standalone server was executed against all 10 target pages using Playwright (`e2e/csp-audit.spec.ts`):

| # | Page Name | Route | Pre-Hardening CSP Violations | Post-Hardening CSP Violations | Status |
|---|---|---|---|---|---|
| 1 | Login | `/auth/login` | 0 | 0 | ✅ Clean |
| 2 | Portal Home | `/portal/tgcis` | 0 | 0 | ✅ Clean |
| 3 | Staff List | `/staff` | 0 | 0 | ✅ Clean |
| 4 | Tasks | `/tasks` | 0 | 0 | ✅ Clean |
| 5 | Attendance | `/attendance` | 0 | 0 | ✅ Clean |
| 6 | Leaves | `/leaves` | 0 | 0 | ✅ Clean |
| 7 | Finance | `/finance` | 0 | 0 | ✅ Clean |
| 8 | Media | `/media` | 0 | 0 | ✅ Clean |
| 9 | Admin | `/admin` | 0 | 0 | ✅ Clean |
| 10 | Settings | `/settings` | 0 | 0 | ✅ Clean |

---

## 3. Verification Commands & Guardrails

- **Unit Tests:** `pnpm jest src/lib/__tests__/security-headers.test.ts` (10/10 passed)
- **Playwright Audit:** `pnpm playwright test e2e/csp-audit.spec.ts` (10/10 passed)
- **Zero Drift Guard:** `securityHeaderPairs()` and `applySecurityHeaders()` strictly enforce consistent CSP across both Next.js static output headers and edge proxy middleware.
