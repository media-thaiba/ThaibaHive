# Agent Working Rules & Safety Boundaries

## 1. File Modification & Revert Restrictions
- **Explicit Scope Boundary:**
  The active task scope for this engineering work is strictly limited to:
  1. Sheet component & physics (`src/components/ui/sheet.tsx`, `src/lib/motion.ts`, `src/lib/sheet-physics.ts`).
  2. Apple Design UI primitives & typography (`src/components/ui/badge.tsx`, `src/components/ui/button.tsx`, `src/components/ui/table.tsx`, `src/components/chat/message-input.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/layout/Providers.tsx`).
  3. Edge proxy `/dev/` gate & SSR 404 handler (`src/proxy.ts`, `src/app/dev/sheet-harness/page.tsx`).
  4. Test suites & fixture verification (`src/components/ui/__tests__/*`, `src/lib/__tests__/sheet-physics.test.ts`, `src/lib/__tests__/middleware.test.ts`, `src/app/dev/sheet-harness/__tests__/*`, `e2e/sheet-touch.spec.ts`).
  5. Smoke gate scripts & CI workflow (`scripts/smoke-prod-404.mjs`, `scripts/start-playwright-server.js`, `playwright.config.ts`, `package.json`, `.github/workflows/ci.yml`).
  6. Audit records & runbooks (`docs/audits/*`).

- **Forbidden Actions on Out-of-Scope Files:**
  - **NEVER** run `git checkout`, `git restore`, `git reset`, or `git clean` on files outside this scope (e.g., `packages/db/*`, `packages/auth/*`, `src/app/api/finance/*`, `thaibahive_mobile_app/*`).
  - **NEVER** run `git stash` to hide or displace uncommitted user work.
  - If an unrelated file causes a typecheck or build error, **STOP AND INFORM THE USER IMMEDIATELY**. Never modify, revert, or hide tracked files outside the designated scope.

## 2. Sandbox Boundary & Permission Safeguards
- **Never bypass the sandbox on a blocked command:**
  If a command is blocked by sandbox permissions, file locks, or environment isolation, **DO NOT** automatically escalate or retry the command with `BypassSandbox: true` without explicit instruction from the user. Report the blocked command and await consent.
