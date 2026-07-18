# System Guardrails — AI Constraints

To prevent expensive regression errors, refactoring loops, or infrastructure breakage, any AI assistant working on this codebase **must** adhere to the following rules:

---

## ⛔ NEVER

1. **Delete Database Migrations**: Do not remove, rename, or manually edit any SQL files inside the `drizzle/` directory. All changes must be done via `drizzle-kit generate`.
2. **Modify Auth Setup without Approval**: Do not alter `packages/auth` encryption algorithms, secret configurations, or session structures unless explicitly instructed.
3. **Change Database Schema unilaterally**: Do not modify tables in `packages/db/schema.ts` without detailing the exact migrations plan first.
4. **Rename Directories**: Do not change folder structures or move files across major root scopes (e.g. from `packages/` to `src/`).
5. **Install Redundant Libraries**: Do not add new NPM or Flutter packages that compete with the existing stack (e.g. no `axios`, no `moment`, no `provider` package). Use native equivalents or libraries already in `package.json`/`pubspec.yaml`.
6. **Hardcode Status Colors**: Never hardcode colors for status indicators (e.g. green for approved, red for rejected). Always use `<Badge variant="success|warning|destructive|info|secondary">`.
7. **Write Raw Modal Overlays**: Never write custom `fixed inset-0 z-50` wrappers. Always import and use standard `<Dialog>` primitives.

---

## ✅ ALWAYS

1. **Keep Imports Organized**: Group imports systematically (External → Internal `@/` → Relative `./`).
2. **Sort Out Types**: Fix type mismatches properly. Never use `@ts-ignore` or `@ts-expect-error` or escape-hatch `any`.
3. **Check Array Types Safely**: Always import and use `ensureArray` from `@/lib/utils` rather than custom `Array.isArray` wrappers to prevent type errors.
4. **Catch Fetches**: Ensure all `useEffect` fetch paths have a terminal `.catch()` block to resolve loading screens and avoid stuck interfaces.
5. **Maintain Documentation Integrity**: Preserve existing docstrings, parameters, and comments. Update Hand-off and Project State files before finishing.
