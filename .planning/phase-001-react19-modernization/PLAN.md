# Phase 001: React 19 Modernization

## Objective
Modernize the codebase for React 19 by removing legacy patterns (`forwardRef`, `useContext`) and adopting new APIs (`use()`, ref as prop).

## Acceptance Criteria
- [ ] All `forwardRef` wrappers removed from UI primitives
- [ ] All `useContext(Context)` replaced with `use(Context)`
- [ ] No TypeScript errors after changes
- [ ] All tests pass
- [ ] No runtime regressions in component refs

## Tasks

### 1.1 Remove `forwardRef` from Input Component
**File:** `src/components/ui/input.tsx`
**Current:** Lines 4-20 use `React.forwardRef`
**Change:** Convert to regular component with `ref` as prop
```tsx
// Before
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
// After
export function Input({ className, type, ref, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
```

### 1.2 Remove `forwardRef` from Button Component
**File:** `src/components/ui/button.tsx`
**Current:** Lines 42-55 use `ButtonPrimitive` with `forwardRef` internally
**Change:** Update to use `ref` as regular prop (check `@base-ui/react/button` compatibility)

### 1.3 Replace `useContext` with `use()` in ThemeContext
**File:** `src/contexts/ThemeContext.tsx:92-98`
**Current:** `const context = useContext(ThemeContext);`
**Change:** `const context = use(ThemeContext);`

### 1.4 Replace `useContext` with `use()` in AuthContext
**File:** `src/contexts/AuthContext.tsx:149-155`
**Current:** `const context = useContext(AuthContext);`
**Change:** `const context = use(AuthContext);`

### 1.5 Replace `useContext` with `use()` in WorkspaceContext
**File:** `src/contexts/WorkspaceContext.tsx` (check for useContext usage)
**Action:** Search and replace all `useContext` calls

### 1.6 Verify Ref Forwarding Still Works
**Test:** Components using `ref` on Input/Button (e.g., `DesktopSideNav` logo ref, `CommandPalette` input ref)
**Files to check:**
- `src/components/layout/desktop-side-nav.tsx:91-100` (logo img ref)
- `src/components/layout/command-palette.tsx` (if exists)

### 1.7 Run TypeScript Check
**Command:** `pnpm typecheck`
**Expected:** Zero errors

### 1.8 Run Test Suite
**Command:** `pnpm test`
**Expected:** All tests pass

## Dependencies
- React 19.2.4 (already in package.json)
- No breaking changes expected

## Risk Assessment
- **Low:** React 19 `use()` and ref-as-prop are backward compatible
- **Medium:** `@base-ui/react` ButtonPrimitive may need version check
- **Mitigation:** Test each component individually after changes

## Verification
- [ ] TypeScript compiles without errors
- [ ] All existing tests pass
- [ ] Manual smoke test: login, dashboard, sidebar navigation
- [ ] Ref-dependent features work (focus management, scroll into view)