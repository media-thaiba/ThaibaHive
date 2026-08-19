// Note: Requires @axe-core/playwright to be installed via `pnpm add -D @axe-core/playwright`
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility audits', () => {
  test('login page has no critical a11y violations', async ({ page }) => {
    await page.goto('/auth/login');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical, `Critical a11y violations: ${JSON.stringify(critical.map((v) => v.id))}`).toHaveLength(0);
  });

  test('dashboard page has no critical a11y violations', async ({ page }) => {
    // Navigate to dashboard (will redirect to login if not authenticated)
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical, `Critical a11y violations: ${JSON.stringify(critical.map((v) => v.id))}`).toHaveLength(0);
  });
});
