# Phase 1: Canonical Capability Engine & Navigation Skeleton

**Milestone**: ThaibaHive Two-Tier Platform  
**Phase**: 1 of 5  
**Status**: Planning  
**Estimated Duration**: 2 days (1.0: 0.5d, 1.1: 1.5d)  
**Dependencies**: None (foundational phase)

---

## Phase 1.0: Capability Registry Schema (0.5 days)

### Objective
Define the **single source of truth** for all capabilities across Mobile, Web, and Backend. This schema drives routing, offline behavior, and tier classification.

### Deliverables

#### 1. TypeScript Interface (`src/lib/capabilities/types.ts`)
```typescript
export type CapabilityTier = 1 | 2 | 3;

export interface CapabilityRegistryEntry {
  /** Canonical permission string: domain.resource.action */
  id: string;
  /** Human-readable description for UI tooltips */
  description: string;
  /** Tier classification per architecture spec */
  tier: CapabilityTier;
  /** Whether this capability works offline (Tier 1 only) */
  offline: boolean;
  /** Mobile route path (null if Tier 3 web-only) */
  mobileRoute: string | null;
  /** Web workspace route path */
  webRoute: string;
  /** Whether Tier 3 web handoff requires Chrome Custom Tab + nonce */
  requiresHandoff: boolean;
  /** Roles that implicitly have this capability (for quick reference) */
  impliedRoles: StaffRole[];
  /** Whether this capability shows in Quick Actions catalog */
  quickAction: boolean;
  /** Category for Services catalog grouping */
  serviceCategory?: 'canteen' | 'gate-pass' | 'helpdesk' | 'booking' | 'attendance' | 'media' | 'leave';
}
```

#### 2. JSON Schema (`src/lib/capabilities/schema.json`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "description", "tier", "offline", "mobileRoute", "webRoute", "requiresHandoff", "impliedRoles", "quickAction"],
    "properties": {
      "id": { "type": "string", "pattern": "^[a-z]+\\.[a-z]+\\.[a-z]+$" },
      "description": { "type": "string", "minLength": 10 },
      "tier": { "type": "integer", "enum": [1, 2, 3] },
      "offline": { "type": "boolean" },
      "mobileRoute": { "type": ["string", "null"], "pattern": "^(/[a-z-]+)+$" },
      "webRoute": { "type": "string", "pattern": "^(/[a-z-]+)+$" },
      "requiresHandoff": { "type": "boolean" },
      "impliedRoles": { "type": "array", "items": { "type": "string" } },
      "quickAction": { "type": "boolean" },
      "serviceCategory": { "type": ["string", "null"], "enum": ["canteen", "gate-pass", "helpdesk", "booking", "attendance", "media", "leave"] }
    },
    "additionalProperties": false
  }
}
```

#### 3. Initial Registry Data (`src/lib/capabilities/registry.ts`)
- Populate with **all 500+ permissions** from `packages/auth/roles.ts` mapped to canonical `domain.resource.action` format
- Each entry validated against schema at build time
- Export `CAPABILITY_REGISTRY: CapabilityRegistryEntry[]` and helper `getCapability(id)`, `getCapabilitiesByTier(tier)`, `getQuickActions(roles)`

### Verification
- [ ] `schema.json` validates against JSON Schema Draft 7
- [ ] `registry.ts` passes `ajv` validation at compile time
- [ ] All 500+ permissions from `roles.ts` accounted for (audit script)
- [ ] No duplicate `id` values
- [ ] Tier 1 capabilities all have `offline: true` and `mobileRoute` non-null
- [ ] Tier 3 capabilities all have `requiresHandoff: true` and `mobileRoute: null`

---

## Phase 1.1: Canonical Permission Codemod + Snapshot Test + CI Gate (1.5 days)

### Objective
Automatically rewrite all permission strings across the codebase to canonical `domain.resource.action` format, with safety nets to prevent regressions.

### Scope of Transformation

| Location | Current Format(s) | Target Format |
|----------|-------------------|---------------|
| `packages/auth/roles.ts` | `exam:enter_marks`, `marks.enter`, `exam.marks.enter` | `exam.marks.enter` |
| API routes (`src/app/api/**/route.ts`) | `requireAuth(handler, 'exam:enter_marks')` | `requireAuth(handler, 'exam.marks.enter')` |
| Flutter `can()` calls | `can('exam:enter_marks')` | `can('exam.marks.enter')` |
| Middleware/guards | `hasPermission(role, 'marks.enter')` | `hasPermission(role, 'exam.marks.enter')` |

### Implementation Steps

#### 1.1.1: Build Codemod Script (`scripts/codemod/canonical-permissions.ts`)
```typescript
// Uses ts-morph for TS/TSX, regex for Dart
// Reads mapping from packages/auth/roles.ts DOT_TO_COLON_MAP + manual overrides
// Dry-run mode by default; --apply writes changes
// Outputs: changed files list, unmapped permissions report
```

#### 1.1.2: Mapping Strategy
- **Automated**: Use existing `DOT_TO_COLON_MAP` + reverse lookup
- **Manual override file**: `scripts/codemod/manual-overrides.json` for ambiguous cases
- **Validation**: Every transformed permission must exist in `CAPABILITY_REGISTRY`

#### 1.1.3: Snapshot Test (`packages/auth/__tests__/permissions-snapshot.test.ts`)
```typescript
// Captures: before/after roles.ts permission arrays
// Fails if: any permission string doesn't match ^[a-z]+\\.[a-z]+\\.[a-z]+$
// Fails if: any permission in roles.ts not in CAPABILITY_REGISTRY
// Fails if: any CAPABILITY_REGISTRY entry not granted to at least one role
```

#### 1.1.4: Grep Audit Script (`scripts/codemod/audit-permissions.sh`)
```bash
#!/bin/bash
# Scans for non-canonical patterns:
#   - requireAuth\(.*['"][^'"]*[:.][^'"]*['"]
#   - can\(['"][^'"]*[:.][^'"]*['"]
#   - hasPermission\(.*['"][^'"]*[:.][^'"]*['"]
# Exits 1 if any matches found (excluding test files)
```

#### 1.1.5: CI Gate (`.github/workflows/ci.yml` addition)
```yaml
- name: Verify Canonical Permissions
  run: |
    pnpm codemod:permissions --dry-run
    pnpm test:permissions-snapshot
    bash scripts/codemod/audit-permissions.sh
```

### Verification Checklist
- [ ] Codemod runs without errors on full codebase
- [ ] Snapshot test passes (before/after diff reviewed)
- [ ] Grep audit returns 0 matches
- [ ] CI gate passes on PR
- [ ] No runtime auth failures in local dev (manual smoke test)
- [ ] All 473 API routes use canonical permissions
- [ ] All Flutter `can()` calls use canonical permissions

---

## Cross-Phase Safeguards (Baked In)

| Safeguard | Phase | Implementation |
|-----------|-------|----------------|
| **Canonical Permission Codemod** | 1.1 | Automated rewrite + snapshot test + CI gate |
| **Capability Registry with Tier Metadata** | 1.0 | Schema + registry + validation |
| **Strict My Hub Route Linting** | 1.3 | Custom ESLint rule + GoRouter guard |
| **Single Binary Invariant** | 1.3 | CI check: `flutter analyze` + entry-point count |

---

## File Tree After Phase 1

```
src/
├── lib/
│   └── capabilities/
│       ├── types.ts           # TypeScript interfaces
│       ├── schema.json        # JSON Schema (Draft 7)
│       ├── registry.ts        # CAPABILITY_REGISTRY + helpers
│       └── index.ts           # Public exports
├── app/
│   └── api/
│       └── mobile/
│           └── today-hub/
│               └── route.ts   # Stub for Phase 2 (returns 200 OK)

thaibahive_mobile_app/
├── lib/
│   ├── app/
│   │   └── router.dart        # 3-4 dynamic tabs + ActionCenterTray stub
│   └── features/
│       └── action_center/
│           ├── controller.dart # Riverpod ActionCenterController
│           └── tray.dart       # ActionCenterTray widget

scripts/
├── codemod/
│   ├── canonical-permissions.ts
│   ├── manual-overrides.json
│   └── audit-permissions.sh

.github/
└── workflows/
    └── ci.yml                 # Updated with canonical permissions gate
```

---

## Acceptance Criteria (Phase 1 Complete)

1. **Schema & Registry**: `CAPABILITY_REGISTRY` covers 100% of permissions in `roles.ts`, validated at build
2. **Codemod**: All permission strings in codebase use `domain.resource.action` format
3. **Tests**: Snapshot test + grep audit + CI gate all pass
4. **Mobile Router**: 3-4 dynamic tabs render based on user capabilities; `ActionCenterTray` widget exists
5. **Web Navigation**: 4 Workspace sidebar scaffold with `Ctrl+K` placeholder
6. **No Regressions**: All existing auth tests pass; manual login flow works for all roles

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Codemod misses edge cases | Medium | High | Manual overrides file + grep audit + snapshot test |
| Registry drifts from roles.ts | Low | High | Build-time validation; CI fails on mismatch |
| Flutter router breaks existing nav | Medium | Medium | Feature flag `new_nav` behind `--dart-define`; rollback in 1 commit |
| Web workspace breaks existing pages | Low | Medium | Scaffold only; no page migration in Phase 1 |

---

## Next Phase Dependencies

Phase 2 (SDUI Today Hub) requires:
- `CAPABILITY_REGISTRY` for `QuickActionResolver` tier filtering
- Mobile `ActionCenterTray` controller for badge counts
- Web workspace routes for deep-link targets

---

## Sign-Off

- [ ] Tech Lead: Schema design reviewed
- [ ] Security: Permission mapping audited
- [ ] Mobile Lead: Router approach approved
- [ ] Web Lead: Workspace scaffold approved