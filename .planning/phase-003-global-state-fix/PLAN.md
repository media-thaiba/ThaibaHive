# Phase 003: Fix Global State Mutation in Auth Guard

## Objective
Remove the mutable `globalThis.__activeSession` assignment that leaks session data across requests in serverless/Fluid Compute environments.

## Acceptance Criteria
- [ ] `globalThis.__activeSession` assignment removed
- [ ] No code depends on this global
- [ ] All API routes work correctly
- [ ] TypeScript compiles
- [ ] Tests pass

## Tasks

### 3.1 Remove Global Session Assignment
**File:** `src/lib/api/auth-guard.ts:182`
**Current:**
```typescript
(globalThis as any).__activeSession = session;
```
**Action:** Delete this line

### 3.2 Audit Usage of `__activeSession`
**Search:** `grep -r "__activeSession" src/`
**Expected:** No other references found
**If found:** Refactor dependent code to pass session explicitly

### 3.3 Verify Request-Scoped Session Pattern
**Pattern:** Session is already passed to handlers via `requireAuth` wrapper
**Check:** All route handlers receive `session` parameter correctly
**Files to verify:**
- `src/app/api/dashboard/stats/route.ts:21` ✓
- `src/app/api/vision/stream/route.ts:9` ✓
- `src/app/api/finance/purchases/tiers/route.ts:7,22` ✓
- All other API routes using `requireAuth`

### 3.4 Check for Implicit Global Dependencies
**Search:** `grep -r "globalThis" src/lib/api/`
**Action:** Ensure no other mutable globals

### 3.5 Run TypeScript Check
**Command:** `pnpm typecheck`
**Expected:** Zero errors

### 3.6 Run API Route Tests
**Command:** `pnpm test -- --testPathPattern="api"`
**Expected:** All API tests pass

### 3.7 Integration Test: Auth Flow
**Manual test:**
1. Login as user A
2. Make API request
3. Login as user B (different browser/incognito)
4. Make API request
5. Verify no cross-contamination

## Dependencies
- None (standalone fix)

## Risk Assessment
- **Low:** Single line removal, session already passed explicitly
- **Medium:** If any code secretly reads `__activeSession`, it will break
- **Mitigation:** Thorough grep search before removal

## Verification
- [ ] `globalThis.__activeSession` removed
- [ ] No references to `__activeSession` in codebase
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Manual multi-user test shows no session leakage