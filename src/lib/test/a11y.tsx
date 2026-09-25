import * as React from "react";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";

type RunOptions = NonNullable<Parameters<typeof axe>[1]>;

/**
 * WCAG 2.1 AA accessibility gate helpers (Phase 7 / 7.2).
 *
 * - `expectNoA11yViolations` runs axe-core against a rendered subtree and
 *   asserts zero violations using `toHaveNoViolations` (extended globally in
 *   `jest.setup.ts`).
 * - `renderForAxe` returns a `container` pointer suitable for `axe()`.
 *
 * jsdom cannot compute layout, so color-contrast checks surface as
 * "incomplete" rather than violations; they are intentionally verified by the
 * Playwright-based browser audit (`scripts/a11y/accessibility-audit.ts` and
 * `e2e/accessibility.spec.ts`).
 */
export function renderForAxe(ui: React.ReactElement) {
  return render(ui);
}

export async function expectNoA11yViolations(
  container: HTMLElement,
  options?: RunOptions
): Promise<void> {
  const results = await axe(container, options);
  expect(results).toHaveNoViolations();
}

export { axe };