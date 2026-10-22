# Phase 005: Bundle Size Optimization

## Objective
Reduce browser bundle size by optimizing imports, replacing heavy libraries with native alternatives, and configuring lazy loading.

## Acceptance Criteria
- [ ] `lodash` replaced with native JS equivalents
- [ ] `date-fns` replaced with native JS where possible
- [ ] `lucide-react` imports optimized (verify `optimizePackageImports` works)
- [ ] Bundle analyzer shows reduced size
- [ ] No functionality regressions

## Tasks

### 5.1 Audit Current Bundle
**Command:** `ANALYZE=true pnpm build`
**Output:** `analyze/` directory with bundle visualization
**Action:** Identify largest chunks and duplicate modules

### 5.2 Replace `lodash` with Native JS
**Search:** `grep -r "from 'lodash'" src/ --include="*.ts" --include="*.tsx"`
**Common replacements:**
| Lodash | Native JS |
|--------|-----------|
| `_.debounce` | Custom implementation or `use-debounce` hook |
| `_.throttle` | Custom implementation |
| `_.cloneDeep` | `structuredClone()` |
| `_.get` / `_.set` | Optional chaining `obj?.prop` |
| `_.isEmpty` | `Object.keys(obj).length === 0` |
| `_.uniq` | `[...new Set(arr)]` |
| `_.groupBy` | `arr.reduce((acc, item) => {...}, {})` |

**Files to check:**
- `src/lib/utils.ts` (may use lodash)
- `src/hooks/use-debounce.ts` (already custom)
- Store files (zustand)

### 5.3 Replace `date-fns` with Native JS
**Search:** `grep -r "from 'date-fns'" src/ --include="*.ts" --include="*.tsx"`
**Replacements:**
| date-fns | Native JS |
|----------|-----------|
| `format(date, 'PP')` | `date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })` |
| `formatDistanceToNow` | Custom `timeAgo` (already in `utils.ts:52-67`) |
| `parseISO` | `new Date(str)` |
| `isValid` | `!isNaN(date.getTime())` |
| `addDays` / `subDays` | Custom date arithmetic |

**Note:** `utils.ts` already has `formatDate`, `formatDateTime`, `formatTime`, `timeAgo` - use these instead.

### 5.4 Verify `optimizePackageImports` for `lucide-react`
**File:** `next.config.ts:59-70`
**Current:** `"lucide-react"` in `optimizePackageImports`
**Check:** Next.js 16.3+ automatically transforms barrel imports
**Action:** Verify build output shows direct imports
**If not working:** Consider manual direct imports for critical paths

### 5.5 Audit `@radix-ui` Package Count
**File:** `package.json:89-114`
**Current:** 20+ `@radix-ui/react-*` packages
**Action:** Check if all are used
**Command:** `grep -r "@radix-ui" src/ --include="*.ts" --include="*.tsx" | cut -d'/' -f3 | sort -u`
**Remove unused packages**

### 5.6 Add Dynamic Imports for Heavy Components
**Candidates:**
- Chart components (`recharts`) - `src/components/workspaces/widgets/analytics-charts.tsx`
- Workflow Studio (`@xyflow/react`) - `src/components/workflow-studio/workflow-studio-canvas.tsx`
- Digital Twin (`three.js` if used) - `src/components/twin/`
- Media components (FFmpeg, video players)

**Pattern:**
```tsx
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), { 
  ssr: false,
  loading: () => <Skeleton className="h-64" />
});
```

### 5.7 Configure `next/dynamic` for Non-Critical Features
**File:** `src/app/(shell)/page.tsx` - Already does for LeaveDialog, TaskDialog
**Extend to:** Admin-only components, Operation-heavy widgets

### 5.8 Run Bundle Analysis Again
**Command:** `ANALYZE=true pnpm build`
**Compare:** Before/after bundle sizes
**Target:** 20%+ reduction in main chunk

## Dependencies
- Phase 001 (React 19) - may affect bundling
- Phase 002 (Cache Components) - may change chunking

## Risk Assessment
- **Medium:** `lodash`/`date-fns` replacements must match exact behavior
- **Low:** Dynamic imports for non-critical features
- **Mitigation:** Comprehensive test coverage for date/utility functions

## Verification
- [ ] `ANALYZE=true pnpm build` shows reduced bundle size
- [ ] No `lodash` or `date-fns` in main chunk
- [ ] All date formatting works correctly (Indian locale)
- [ ] Dynamic imports load correctly on interaction
- [ ] `pnpm test` passes
- [ ] Lighthouse performance score improved