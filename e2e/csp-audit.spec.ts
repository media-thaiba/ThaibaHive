import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const pagesToTest = [
  { name: 'login', path: '/auth/login', auth: null },
  { name: 'portal home', path: '/portal/tgcis', auth: null },
  { name: 'staff list', path: '/staff', auth: 'admin' },
  { name: 'tasks', path: '/tasks', auth: 'admin' },
  { name: 'attendance', path: '/attendance', auth: 'admin' },
  { name: 'leaves', path: '/leaves', auth: 'admin' },
  { name: 'finance', path: '/finance', auth: 'admin' },
  { name: 'media', path: '/media', auth: 'admin' },
  { name: 'admin', path: '/admin', auth: 'admin' },
  { name: 'settings', path: '/settings', auth: 'admin' },
];

test.describe('U2: Content Security Policy Audit on 10 Critical Pages', () => {
  for (const pageConfig of pagesToTest) {
    test(`page [${pageConfig.name}] (${pageConfig.path}) has zero CSP violations`, async ({ browser }) => {
      const storageStatePath = pageConfig.auth
        ? path.resolve(process.cwd(), `.auth/${pageConfig.auth}.json`)
        : undefined;

      const context = await browser.newContext({
        storageState: storageStatePath && fs.existsSync(storageStatePath) ? storageStatePath : undefined,
      });

      const page = await context.newPage();
      const cspViolations: string[] = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (
          text.toLowerCase().includes('content security policy') ||
          text.toLowerCase().includes('violates the following content security policy') ||
          text.toLowerCase().includes('refused to') ||
          text.toLowerCase().includes('csp')
        ) {
          cspViolations.push(text);
        }
      });

      page.on('pageerror', (err) => {
        if (err.message.toLowerCase().includes('content security policy')) {
          cspViolations.push(err.message);
        }
      });

      const response = await page.goto(pageConfig.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
      expect(response?.status()).toBeLessThan(400);

      // Verify CSP header presence
      const cspHeader = response?.headers()['content-security-policy'];
      expect(cspHeader).toBeDefined();
      expect(cspHeader).toContain("default-src 'self'");

      // Allow micro-animations and client hydration
      await page.waitForTimeout(1000);

      expect(cspViolations, `CSP Violations detected on ${pageConfig.path}: ${cspViolations.join('; ')}`).toHaveLength(0);

      await context.close();
    });
  }
});
