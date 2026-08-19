# ACCESSIBILITY_CHECKLIST.md — WCAG 2.1 AA Verification Checklist

- [ ] All interactive elements accessible via keyboard (`Tab`, `Enter`, `Space`, `Escape`).
- [ ] Mobile touch targets meet minimum `44px x 44px` boundaries (`pointer: coarse`).
- [ ] Text elements meet 4.5:1 contrast ratios in light and dark modes.
- [ ] Icon buttons have explicit `aria-label` attributes.
- [ ] Form inputs have associated `<Label htmlFor="...">` elements.
- [ ] Animations respect `prefers-reduced-motion` settings.

---

# UX_CHECKLIST.md — Experience Layer Consistency Checklist

- [ ] Page uses role workspace structure (`/workspace/[role]`) rather than plain CRUD table menu.
- [ ] UI components sourced from `@/components/ui/` (`Button`, `Input`, `Select`, `Dialog`).
- [ ] Loading states display `<Skeleton>` layout placeholders—no "Loading..." text.
- [ ] Status badges use semantic variants (`success`, `warning`, `destructive`, `info`, `secondary`).
- [ ] Empty state tables render an icon, help message, and primary call-to-action button.
- [ ] User actions display feedback toasts via `sonner` (`toast.success` / `toast.error`).

---

# TESTING_CHECKLIST.md — Pre-Commit Testing Checklist

- [ ] `pnpm typecheck` executed (`tsc --noEmit`) ──► Returns 0 errors.
- [ ] `pnpm lint` executed ──► Returns 0 errors.
- [ ] `pnpm test` executed ──► All 231 tests pass across 22 suites.
- [ ] API routes verified with `requireAuth` guards.
- [ ] Queries verified with `institutionId` scoping.

---

# DEPLOYMENT_CHECKLIST.md & RELEASE_CHECKLIST.md — Release Readiness

- [ ] Production environment variables configured (`DB_URL`, `JWT_SECRET`, `SUPABASE_*`).
- [ ] Dual-schema SQL migration scripts verified.
- [ ] Security headers active in Next.js proxy middleware.
- [ ] Build succeeds cleanly via `pnpm build`.
