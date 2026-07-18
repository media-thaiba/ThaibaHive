# Global Coding Conventions

These standards apply to every programming language, platform, and directory within the ThaibaHive ecosystem.

---

## 1. Naming Conventions
- **Components**: PascalCase (e.g. `AttendanceForm.tsx`, `DashboardCard.tsx`).
- **Utility Functions**: camelCase (e.g. `fetchStaffList.ts`, `calculateGracePeriod.ts`).
- **File Names**: kebab-case (e.g. `kebab-case.tsx` for components, `kebab-case.ts` for logic).
- **Database Tables & Columns**: snake_case (e.g. `attendance_logs`, `check_in_time`).
- **TypeScript Types & Interfaces**: PascalCase (e.g. `StaffRole`, `PermissionState`).
- **Constants**: SCREAMING_SNAKE_CASE (e.g. `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE`).

## 2. File Organization Rules
- **Length**: Maximum length of any file is 300 lines. Split into smaller sub-components or utilities if it grows beyond this threshold.
- **Imports**: Group systematically:
  1. External node modules/packages first.
  2. Internal absolute path aliases (e.g. `@/components/...`).
  3. Local relative imports (e.g. `./sub-item`).
- **Exports**: Use named exports exclusively for utility modules. Do not use default exports except when required by Next.js routing patterns (e.g., `export default function Page()`).

## 3. General Practices
- **No ts-ignore**: Fix compiler errors properly. Avoid `any` types.
- **No console.log**: Use the custom diagnostic logger rather than printing raw debugger scripts.
- **Single Component Per File**: Maintain clean modular separations.
