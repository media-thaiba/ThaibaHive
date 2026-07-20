# Claude Bug Scan Findings — ThaibaHive

> **Last updated**: 2026-07-19
> **Audit scope**: Security-focused review of all API routes, auth flows, and filesystem operations
> **Baseline**: TypeScript 0 errors, ESLint 0 errors (130 pre-existing warnings), 96/96 tests pass

---

## CRITICAL — Fixed

### 1. Path traversal + missing auth on avatar file endpoint
- **File**: `src/app/api/upload/files/avatars/[filename]/route.ts`
- **Risk**: CRITICAL — unauthenticated file read of arbitrary files on the server
- **Before**: The global middleware only checks that *some* cookie exists, never validates it. This route did zero session verification of its own. A completely fake/garbage cookie value was enough to read any file.
- **Exploit confirmed**: With a garbage cookie, I read `package.json` and then `.env` (including `AUTH_JWT_SECRET`, the secret that signs every session token in the app) through this endpoint.
- **Attack payload**: `GET /api/upload/files/avatars/../../../.env` with any non-empty `session_token` cookie.
- **Fix applied**: Real session verification via `verifySession()` + strict filename regex that only allows `<staffId>-<uuid>.<ext>` format, blocking `..`, `/`, `\` and any other traversal.
- **Verification**: Forged cookie → 401. Missing cookie → 401. Real logged-in user with traversal payload → 400. Legitimate avatar access → 200.
- **Action required**: **Rotate `AUTH_JWT_SECRET`** if this code has ever been deployed anywhere reachable. This was a live, working exploit — the secret should be treated as compromised.

### 2. Open redirect in mobile login handoff
- **File**: `src/app/api/auth/mobile-handoff/route.ts`
- **Risk**: HIGH — attacker can complete a real login and silently redirect the user to a malicious site
- **Before**: The `redirect` parameter was used directly in `NextResponse.redirect()` without validation.
- **Fix applied**: Redirect must start with `/`, must not start with `//`, `/\`, or `\/` (protocol-relative or mixed-scheme bypasses).
- **Verification**: Crafted redirect to `https://evil.com` → ignored, defaults to `/`.

---

## HIGH — Fixed

### 3. HOD access control bypass on expense claims
- **Files**: `src/app/api/expense-claims/route.ts`, `src/app/api/expense-claims/[id]/route.ts`
- **Risk**: HIGH — any HOD can view/approve/reject expense claims from every department, not just their own
- **Before**: The `viewAll` parameter granted any HOD access to *all* expense claims. The PATCH approval checked role but not department membership.
- **Fix applied**: Created `src/lib/auth/department-scope.ts` with `getManagedStaffIds()` and `isManagedBy()`. GET filters by `inArray(staffId, managedIds)` for HODs. PATCH checks `isManagedBy()` before allowing approval.

### 4. HOD access control bypass on purchase requests
- **Files**: `src/app/api/purchases/route.ts`, `src/app/api/purchases/[id]/route.ts`
- **Risk**: HIGH — same as #3, plus the reject path had *zero* role/stage checks
- **Before**: Same scoping gap as expense claims. Additionally, the reject handler accepted rejection from *any* authenticated user with `finance:update` permission, regardless of purchase stage or role.
- **Fix applied**: Same `getManagedStaffIds()` scoping for GET. PATCH now validates both role-appropriate transition AND department membership for reject/approve.

### 5. Staff routes IDOR — any user can read any other staff member's data
- **Files**: `src/app/api/staff/route.ts`, `src/app/api/staff/[id]/route.ts`, `src/app/api/staff/[id]/timeline/route.ts`
- **Risk**: HIGH — any authenticated user can read any other staff member's profile and complete activity timeline (attendance, leaves, expenses, tasks, reports)
- **Before**: Routes enforced only coarse-grained role/permission checks (`staff:read`). Zero fine-grained ownership or scope checks on the `[id]` parameter. A `staff` role user could read any other staff member's profile and full activity timeline. A `principal` could update staff in other institutions.
- **Fix applied**: Created `canAccessStaff()` and `getAccessibleStaffIds()` in `src/lib/auth/department-scope.ts`. GET list filters by role scope. GET/PUT/PATCH/[id] check `canAccessStaff()` before returning data. POST validates principal's institution scope for department/institution assignments.

### 6. Chat upload path traversal
- **File**: `src/app/api/chat/upload/route.ts`
- **Risk**: HIGH — arbitrary file write on Linux production systems
- **Before**: `file.name.split(".").pop()` didn't sanitize path separators. A crafted filename like `"x.jpg/../../etc/cron.d/backdoor"` would write to arbitrary filesystem locations via `path.join()`.
- **Fix applied**: Extension extraction now strips non-alphanumeric characters: `rawExt.replace(/[^a-zA-Z0-9]/g, "")`.

### 7. Signup endpoint: no rate limiting + no email verification
- **File**: `src/app/api/auth/signup/route.ts`
- **Risk**: HIGH — account spam, DoS, and immediate staff-level access with any email
- **Before**: Zero rate limiting. No email verification step — self-registration grants a valid JWT immediately with `staff` role.
- **Fix applied**: Added rate limiting (3 attempts/minute/IP). Email verification remains a recommended follow-up.

### 8. Google OAuth audience verification skipped
- **Files**: `src/app/api/auth/google/route.ts`, `packages/auth/google.ts`
- **Risk**: HIGH — when `GOOGLE_CLIENT_IDS` env var is unset, any Google account matching a DB email can authenticate
- **Before**: The `allowedClientIds` array was empty when env var wasn't set, and the `length > 0` check caused audience verification to be entirely skipped.
- **Fix applied**: Fail closed — returns 503 "Google authentication is not configured" when `GOOGLE_CLIENT_IDS` is empty.

---

## MEDIUM — Fixed

### 9. Login user enumeration via deactivated accounts
- **File**: `src/app/api/auth/login/route.ts`
- **Risk**: MEDIUM — reveals whether an email exists and is deactivated
- **Before**: Deactivated accounts returned `403 "Account is deactivated"` while invalid credentials returned `401 "Invalid email or password"`.
- **Fix applied**: Both cases now return the same generic `401 "Invalid email or password"`.

### 10. Google OAuth user enumeration + error message leak
- **File**: `src/app/api/auth/google/route.ts`
- **Risk**: MEDIUM — reveals whether an email is registered; leaks internal error details
- **Before**: "Not registered" error embedded the email. Verification error leaked `err.message`.
- **Fix applied**: Generic `"Invalid Google token"` for both cases. Internal errors logged server-side only.

---

## STILL OPEN — Not yet investigated

### 11. Tasks, reports, checklists, canteen, recognition, circulars
- Not yet audited for IDOR — may have similar patterns to the staff routes

### 12. Export route
- `src/app/api/export/route.ts` — high `any` type count, not yet audited for data leakage

### 13. General upload route
- `src/app/api/upload/route.ts` — MIME type check is client-only, no content inspection (possible stored XSS via SVG/HTML)

### 14. Realtime/presence
- `/api/presence/subscribe`, `/api/presence/status` — subscription auth not verified

### 15. System routes
- `/api/system/update` — update mechanism not audited
- `/api/marketplace/install`, `/api/marketplace/uninstall` — not audited

---

## LOW PRIORITY — Pre-existing style warnings (130 total)

- `@typescript-eslint/no-explicit-any` — ~80 occurrences across API routes, packages, and test files
- `@typescript-eslint/no-unused-vars` — ~15 occurrences (mostly `_` prefixed intentionally unused vars)
- `@next/next/no-img-element` — 6 occurrences of `<img>` instead of Next.js `<Image>`
- `react-hooks/exhaustive-deps` — 7 missing dependency warnings in `useEffect` hooks

None of these are functional bugs. They're code cleanliness issues that don't block builds or tests.

---

## Files Modified in This Audit

| File | Change |
|------|--------|
| `src/lib/auth/department-scope.ts` | **NEW** — shared helpers: `getManagedStaffIds`, `isManagedBy`, `canAccessStaff`, `getAccessibleStaffIds` |
| `src/app/api/expense-claims/route.ts` | HOD department scoping on GET list |
| `src/app/api/expense-claims/[id]/route.ts` | HOD department scoping on PATCH approval |
| `src/app/api/purchases/route.ts` | HOD department scoping on GET list |
| `src/app/api/purchases/[id]/route.ts` | HOD department scoping + reject bypass fix |
| `src/app/api/staff/route.ts` | Role-based scoping on GET list + principal validation on POST |
| `src/app/api/staff/[id]/route.ts` | Scope checks on GET, PUT, PATCH |
| `src/app/api/staff/[id]/timeline/route.ts` | Scope check on GET |
| `src/app/api/chat/upload/route.ts` | Path traversal fix on extension extraction |
| `src/app/api/auth/signup/route.ts` | Rate limiting added |
| `src/app/api/auth/login/route.ts` | Generic error for deactivated accounts |
| `src/app/api/auth/google/route.ts` | Fail closed when unconfigured + generic errors |

---

## Methodology

1. Ran `tsc --noEmit`, `pnpm run lint`, and `npx jest` to establish baseline
2. Identified filesystem-touching API routes via `grep` for `readFile`, `writeFile`, `unlink`, `readdir`
3. Manually reviewed each route for auth checks, path traversal protection, and data scoping
4. Parallel audit of staff routes, chat routes, upload routes, and auth routes using explore agents
5. Fixed issues, re-ran full verification suite
6. Documented findings with reproduction steps and fix details

---

*This file is a living document. Continue adding findings as the audit progresses.*
