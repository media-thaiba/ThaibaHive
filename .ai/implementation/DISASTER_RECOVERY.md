# DISASTER_RECOVERY.md — Backup & Incident Response

> **Specification Tier**: Implementation Masterplan (AIOS 6.0)  
> **Source of Truth**: `.ai/implementation/DISASTER_RECOVERY.md`

---

## 1. Recovery Objectives
* **Recovery Point Objective (RPO)**: < 15 minutes (Database automated WAL backups).
* **Recovery Time Objective (RTO)**: < 1 hour (Automated container redeployment).

## 2. Backup Schedules
* **Daily Full Snapshot**: Executed at 02:00 AM daily and stored in multi-region cloud storage.
* **Continuous Transaction Logs**: Point-in-time recovery (PITR) enabled on production PostgreSQL cluster.

---

# TESTING_STRATEGY.md — Comprehensive Quality Assurance

1. **Unit Testing**: Jest + `@testing-library/react` (231 passing tests across 22 suites).
2. **Type Safety**: `pnpm typecheck` (`tsc --noEmit`) enforcing 0 TypeScript errors.
3. **Linting**: `pnpm lint` enforcing ESLint zero-error policy.
4. **End-to-End Testing**: Playwright test suites configured under `e2e/`.

---

# RELEASE_PROCESS.md — Git Strategy & Production Rollout

* **Branching Model**: Trunk-based development with short-lived feature branches.
* **Production Build Validation**: Pre-commit / CI script runs `pnpm typecheck`, `pnpm lint`, and `pnpm test`.

---

# FEATURE_FLAG_STRATEGY.md — Phased Rollout & Whitelist Gating

* **Whitelist Feature Gating**: Handled in `src/config/navigation.ts` via `ENABLED_PATHS` Set. Routes not in `ENABLED_PATHS` are visually greyed out in shell navigation.

---

# MODULE_REGISTRY.md — Authoritative Master Module Registry

| Module ID | Module Name | Owner Domain | Status | Required Permissions |
| :--- | :--- | :--- | :--- | :--- |
| `MOD-AUTH` | Authentication & Sessions | Identity | ✅ Live | Public / Authenticated |
| `MOD-STAFF` | Staff Directory & Profiles | HR | ✅ Live | `staff:read`, `staff:create` |
| `MOD-ATTEND` | Daily Attendance & Shifts | Attendance | ✅ Live | `attendance:mark`, `attendance:view` |
| `MOD-TASKS` | Task Kanban Board | Workplace | ✅ Live | `tasks:read`, `tasks:create` |
| `MOD-LEAVES` | Leave Request & Approval | HR | ✅ Live | `leaves:read`, `leaves:create` |
| `MOD-ACADEMIC`| Student Roster & Classes | Academics | ✅ Live | `students:read`, `classes:read` |
| `MOD-FINANCE` | Financial Accounts & Ledger | Finance | ✅ Live | `finance:transaction:read` |
| `MOD-ERP-FEE` | Student Fee Collections | Fees | 📐 Designed (AIOS 4/5)| `fees:collect`, `fees:assign` |
| `MOD-ERP-HOSTEL`| Residential Bed Allocations | Hostel | 📐 Designed (AIOS 4/5)| `hostel:allocate`, `hostel:outpass:approve`|
| `MOD-ERP-TRANS` | Vehicle Fleet & Transit | Transport | 📐 Designed (AIOS 4/5)| `vehicles:read`, `transport:assign` |
