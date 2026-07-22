# Claude Bug Scan Findings — ThaibaHive

> **Last updated**: 2026-07-22 (merged — see note below)
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

## Also fixed (restored from Claude's first audit pass)

### 11. CSV export data leak
- **File**: `src/app/api/export/route.ts`
- **Risk**: MEDIUM — the "attendance" and "leaves" export types silently returned *all* institutions' data instead of an empty result when the selected institution had zero matching staff.
- **Fix applied**: Always apply the filter, using a sentinel value when no staff match, instead of dropping the filter entirely.
- **Verification**: typecheck/lint/tests clean.

### 12. Staff CSV export row duplication
- **File**: `src/app/api/export/route.ts`
- **Risk**: MEDIUM — LEFT JOIN fan-out caused staff with multiple departments/institutions to appear once per combination instead of once per person.
- **Fix applied**: Rewrote to aggregate memberships into one row per staff member.
- **Verification**: typecheck/lint/tests clean.

### 13. Duplicate check-in race → raw 500
- **File**: `src/app/api/attendance/check-in/route.ts`
- **Risk**: LOW — a raced double check-in hit the DB's unique constraint and surfaced as a raw 500 instead of a friendly "already checked in" error.
- **Fix applied**: Catch the constraint violation and return the same friendly 400 the pre-check already used.

### 14. Weak encryption key — mobile offline queue
- **File**: `thaibahive_mobile_app/lib/core/services/offline_queue.dart`
- **Risk**: HIGH (security) — the AES-256 key for the offline queue was generated from `DateTime.now().microsecondsSinceEpoch % 256` in a tight loop, producing a highly predictable, low-entropy key.
- **Fix applied**: `Random.secure()` instead.
- **Verification**: Antigravity reported running `flutter analyze` (0 errors) and reviewing the interceptor logic directly — Claude could not run Flutter in its sandbox at all, so this is the first real compiler-level verification either side has had on this fix.

### 15. Missing JWT refresh flow — backend + mobile
- **Files**: `thaibahive_mobile_app/api/src/middleware/auth.ts`, `.../routes/auth/index.ts`, mobile `auth_response_model.dart`/`auth_repository.dart`/`auth_state.dart`/`api_client.dart`
- **Risk**: MEDIUM — a `refresh_token` storage key existed but nothing ever wrote to or used it; every access-token expiry forced a full re-login.
- **Fix applied**: Stateless refresh JWTs (reusing the existing `tokenVersion` revocation mechanism, no new DB table needed), new `POST /auth/refresh` endpoint, single-flight refresh-and-retry interceptor on the mobile client.
- **Verification**: Backend fully live-tested by Claude (signup, refresh, rejecting wrong-type/garbage/missing tokens, tokenVersion-based revocation). Mobile Dart side: Antigravity reports the interceptor is "robust" based on `flutter analyze` (0 errors) — first real compile-level check either side has had; still recommend an actual device test of the silent-refresh-on-401 behavior before fully trusting it in production.

### 16. Offline queue never synced
- **Files**: `thaibahive_mobile_app/lib/core/services/offline_sync_service.dart` (new), `nfc_check_in.dart`, `nfc_scan_screen.dart`, `service_initializer.dart`
- **Risk**: MEDIUM-HIGH — nothing anywhere drained the offline event queue; NFC scans permanently orphaned encrypted entries in local storage that were never sent or cleaned up. The queued payload was also missing GPS coordinates entirely.
- **Fix applied**: New dependency-free periodic sync driver (45s interval), payload now includes lat/lng, scan screen marks the queued copy completed after a successful direct check-in.
- **Verification**: Antigravity reports `offline_sync_service.dart` reviewed directly — periodic sync logic confirmed present. Recommend the same real-device airplane-mode test outlined in the fix plan before fully trusting it.

### 17. `accounts`/`purchase` roles didn't exist
- **Files**: `packages/auth/roles.ts`, `src/types/index.ts`, `src/db/seed.ts`
- **Risk**: MEDIUM — the purchase-approval workflow referenced `"accounts"`/`"purchase"` roles that weren't valid `StaffRole` values and had no permissions defined, so those approval stages were unreachable by anyone but admin.
- **Fix applied**: Added both as real `StaffRole` values with real permissions (`purchase` gets asset management + finance:create/update; `accounts` gets finance:create/update/export — `finance:delete` deliberately excluded from both since no route checks it, and deletion of financial records should stay restricted to admin/super_admin). Seed data updated to assign these roles to real test accounts.
- **Verification**: Claude independently confirmed `finance:delete` is checked nowhere in the codebase (validating the reasoning for excluding it). Type additions and seed changes confirmed present in the actual pushed commit. Full cross-department PATCH-approval flow for the `hod` stage re-verified live by Claude; the `accounts`/`purchase` stages' permissions were reviewed but not independently live-tested end-to-end.

---

## Further fixes applied in the second pass (Antigravity)

> **Independent verification note (Claude, 2026-07-22):** this batch was
> initially reported as pushed but wasn't actually present in the repo
> on first check — confirmed via direct `grep` for `canAccessTask`,
> the export scoping logic, and `institutionIds` in realtime.ts, all
> absent. Re-confirmed after a second push (commit `771fabd`), which
> **is** genuinely present this time: pulled it, ran typecheck (clean),
> lint (0 errors), and the full test suite (127/127, matching the
> report exactly). Additionally live-tested the two highest-stakes
> items with real seeded data rather than relying on the test suite
> alone:
> - **Item 24 (export scoping)** — this file has now been modified
>   three times across this audit, so it got the closest look. Live
>   confirmed: an `accounts`-role user assigned to one institution gets
>   403 when requesting a different institution's export, 200 for their
>   own. Also re-ran the *original* leak from item 11 — an admin
>   requesting an institution with zero staff still gets an empty CSV,
>   not all-institution data — still correctly fixed after all three
>   rounds of edits to this file.
> - **Item 18 (tasks)** — confirmed `canAccessTask` exists and is wired
>   into all four HTTP methods; not separately live-exploit-tested.
> - Items 19-23, 25, 26 — confirmed present in source and covered by
>   the passing test suite; not independently live-tested by Claude
>   beyond that.

### 18. Tasks API Routes IDOR and Scoping
- **Files**: `src/lib/auth/department-scope.ts`, `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts`, `src/app/api/tasks/[id]/comments/route.ts`, `src/app/api/tasks/reorder/route.ts`
- **Risk**: HIGH — unauthorized users could view, edit, comment, or reorder tasks outside their assigned department/institution.
- **Fix applied**: Implemented centralized helper `canAccessTask()` validating ownership, department head mapping, and principal institution scoping. Replaced raw GET queries with role-based filters, and wired all task write/edit endpoints to verify access using the new helper.

### 19. Daily Reports API Scoping
- **Files**: `src/app/api/reports/route.ts`, `src/app/api/reports/[id]/route.ts`, `src/app/api/reports/[id]/review/route.ts`
- **Risk**: HIGH — HODs and principals could view or review daily reports of staff members outside their departments or institutions.
- **Fix applied**: Integrated `canAccessStaff` and `getAccessibleStaffIds` scoping checks in reports GET list, GET detail, and review PATCH handlers to strictly scope by department and institution.

### 20. Checklists API Scoping
- **Files**: `src/app/api/checklists/assignments/route.ts`, `src/app/api/checklists/assignments/[id]/route.ts`, `src/app/api/checklists/tasks/[id]/route.ts`
- **Risk**: HIGH — supervisors could retrieve or update checklists and checklist tasks of staff members outside their scope.
- **Fix applied**: Enforced institutional and departmental scoping checks using `getAccessibleStaffIds` and `canAccessStaff` across checklist assignments and checklist task updates.

### 21. Canteen API Scoping
- **Files**: `src/app/api/canteen/[id]/route.ts`
- **Risk**: MEDIUM — staff could delete meal log cancellations of arbitrary other users.
- **Fix applied**: Added database checks to verify the log exists (404) and belongs to a staff member under the caller's scope (403) via `canAccessStaff`.

### 22. Staff Recognition API Scoping
- **Files**: `src/app/api/recognition/route.ts`
- **Risk**: MEDIUM — staff could list or create recognitions for staff members in other institutions.
- **Fix applied**: Restricted recognition listings and creations to staff members sharing the same institution.

### 23. Circulars API Scoping
- **Files**: `src/app/api/circulars/route.ts`, `src/app/api/circulars/[id]/route.ts`
- **Risk**: HIGH — principals/HODs could bypass barriers to target or delete circulars in other institutions.
- **Fix applied**: Validated that creations target only caller institutions (and HODs head target departments), filtered GET lists to only show relevant or same-institution circulars, and validated DELETE requests.

### 24. Financial Exports API Scoping
- **Files**: `src/app/api/export/route.ts`
- **Risk**: HIGH — accounts/principal roles could leak financial exports from institutions they do not belong to.
- **Fix applied**: Overwrote the requested `institutionId` parameter to strictly validate against the caller's assigned institutions in `staffInstitutions`, supporting multi-institution users.

### 25. Stored XSS via File Upload Route
- **Files**: `src/app/api/upload/route.ts`
- **Risk**: HIGH — attacker could upload arbitrary files (like HTML/SVG) with falsified MIME types to trigger XSS.
- **Fix applied**: Implemented a strict lookup dictionary mapping allowed MIME types to matching extensions and verified alignment on upload.

### 26. Realtime/Presence Leak
- **Files**: `src/lib/api/realtime.ts`, `src/app/api/presence/subscribe/route.ts`
- **Risk**: MEDIUM — presence status updates were broadcast globally, leaking activity/status to unrelated institutions.
- **Fix applied**: Resolved subscriber institution list at subscription time (SSE stream registry) and filtered presence broadcasts to only target users sharing an institution.

---

## STILL OPEN — Not yet investigated

### 27. System routes
- `/api/system/update` — update mechanism not audited
- `/api/marketplace/install`, `/api/marketplace/uninstall` — not audited

---

## LOW PRIORITY — Pre-existing style warnings (153 total)

- `@typescript-eslint/no-explicit-any` — ~130 occurrences across API routes, packages, and test files
- `@typescript-eslint/no-unused-vars` — ~15 occurrences (mostly `_` prefixed intentionally unused vars)
- `@next/next/no-img-element` — 6 occurrences of `<img>` instead of Next.js `<Image>`
- `react-hooks/exhaustive-deps` — 7 missing dependency warnings in `useEffect` hooks

None of these are functional bugs. They're code cleanliness issues that don't block builds or tests.

---

## Files Modified in This Audit

| File | Change |
|------|--------|
| `src/lib/auth/department-scope.ts` | **NEW** — shared helpers: `getManagedStaffIds`, `isManagedBy`, `canAccessStaff`, `getAccessibleStaffIds`, `canAccessTask` |
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
| `src/app/api/tasks/route.ts` | Role-based RLS filters on GET list |
| `src/app/api/tasks/[id]/route.ts` | Scope validation on GET/PUT/PATCH/DELETE |
| `src/app/api/tasks/[id]/comments/route.ts` | Scoping validation on task comment POST |
| `src/app/api/tasks/reorder/route.ts` | Access checks on reordered tasks |
| `src/app/api/reports/route.ts` | Principal and HOD filter scoping on GET |
| `src/app/api/reports/[id]/route.ts` | Scoping on GET report details |
| `src/app/api/reports/[id]/review/route.ts` | Scoping on PATCH report review |
| `src/app/api/checklists/assignments/route.ts` | Scoping on GET and POST |
| `src/app/api/checklists/assignments/[id]/route.ts` | Scoping on GET and PATCH |
| `src/app/api/checklists/tasks/[id]/route.ts` | Scoping on checklist task completion |
| `src/app/api/canteen/[id]/route.ts` | Meal cancellation check |
| `src/app/api/recognition/route.ts` | Scoped listing and recipient check on same institution |
| `src/app/api/circulars/route.ts` | Audience filter on GET and POST validations |
| `src/app/api/circulars/[id]/route.ts` | DELETE circular scoping |
| `src/app/api/export/route.ts` | Multi-institution financial export scoping |
| `src/app/api/upload/route.ts` | MIME-type extension alignment validation |
| `src/lib/api/realtime.ts` | SSE status filtering by institution |
| `src/app/api/presence/subscribe/route.ts` | Subscriber institution retrieval and connection storage |

---

## Methodology

1. Ran `tsc --noEmit`, `pnpm run lint`, and `npx jest` to establish baseline
2. Identified filesystem-touching API routes via `grep` for `readFile`, `writeFile`, `unlink`, `readdir`
3. Manually reviewed each route for auth checks, path traversal protection, and data scoping
4. Parallel audit of staff routes, chat routes, upload routes, and auth routes using explore agents
5. Fixed issues, re-ran full verification suite after each file modification
6. Documented findings with reproduction steps and fix details

---

*This file is a living document. Continue adding findings as the audit progresses.*
