# Phase 002: Enable Next.js 16 Cache Components & PPR

## Objective
Enable Cache Components (`cacheComponents: true`) and Partial Prerendering (PPR) to optimize static shell delivery and enable instant navigation.

## Acceptance Criteria
- [ ] `cacheComponents: true` enabled in next.config.ts
- [ ] Application builds successfully with Cache Components
- [ ] Static routes identified and optimized
- [ ] `@next/playwright` `instant()` tests added for critical routes
- [ ] No runtime regressions

## Tasks

### 2.1 Enable Cache Components
**File:** `next.config.ts:58-71`
**Change:** Add `cacheComponents: true` to experimental config
```typescript
experimental: {
  cacheComponents: true,
  optimizePackageImports: [...],
}
```

### 2.2 Test Build with Cache Components
**Command:** `pnpm build`
**Expected:** Successful build with Cache Components enabled
**Note:** May surface blocking routes that need Suspense boundaries

### 2.3 Identify Blocking Routes
**Action:** Run build and check for routes that opt-out of static generation
**Tool:** Next.js build output shows which routes are dynamic

### 2.4 Add Suspense Boundaries to Dashboard
**File:** `src/app/(shell)/page.tsx`
**Current:** Manual loading state with `if (loading) return <Skeleton />`
**Change:** Convert to async component with Suspense
```tsx
// New async component
async function DashboardContent() {
  const data = await fetch("/api/dashboard/stats").then(r => r.json());
  return <DashboardUI data={data} />;
}

// Page becomes
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
```

### 2.5 Add Suspense Boundaries to Shell Layout
**File:** `src/app/(shell)/layout.tsx`
**Current:** Client-side hydration gate with `isHydrated`
**Change:** Move dynamic parts behind Suspense

### 2.6 Configure `@next/playwright` for Instant Tests
**Install:** `pnpm add -D @next/playwright@16.3.8`
**Config:** Update `playwright.config.ts` to expose testing API
```typescript
// next.config.ts addition
experimental: {
  exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === '1',
}
```

### 2.7 Create `instant()` Test for Dashboard
**File:** `e2e/dashboard-instant.spec.ts`
```typescript
import { test, expect } from '@next/playwright';

test('dashboard loads instantly', async ({ page, instant }) => {
  await instant(page.goto('/'));
  await expect(page.locator('h1')).toBeVisible(); // Shell commits
});
```

### 2.8 Create `instant()` Test for Auth Pages
**File:** `e2e/auth-instant.spec.ts`
**Routes:** `/auth/login`, `/auth/signup`

### 2.9 Verify Partial Prerendering (PPR)
**Check:** Routes with mixed static/dynamic content stream correctly
**Test:** Navigate between routes, verify shell commits instantly

## Dependencies
- Phase 001 (React 19) recommended first
- `@next/playwright` version must match `next` (16.3.8)

## Risk Assessment
- **High:** Cache Components may change rendering behavior for dynamic routes
- **Medium:** Build may fail on routes using `headers()`, `cookies()`, `searchParams` without Suspense
- **Mitigation:** Test build locally first, fix blocking routes incrementally

## Verification
- [ ] `pnpm build` succeeds with `cacheComponents: true`
- [ ] Dashboard route shows static shell immediately (via `instant()` test)
- [ ] No hydration mismatches in console
- [ ] Soft navigation between routes is instant
- [ ] Lighthouse/TBT improved