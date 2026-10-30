<USER_REQUEST>
The revised task file is ready: `stage1-sessions-revocation-task.md`. It has 35 numbered design rules, nine acceptance criteria, 18 required test cases, and a list of the evidence Antigravity must return.

Two things are not settled by your answers, and Antigravity has to prove them in the return:

- **TOTP location.** I'd expect OTP verification to have its own route. The claim that it is a branch of `webauthn/verify` (`type === "otp"`) needs a line-numbered diff and a test, which rule 17 and test case 9 require.
- **Role-creation rule.** I wrote it exactly as you described it: the target's rank must be below the caller's, except that a super admin may create a super admin. The task file makes Antigravity grep every writer of `staff.role` to confirm that rule holds everywhere, not just in the staff create route.

Send the return when Antigravity has it, and I'll review it against the severity list. Also check the PRAGMA behaviour (rule 5) and the stray-write-in-transaction test (rule 34), because both are things I suspect on LibSQL but haven't verified.

# Stage 1 Task (Revised): Sessions, JWT `sid`, Revocation, Terminate Route

Status: Revision 2. Supersedes the first Stage 1 contract and the earlier "implementation package".
Executor: Antigravity. Reviewer: Claude. Nothing here is "done" until the evidence in section 7 is returned.

## 1. Objective

Make `user_sessions` (DB) the source of truth for session validity. Terminating one session
takes effect on the very next request on every instance, with no cache. Only that session
is affected, not the user's other devices.

## 2. Out of scope (do not touch)

Audit viewer UI, System Doctor, telemetry, DB explorer, any new UI. SSE push to Flutter is
best-effort only; no acceptance criterion may depend on it.

## 3. Decisions already made (do not reopen)

- Only staff authenticate. Students and guardians have no credentials.
- verifySession runs in Node route handlers and RSC. `src/proxy.ts` only checks the signature and `sid` presence.
- Dev SQLite driver is LibSQL (async); prod is node-postgres through the `wrapPgDb` proxy.
- No cache. Session status is folded into the existing per-request staff query.
- Terminate matrix: developer first (anyone except own current sid); super_admin may terminate
  only non-developer targets with rank below 90 and never own sid; everyone else 403.
- One rank map (`ROLE_RANK_MAP`). Delete the old `ROLE_RANK` in `staff/[id]/route.ts`.
- Timestamps are epoch ms everywhere: SQLite `integer({mode:"number"})`, Postgres `bigint({mode:"number"})`. Never PG `integer`. This includes `created_at`.

## 4. Design rules

### 4.1 Schema and migrations
1. `user_sessions`: id (`sess_<nanoid>`), staff_id (FK, cascade), email, role, institution_id, status
   (`active|terminated|expired`), client_ip, user_agent, device_type, login_at, last_active_at,
   expires_at, logout_at, created_at. Indexes: (staff_id, status), status, expires_at, last_active_at.
2. `step_up_used`: jti (PK), staff_id, action, expires_at, used_at.
3. Both `schema.ts` and `schema.pg.ts`, plus both generated migrations.
4. PG migration enables RLS deny-all on both tables:
   `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` with no permissive policies.
5. LibSQL PRAGMAs: `await` them; on local file DBs a failure is a fatal startup error (no swallowed `.catch`).

### 4.2 Session minting (`packages/auth/session.ts`)
6. One internal helper mints sessions for `createSession` AND `createDPoPSession`. Initial login
   inserts the row, then signs the JWT. If the insert fails, the login fails (fail closed).
7. `row.expires_at === jwt.exp * 1000` (exact to the second). `deviceType` is a parameter
   (mobile handoff passes `"mobile"`), not only user-agent sniffing.
8. Preserve everything already exported and used elsewhere (`destroySession`, `createStepUpToken`,
   `verifyStepUpToken`, DPoP TTL and cookie options). Deliver a real `git diff`, not a rewritten file.
9. No `existingSid` parameter (no refresh endpoint exists). If a real call site is found, stop and report.
10. Client IP only from `x-vercel-forwarded-for` / `x-real-ip`. Never `cf-connecting-ip`, never `x-forwarded-for`.

### 4.3 Verification
11. verifySession runs one query joining staff and user_sessions with BOTH keys:
    `user_sessions.id = sid AND user_sessions.staff_id = staff.id AND staff.id = session.staffId`.
    Reject unless: staff.isActive, tokenVersion matches, status = active, expires_at > now.
    Role comes from the DB row, never from the JWT.
12. Any DB error is a rejection (fail closed).
13. Heartbeat: `UPDATE ... SET last_active_at = ? WHERE id = ? AND status='active' AND last_active_at < ? - 120000`,
    run through `after()`/`waitUntil()` (not a floating promise), with failures logged.
14. DPoP sessions: show the actual verification path. It must also check `user_sessions`. If it
    does not, that is a revocation bypass and a blocker.
15. Tokens without `sid` are rejected with 401 `LEGACY_SESSION_EXPIRED`. This applies only to
    session tokens, not to handoff, step-up, or MFA-pending tokens.
16. `src/proxy.ts`: the legacy-`sid` check must not apply to public auth routes (login, reset,
    handoff exchange). A user with a stale cookie must still be able to log in, and the stale
    cookie is cleared on that response.

### 4.4 Login paths and lifecycle
17. Every path that ends in a session goes through the shared helper and gets a row: password
    login (incl. post-MFA), Google, WebAuthn, TOTP (`webauthn/verify` `type === "otp"` branch),
    SAML ACS, mobile handoff. The MFA-pending state creates no row. Any institution/role switch
    or impersonation route that calls `createSession` is listed and covered.
18. Mobile handoff: the nonce embeds `originSid`. The exchange re-checks that the origin session
    is active and staff.isActive / tokenVersion still match, then creates a NEW sid with
    `deviceType: "mobile"`. Document that terminating the web session does not end the mobile one.
19. Logout: tolerant of an expired or terminated session (it must still clear the cookie), handles
    the Bearer path, and marks the row terminated if it is still active. Do not wrap in a guard that fails first.
20. These terminate the affected sessions (all sessions of the staff member unless noted):
    password change (other sessions only), password reset complete, admin-initiated password reset,
    staff deactivation, institution deactivation (that institution's staff), role change,
    passkey/MFA removal. Where a route does not exist, say so explicitly.

### 4.5 Roles and ranks
21. `ROLE_RANK_MAP` covers all 16 roles and lives in `packages/auth/roles.ts`. An unrecognized role
    has no rank and every rank check DENIES it (fail closed, including the terminate matrix).
22. Role creation rule: target rank must be below the caller's rank, except that `super_admin` may
    create `super_admin`. `system` can never be assigned through any API. First super_admin comes
    from the `SUPER_ADMIN_EMAIL` seed.
23. Grep every writer of `staff.role` (inserts and `.set({ role`), including roster import, Google
    auto-create, approval flows, and seed scripts. Each enforces rule 22. Any role change on an
    existing staff member terminates their sessions.
24. Register permissions `system:sessions:view`, `system:sessions:terminate`, `auth:logout` in
    `roles.ts`. State which role the developer account holds, and prove the developer can reach the
    terminate route.

### 4.6 Step-up
25. New endpoint `POST /api/auth/step-up/verify`. Factors: passkey first, then TOTP where enrolled,
    then password as last resort. The developer account must use a passkey. Failures are counted in
    the DB (not memory) and rate-limited.
26. Action token: `typ: thaiba-action-step-up`, `aud: thaiba:action`, bound to
    `{staffId, sid, action, jti}`, TTL 5 minutes, signed with its OWN secret context
    (`"action-step-up"`), never the login-pending `"step-up"` secret.
27. The verifier checks typ, aud, action, sid, staffId, expiry. A login-pending `stepUpPending` token
    must be rejected.
28. Single use: the `jti` insert into `step_up_used` happens in the SAME transaction as the action.
    If the action fails, the token is not burned. A primary-key conflict means replay and aborts.

### 4.7 Terminate route
29. `POST /api/admin/sessions/[id]/terminate`, requires `system:sessions:terminate` + step-up for
    action `session:terminate`.
30. Origin check against configured `ALLOWED_ORIGINS` plus a tenant-subdomain pattern
    (`*.thaiba-hive.vercel.app`, localhost in dev). A missing Origin on a cookie-authenticated request
    is rejected, or the exemption is justified in writing.
31. Zod-validate the body (`stepUpToken` string, `reason` string with max length).
32. Evaluate the developer check first, using the live target `staff` record (never the session
    payload or denormalized columns). Then the rank matrix (rule 21).
33. Transaction contents: consume jti, `UPDATE ... WHERE id=? AND status='active' RETURNING id`,
    and the audit entry. Idempotent and driver-agnostic (no rowsAffected/rowCount).
34. `cryptoAuditWriter.log(params, tx)` accepts the transaction handle and writes through it. It must
    never use the global `db` from inside a transaction. Test this on both dialects (on LibSQL a stray
    global write inside an open transaction is expected to block until busy_timeout).
35. Document the response behaviour: unknown sid returns 200 `terminated:false`, while a sid you may
    not terminate returns 403. Record this as an accepted minor enumeration risk (sids are unguessable).

## 5. Acceptance criteria

- AC-1 Schema parity: both schema files and both migrations; `bigint` visible for every timestamp in PG; RLS statements present.
- AC-2 Mint and verify: rules 6-16 hold; exp equality proven by decoding the JWT.
- AC-3 Login paths: every path in rule 17 produces exactly one session row; MFA-pending produces none.
- AC-4 Lifecycle: every route in rule 20 terminates the right sessions.
- AC-5 Ranks and roles: rules 21-24, with the matrix tested across all 16 roles.
- AC-6 Step-up: rules 25-28.
- AC-7 Terminate route: rules 29-35.
- AC-8 Dual dialect: the whole suite runs on real LibSQL AND real Postgres (docker or a Supabase branch), including `.returning()`, the `.get()` proxy inside `tx`, and the FK-in-transaction test.
- AC-9 Build: `tsc --noEmit` clean, lint clean.

## 6. Test requirements (all tests import and exercise real application code)

Infrastructure:
- Fixtures insert real `staff` rows (developer, super_admin, admin, teacher, inactive staff) and clean up after each test.
- A helper mocks `next/headers` so `cookies()` and `headers()` return the minted token. A test that cannot first prove `verifySession` returns the session is invalid.

Required cases:
1. Mint: row exists, `id` has the `sess_` prefix, `exp === floor(expires_at/1000)`, both `createSession` and `createDPoPSession`.
2. Verify OK, then terminate, then the very next verify returns null (assert non-null BEFORE termination).
3. Expired row rejected. Inactive staff rejected. tokenVersion mismatch rejected.
4. `sid`/`staffId` mismatch rejected (join integrity).
5. DB failure during verify rejected (fail closed).
6. Legacy token without `sid` rejected with the right code; legacy cookie plus login still works.
7. DPoP session revoked by terminate.
8. Heartbeat debounce: no write inside 2 minutes, one write after.
9. Each login path creates one row; MFA-pending creates none.
10. Mobile handoff: terminated origin sid cannot exchange; new sid is distinct; web termination leaves the mobile session alive.
11. Logout with an already-terminated session still clears the cookie.
12. Each lifecycle route in rule 20 terminates the expected sessions.
13. Rank matrix: each of the 16 roles x each target class (developer, super_admin, lower role, self, unknown role), expecting 200/403 exactly.
14. Role creation rule and `system` blocked.
15. Step-up: valid; replay rejected; wrong action; wrong sid; wrong staffId; expired; wrong typ/aud; login-pending token rejected; jti not burned when the transaction fails.
16. Terminate: idempotent second call; audit row written in the same transaction (rollback test: force a failure after the update and assert neither the session change nor the audit entry persists).
17. Origin: allowed, tenant subdomain allowed, foreign rejected, missing rejected.
18. FK violation inside `db.transaction` throws an error whose message mentions the foreign key (not just any error).

## 7. Evidence required in the return

1. `git diff` (full, not summarized) for: both schema files, both migrations, `session.ts`, `step-up.ts`,
   `roles.ts`, `proxy.ts`, every login route, mobile handoff + `mobile-nonce-service.ts`, logout,
   every lifecycle route in rule 20, staff create/update/deactivate, the step-up verify endpoint,
   the terminate route, the audit writer, and `packages/db/index.ts` (PRAGMA change).
2. Raw `rg -n "SignJWT|createSession|createDPoPSession|thaibahive_session|cookieName|jwtVerify|\\.set\\(\\{ ?role|insert\\(staff\\)"`
   output over the whole repo, each hit classified (wired to sid / out of scope with reason).
3. Raw test output for each dialect, with counts that reconcile: total = passed + failed + skipped,
   and the number of tests matches section 6. Name any skipped test and why.
4. `tsc --noEmit` and lint output.
5. A "Not done / accepted risk" list. Anything not completed must appear here, never silently omitted.

## 8. Stop conditions

Stop and report instead of improvising if: a login path cannot go through the shared helper, a
DPoP path bypasses `user_sessions`, a role writer cannot enforce rule 22, or either dialect fails a
required test. Do not weaken a test to make it pass.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-24T18:00:02+05:30.
</ADDITIONAL_METADATA>