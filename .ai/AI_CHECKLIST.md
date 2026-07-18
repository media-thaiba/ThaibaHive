# AI Checklist — Session Verification

Always complete this checklist before ending a coding session.

---

## 1. Quality & Code Verification
- [ ] **Types Compile**: Ensure no TypeScript compilation errors exist. Run `npm run build` or `pnpm build` if requested.
- [ ] **Lint Check**: Run standard lint checks (`pnpm lint` or `eslint`) to confirm syntax aligns.
- [ ] **No Console Log**: Remove all debugging `console.log()` statements from production files. Use diagnostic logging wrappers instead.
- [ ] **Zero Unresolved TODOs**: Ensure no temporary test mockups or comment TODOs are left in modified source files.

## 2. Platform Compliance
- [ ] **Web conventions**: Replaced raw inputs/buttons with custom primitives, imports use `@/` paths, fetches caught correctly.
- [ ] **Permissions Check**: Ensured any new API routes are wrapped with `requireAuth` and have associated RBAC checks.
- [ ] **Mobile Stability**: Confirmed Flutter components are unaffected and use Riverpod state structures exclusively.

## 3. Context Maintenance
- [ ] **Update Project State**: Reflected any changes in `PROJECT_STATE.json` if necessary.
- [ ] **Update Current Task**: Marked finished items in `CURRENT_TASK.md` and detailed next sprint items.
- [ ] **Update Handoff**: Wrote target instructions inside `HANDOFF.md`.
- [ ] **Update Changelog**: Logged modifications inside `CHANGELOG.md`.
