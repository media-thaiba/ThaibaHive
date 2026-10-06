# Phase 1 Execution Plan: Canonical Capability Engine & Navigation Skeleton

> **Document Version**: 2.1 (OpenCode Refined)  
> **Status**: Approved & Execution-Ready  
> **Target Platforms**: Next.js Web (`src/`, `packages/auth`) & Flutter Mobile (`thaibahive_mobile_app/`)  

---

## 1. Executive Summary

Phase 1 establishes the architectural foundation for the **ThaibaHive Two-Tier Platform**:
1. Defines the strict **Capability Registry Schema** contract for cross-platform alignment.
2. Standardizes permissions into a unified `domain.resource.action` taxonomy with snapshot test harnesses.
3. Implements the **Capability Registry** with Tier metadata (`1: Native Mobile`, `2: Mobile Quick View`, `3: Web Only`).
4. Refactors the **Flutter Mobile Navigation** to a clean 3-4 tab skeleton (`Today`, `Services`, `My Hub`, `[Media]`).
5. Groups the **Next.js Web Navigation** into 4 dedicated Workspaces (`My Work`, `School`, `Operations`, `Administration`).
6. Builds the **ActionCenterTray** widget and Riverpod state controller for interactive approvals on `Today`.

---

## 2. Deliverables & Technical Specifications

```
Phase 1 Scope
├── Phase 1.0: Capability Registry Schema Contract (TS Interface & Schema)
├── Phase 1.1: Canonical Permission Codemod, Snapshot Harness & CI Gate
├── Phase 1.2: Capability Registry Implementation
├── Phase 1.3: Flutter Mobile Navigation Skeleton (3-4 Tabs)
├── Phase 1.4: Next.js Web Workspaces Grouping & Switcher
├── Phase 1.5: ActionCenterTray Interactive State Controller (Riverpod)
└── Phase 1.6: Automated Verification & CI Quality Gates
```

---

### Phase 1.0: Capability Registry Schema Contract

* **File Location**: `packages/auth/capability-schema.ts` & `docs/contracts/CAPABILITY_REGISTRY_SCHEMA.md`
* **Schema Contract**:
  ```typescript
  export type CapabilityTier = 1 | 2 | 3; // 1: Native Mobile, 2: Mobile Quick View, 3: Web Only

  export interface CapabilityDefinition {
    id: string;                      // e.g. "attendance.punch.create"
    label: string;                   // Human-readable action name
    description: string;             // Detailed purpose
    tier: CapabilityTier;            // 1: Native, 2: QuickView, 3: WebOnly
    offlineSupported: boolean;       // Can action be queued offline
    domain: "attendance" | "leaves" | "media" | "academic" | "finance" | "admin" | "services";
    webRoute?: string;               // e.g. "/academic/examinations"
    mobileRoute?: string;            // e.g. "/today" or "/services/canteen"
    requiresHandoff: boolean;        // If mobile should trigger Chrome Custom Tab nonce exchange
    impliedBy?: string[];            // Higher-level capabilities that imply this action
  }
  ```

---

### Phase 1.1: Canonical Permission Codemod, Snapshot Harness & CI Gate

* **Problem**: Permissions currently mix colons (`exam:enter_marks`) and dots (`marks.enter`).
* **Target Format**: `domain.resource.action` (e.g. `leave.request.approve`, `exam.marks.enter`, `attendance.punch.create`).
* **Implementation Details**:
  * File: `packages/auth/roles.ts`
  * Add bidirectional legacy alias resolver in `hasPermission(role, permission)` so existing route guards and tests continue passing during migration.
  * **Snapshot Test**: `packages/auth/__tests__/roles-snapshot.test.ts` to assert zero regressions across all 5 tiers and specialized roles.
  * **CI Audit Script**: `scripts/security/canonical-permission-audit.ts` scanning route handlers and Dart files to enforce canonical taxonomy.

---

### Phase 1.2: Capability Registry Implementation

* **File Location**: `packages/auth/capabilities.ts` & `src/lib/capabilities/registry.ts`
* **Core Helpers**:
  * `getCapability(id: string): CapabilityDefinition`
  * `isMobileEligible(capabilityId: string): boolean` (Returns `true` for Tier 1 & Tier 2)
  * `requiresWebHandoff(capabilityId: string): boolean` (Returns `true` for Tier 3 when triggered on mobile)
  * `can(userCapabilities: Set<string>, requiredCapability: string): boolean`

---

### Phase 1.3: Flutter Mobile Navigation Refactor (3–4 Tabs)

* **Files to Modify**:
  * `thaibahive_mobile_app/lib/app/router.dart`
  * `thaibahive_mobile_app/lib/shared/widgets/bottom_nav_bar.dart`
  * `thaibahive_mobile_app/lib/core/auth/capability_provider.dart`
* **Navigation Architecture**:
  ```
  Standard Staff:      [ Today ]  [ Services ]  [ My Hub ]
  Media Contributor:  [ Today ]  [ Media ]      [ Services ]  [ My Hub ]
  ```
* **Strict Router Boundaries**:
  * `/today` → Server-Driven UI Daily Hub.
  * `/services` → Campus Utility Catalog (Canteen ordering, Visitor gate pass, IT Helpdesk, Room bookings).
  * `/me/*` → Strictly "Things About Me" (Profile, ID card, attendance history, leave balance & requests, app settings).
  * `/media` → Dedicated Media Hub (Rendered conditionally if user has `media.asset.create` capability).

---

### Phase 1.4: Next.js Web Workspaces Navigation

* **Files to Modify**:
  * `src/config/navigation.ts`
  * `src/components/layout/sidebar-nav.tsx`
  * `src/components/layout/command-palette.tsx`
* **The 4 Workspace Rooms**:
  1. **🏠 My Work** (`/`, `/attendance`, `/leaves`, `/tasks`, `/reports`, `/canteen`)
  2. **🎓 School & Academics** (`/academic`, `/academic/students`, `/academic/classes`, `/examinations`)
  3. **💼 Operations & Finance** (`/finance`, `/finance/purchases`, `/finance/payroll`, `/assets`, `/vehicles`)
  4. **🛡️ Administration & Governance** (`/admin/agents`, `/admin/nfc`, `/admin/executive/analytics`, `/settings`)
* **Workspace Switcher & `Ctrl + K`**:
  * Add clean Workspace Dropdown switcher at top of sidebar.
  * Update Command Palette to group search results by workspace.

---

### Phase 1.5: ActionCenterTray Widget & Riverpod Controller

* **Files to Create**:
  * `thaibahive_mobile_app/lib/features/dashboard/presentation/widgets/action_center_tray.dart`
  * `thaibahive_mobile_app/lib/features/dashboard/presentation/controllers/action_center_controller.dart`
* **Responsibilities**:
  * Interactive bottom sheet / expandable tray on `Today`.
  * Manages approval queue states: `pendingCount`, `activeApprovals`, `isExpanded`.
  * Provides optimistic 1-tap `approve(id)` / `reject(id)` methods.

---

### Phase 1.6: Automated Verification & CI Quality Gates

* **Automated RBAC Audit**: Run `pnpm security:rbac` to guarantee 0 unmapped keys.
* **TypeScript Check**: `pnpm tsc --noEmit` exits with 0 errors across web and packages.
* **Flutter Static Analysis**: `flutter analyze` passes with zero critical errors.
* **Capability Unit Tests**: Verify tier resolution, permission inheritance, and mobile eligibility filtering.

---

## 3. Anti-Scope for Phase 1 (What We Will NOT Do)

* ❌ **Do NOT build the full offline attendance state machine in Phase 1** (Scheduled for Phase 3).
* ❌ **Do NOT build the two-phase media SQLite outbox in Phase 1** (Scheduled for Phase 4).
* ❌ **Do NOT delete or orphan existing deep routes** (Keep them accessible via push routing while shell transitions).

---

## 4. Acceptance Criteria

| Item | Criteria | Verification Method |
| :--- | :--- | :--- |
| **Capability Schema** | Typed schema with `tier`, `offline`, `webRoute`, `mobileRoute`, `requiresHandoff`. | TypeScript compilation |
| **Permission Taxonomy** | Canonical `domain.resource.action` with legacy alias support. | `roles-snapshot.test.ts` |
| **Mobile Navigation** | Bottom nav renders $\le 4$ tabs, dynamic on user capabilities. | Flutter widget test |
| **My Hub Boundary** | `/me/*` contains only personal data; utilities route to `/services/*`. | GoRouter test suite |
| **Web Workspaces** | Sidebar switches cleanly across the 4 rooms with permission gating. | Next.js E2E test |
| **ActionCenterTray** | Interactive approval tray renders on `Today` without cluttering bottom bar. | Flutter widget test |
