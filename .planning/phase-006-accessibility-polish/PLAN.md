# Phase 006: Accessibility & UX Polish

## Objective
Address accessibility gaps and UX inconsistencies identified in the audit per Web Interface Guidelines.

## Acceptance Criteria
- [ ] All interactive elements have proper ARIA labels
- [ ] Color contrast meets WCAG AA in both themes
- [ ] Toast notifications have `aria-live`
- [ ] Focus management works correctly
- [ ] Reduced motion respected
- [ ] `axe-core` audit passes

## Tasks

### 6.1 Add `aria-live` to Toast Container
**File:** `src/app/(shell)/layout.tsx:77`
**Current:** `<Toaster position="top-right" richColors />`
**Change:** Ensure `sonner` Toaster renders with `aria-live="polite"`
**Check:** `sonner` docs - may need `<Toaster aria-live="polite" />` or config

### 6.2 Verify Dark Mode Color Contrast
**File:** `src/app/globals.css:106-168`
**Issue:** `--muted-foreground: 215 20% 65%` on `--muted: 215 25% 22%` = ~4.5:1 (borderline)
**Action:** Adjust tokens for better contrast
```css
/* Option: Increase muted-foreground lightness */
--muted-foreground: 215 20% 72%;  /* ~5.5:1 ratio */
```
**Test:** Use contrast checker on all token combinations

### 6.3 Audit Focus Visible Styles
**File:** `src/app/globals.css:12-15, 410-416`
**Current:** Good focus rings on all elements
**Check:** Custom components (StatCard, SidebarLink, PermissionGate) inherit focus styles
**Test:** Tab through entire app, verify focus visible

### 6.4 Add Missing ARIA Labels
**File:** `src/components/layout/desktop-side-nav.tsx:153-169`
**Current:** Collapse button has `aria-label` ✓
**File:** `src/components/layout/shell-nav.tsx:107-117`
**Current:** Search button has `aria-label` ✓
**File:** `src/components/ui/dropdown-menu.tsx` (check)
**Action:** Audit all icon-only buttons for `aria-label`

### 6.5 Verify Skip Link Works
**File:** `src/app/(shell)/layout.tsx:38-40`
**Current:** `<a href="#main-content" className="skip-link">`
**File:** `src/app/(shell)/layout.tsx:60-65`
**Target:** `<main id="main-content">` ✓
**Test:** Tab from address bar, verify skip link appears and works

### 6.6 Run `axe-core` Automated Audit
**Command:** `pnpm test:a11y` (configured in package.json:23)
**Or:** `pnpm a11y:audit` (package.json:24)
**Expected:** Zero critical/serious violations

### 6.7 Test Reduced Motion
**File:** `src/app/globals.css:428-436`
**Current:** `@media (prefers-reduced-motion: reduce)` disables animations
**Test:** Enable "Reduce motion" in OS settings, verify:
- Framer Motion animations disabled
- CSS transitions disabled
- No layout shift

### 6.8 Verify Touch Target Sizes
**File:** `src/app/globals.css:418-426`
**Current:** `@media (pointer: coarse)` sets 44px min
**Check:** All interactive elements meet 44x44px on mobile
**Test:** Mobile viewport, check button/link sizes

### 6.9 Audit Heading Hierarchy
**Files:** All page components
**Check:** `h1` → `h2` → `h3` proper nesting
**Tool:** `axe-core` or manual inspection

### 6.10 Form Label Association
**File:** `src/app/auth/login/_components/login-form.tsx`
**Check:** All inputs have associated `<label>` or `aria-label`
**File:** `src/components/ui/input.tsx` - forwardRef removed in Phase 001, verify labels work

## Dependencies
- Phase 001 (React 19) - ref changes may affect label association

## Risk Assessment
- **Low:** Mostly additive changes (ARIA attributes, CSS tweaks)
- **Medium:** Color token changes affect entire app visual consistency
- **Mitigation:** Visual regression testing after token changes

## Verification
- [ ] `pnpm test:a11y` passes with zero critical issues
- [ ] Manual keyboard navigation works end-to-end
- [ ] Screen reader test (NVDA/VoiceOver) on key flows
- [ ] Color contrast ratios all ≥ 4.5:1 (AA)
- [ ] Reduced motion respected
- [ ] Touch targets ≥ 44px on mobile