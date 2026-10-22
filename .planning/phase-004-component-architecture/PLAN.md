# Phase 004: Component Architecture Improvements

## Objective
Refactor components to use compound component patterns, reduce boolean prop proliferation, and improve reusability per Vercel Composition Patterns.

## Acceptance Criteria
- [ ] `StatCard` converted to compound component
- [ ] `PermissionGate` usage simplified
- [ ] No boolean prop proliferation in new components
- [ ] Existing functionality preserved
- [ ] Tests pass

## Tasks

### 4.1 Convert StatCard to Compound Component
**File:** `src/components/dashboard/stat-card.tsx` (need to read first)
**Current:** Single component with many props (`label`, `value`, `suffix`, `progress`, `href`, `icon`, `color`, `id`)
**New Structure:**
```tsx
const StatCard = Object.assign(function StatCard({ children, ...props }) {
  return <div className="...">{children}</div>;
}, {
  Label: function StatCardLabel({ children }) { return <dt className="...">{children}</dt>; },
  Value: function StatCardValue({ children }) { return <dd className="...">{children}</dd>; },
  Progress: function StatCardProgress({ value, ...props }) { return <Progress value={value} {...props} />; },
  Icon: function StatCardIcon({ children }) { return <div className="...">{children}</div>; },
  Action: function StatCardAction({ href, children }) { return <a href={href} className="...">{children}</a>; },
});
```

**Usage in Dashboard:**
```tsx
<StatCard>
  <StatCard.Label>Staff Present</StatCard.Label>
  <StatCard.Value>{data?.todayPresent} / {data?.staffCount}</StatCard.Value>
  <StatCard.Progress value={data?.todayPresent / data?.staffCount} />
  <StatCard.Icon><Users className="h-4 w-4" /></StatCard.Icon>
  <StatCard.Action href="/admin/attendance-locations">View</StatCard.Action>
</StatCard>
```

### 4.2 Audit PermissionGate Boolean Props
**File:** `src/components/ui/permission-gate.tsx`
**Current:** Accepts `permission`, `anyOf`, `anyRole`, `fallback`
**Issue:** Multiple ways to specify permissions - confusing
**Action:** Document preferred patterns, consider simplifying API

### 4.3 Extract Inline PermissionGates to Named Components
**File:** `src/app/(shell)/page.tsx:162-172`
**Current:** Inline `<PermissionGate anyRole={[...]} fallback={null}><StatCard /></PermissionGate>`
**Action:** Create wrapper components for common permission patterns
```tsx
function AdminOnlyStatCard({ children }) {
  return (
    <PermissionGate anyRole={["super_admin", "admin", "principal", "hod"]} fallback={null}>
      {children}
    </PermissionGate>
  );
}
```

### 4.4 Add `content-visibility` to Sidebar Items
**File:** `src/components/layout/desktop-side-nav.tsx:139-146`
**Change:** Add CSS class to `SidebarLink` for off-screen optimization
```tsx
<SidebarLink
  key={item.href}
  item={item}
  active={activeHref === item.href}
  collapsed={collapsed}
  className="content-visibility-auto"  // Add this
/>
```
**CSS:** Add to `globals.css` or use Tailwind `content-visibility-auto`

### 4.5 Hoist Static Loading Skeletons
**File:** `src/app/(shell)/page.tsx:113-130`
**Current:** Loading skeletons created inline in render
**Change:** Move to module level constants
```tsx
// Module level
const DashboardSkeleton = (
  <div className="flex-1 space-y-8 p-6 lg:p-8">
    <Skeleton className="h-8 w-64" />
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-28" />)}
    </div>
    ...
  </div>
);

// In component
if (loading) return DashboardSkeleton;
```

### 4.6 Narrow Effect Dependencies in ShellNav
**File:** `src/components/layout/shell-nav.tsx:46-74`
**Current:** Inline `onClick` creates new function each render
**Change:** Extract to `useCallback` or separate component
```tsx
const handleWorkspaceSwitch = useCallback((w: WorkspaceConfig) => {
  const targetHref = w.id === "my-work" ? "/" : `/${w.id}`;
  setWorkspace(w.id);
  router.push(targetHref);
}, [setWorkspace, router]);

// In map
onClick={() => handleWorkspaceSwitch(w)}
```

### 4.7 Verify All Changes
**Commands:**
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Dependencies
- Phase 001 (React 19) for `use()` context access

## Risk Assessment
- **Medium:** StatCard refactor changes public API
- **Low:** Other changes are internal optimizations
- **Mitigation:** Update all StatCard usages in one PR

## Verification
- [ ] StatCard compound component works in Dashboard
- [ ] All existing StatCard usages updated
- [ ] PermissionGate patterns documented
- [ ] `content-visibility` applied to sidebar
- [ ] Loading skeletons hoisted
- [ ] Effect dependencies narrowed
- [ ] All tests pass