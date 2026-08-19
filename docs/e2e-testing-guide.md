# Playwright E2E Testing Guide

This guide describes the end-to-end (E2E) testing infrastructure, session state caching mechanisms, and best practices for creating and executing E2E UI automation tests in the ThaibaHive workspace.

---

## Getting Started

### 1. Install E2E Dependencies
End-to-end tests are powered by [Playwright](https://playwright.dev/). First, ensure you install the browser engine binaries and their system dependencies:

```bash
pnpm install
pnpm exec playwright install --with-deps
```

### 2. Run E2E Test Suite
To run all tests in headless mode across all three configured browser engines (Chromium, Firefox, WebKit):

```bash
pnpm test:e2e
```

To run a specific test file:

```bash
pnpm exec playwright test e2e/auth.spec.ts
```

To run tests in UI mode (which offers a visual debugger):

```bash
pnpm exec playwright test --ui
```

---

## Authentication and Session State Caching

To bypass the overhead of manual credentials login steps inside individual tests, the E2E test runner utilizes cached session states stored in the `.auth/` directory.

### Global Setup Pipeline
The global setup script `e2e/global-setup.ts` executes automatically before tests run. It:
1. Resets and seeds E2E test databases idempotently under `PRAGMA foreign_keys = OFF`.
2. Launches a headless Chromium browser.
3. Automatically authenticates and caches the browser cookies/localStorage (JWT tokens) to `.auth/[role].json` for the following roles:
   - `super_admin` (`test-superadmin@thaibahive.local`)
   - `admin` (`test-admin@thaibahive.local`)
   - `principal` (`test-principal@thaibahive.local`)
   - `hod` (`test-hod@thaibahive.local`)
   - `staff` (`test-staff@thaibahive.local`)

### Reusing Cached Sessions
In your test spec files, you can load these cached sessions at the file or test scope using the `test.use` configuration:

```typescript
import { test, expect } from "@playwright/test";

test.describe("My Protected Page Workflow", () => {
  // Use the cached staff state directly
  test.use({ storageState: ".auth/staff.json" });

  test("should load the page authenticated", async ({ page }) => {
    await page.goto("/my-protected-page");
    await expect(page.locator("h1")).toContainText("Protected Section");
  });
});
```

For multi-role workflows (such as staff creating a request and admin approving it), you can load alternative storage states dynamically:

```typescript
test("should execute approval flow", async ({ page, browser }) => {
  // 1. Current 'page' uses default file-level 'staff' state
  await page.goto("/submit");
  await page.click("button:has-text('Submit')");

  // 2. Load cached 'admin' session state in a separate context
  const adminContext = await browser.newContext({ storageState: ".auth/admin.json" });
  const adminPage = await adminContext.newPage();
  
  await adminPage.goto("/admin/approvals");
  await adminPage.click("button:has-text('Approve')");
  
  await adminContext.close();
});
```

---

## Guidelines for Writing E2E Tests

### 1. Protect Concurrent SQLite Writing (Serial Execution)
Since ThaibaHive uses SQLite as its local database, parallel writes can cause database lock contention. Group tests that interact with shared states into a single spec file and configure them to execute serially:

```typescript
import { test } from "@playwright/test";

test.describe.configure({ mode: 'serial' });

test.describe("Serial Attendance Workflows", () => {
  // Tests will run one after another in order
});
```

Additionally, run the test suites locally using `--workers=1` when executing multiple spec files to guarantee complete serial database isolation:
```bash
pnpm test:e2e --workers=1
```

### 2. Leverage Timing-Resilient Assertions
Do **not** use static timeouts (`page.waitForTimeout(3000)`) as they lead to flaky runs. Instead, use Playwright's auto-retrying locators and assertion matchers:

```typescript
// Good - Playwright will wait up to 15s for the element to appear
await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

// Good - Wait for API route response
const responsePromise = page.waitForResponse(response => response.url().includes('/api/attendance') && response.status() === 200);
await page.click("button[type='submit']");
await responsePromise;
```

### 3. Client Component Import Boundaries
To enforce the backend-client architectural boundary, a custom ESLint rule prevents files inside client directories (`src/components/`, `src/hooks/`) from directly importing `@thaiba/db` or `@/db`.
Always access database data via:
- API endpoint calls (`fetch("/api/...")`)
- Next.js Server Action handoffs
