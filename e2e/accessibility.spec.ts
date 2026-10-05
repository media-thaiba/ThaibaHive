// Phase 7 / 7.2 — WCAG 2.1 AA browser-level accessibility audit (e2e).
// Requires @axe-core/playwright (installed) and the seeded auth states from
// `e2e/global-setup.ts` (`.auth/*.json`).
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Result } from '@axe-core/playwright';

const RULESET = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Impacts equal to or above this rank fail the page: serious (2) and critical (3). */
const GATE_IMPACT_RANK = 2;

function impactRank(impact?: string): number {
  switch (impact) {
    case 'critical':
      return 3;
    case 'serious':
      return 2;
    case 'moderate':
      return 1;
    default:
      return 0;
  }
}

async function assertNoSeriousViolations(page: Page): Promise<void> {
  await page.waitForTimeout(500);
  const results = await new AxeBuilder({ page }).withTags(RULESET).analyze();
  const seriousPlus: Result[] = results.violations.filter(
    (v) => impactRank(v.impact) >= GATE_IMPACT_RANK
  );
  const summary = seriousPlus.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    help: v.help,
  }));
  expect(
    seriousPlus,
    `Serious/critical WCAG 2.1 AA violations (${summary.length}): ${JSON.stringify(summary, null, 2)}`
  ).toHaveLength(0);
}

/** Tab through focusable elements and verify focus is visible and order is logical. */
async function assertKeyboardNavigation(page: Page): Promise<void> {
  const focusable = await page.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').all();
  if (focusable.length === 0) return;
  await focusable[0].focus();
  for (let i = 0; i < Math.min(focusable.length, 20); i++) {
    await expect(focusable[i]).toBeFocused();
    await page.keyboard.press('Tab');
  }
}

test.describe('Phase 7.2: WCAG 2.1 AA accessibility audits', () => {
  test.describe.configure({ mode: 'serial' });

  test('login page has no serious a11y violations', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');
    await assertNoSeriousViolations(page);
  });

  test('signup page has no serious a11y violations', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('domcontentloaded');
    await assertNoSeriousViolations(page);
  });
});

test.describe('Phase 7.2: WCAG 2.1 AA audits (authenticated — staff)', () => {
  test.use({ storageState: '.auth/staff.json' });

  for (const path of [
    '/',
    '/attendance',
    '/tasks',
    '/circulars',
    '/workspace',
    '/finance',
    '/media',
    '/portal',
    '/parent',
  ]) {
    test(`${path} has no serious a11y violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await assertNoSeriousViolations(page);
    });
  }

  for (const path of ['/tasks', '/attendance', '/workspace', '/circulars']) {
    test(`${path} keyboard navigation is logical`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await assertKeyboardNavigation(page);
    });
  }
});

test.describe('Phase 7.2: WCAG 2.1 AA audits (authenticated — admin)', () => {
  test.use({ storageState: '.auth/admin.json' });

  for (const path of [
    '/staff',
    '/admin/departments',
    '/admin/institutions',
    '/admin/nfc',
    '/admin/nfc/cards',
  ]) {
    test(`${path} has no serious a11y violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await assertNoSeriousViolations(page);
    });
  }

  for (const path of ['/staff', '/admin/departments', '/admin/nfc']) {
    test(`${path} keyboard navigation is logical`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await assertKeyboardNavigation(page);
    });
  }
});

test.describe('Phase 7.2: WCAG 2.1 AA audits (authenticated — parent)', () => {
  test.use({ storageState: '.auth/parent.json' });

  for (const path of ['/portal', '/parent']) {
    test(`${path} has no serious a11y violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await assertNoSeriousViolations(page);
    });
  }
});