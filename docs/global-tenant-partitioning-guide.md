# Global Multi-Tenant Partitioning & Regional Isolation Guide

**Sprint Reference:** SPRINT-035 (v3.19.0)  
**Classification:** Enterprise Architecture & Data Governance Manual  
**Last Updated:** 2026-08-19  

---

## 1. Multi-Region Tenant Partitioning Architecture

ThaibaHive organizes institutional data with geographic affinity across regional database pools:
- `us-east`: Americas institutional region
- `eu-central`: Europe / Middle East institutional region
- `ap-south`: Asia-Pacific institutional region
- `default`: Global primary default pool

Tenant routing is managed transparently via `TenantRouter` in `packages/db` and middleware resolver `src/middleware/tenant-region.ts`.

---

## 2. Dynamic Query Routing & Tenant Isolation

```
Request with x-institution-id: "inst-101"
              │
              ▼
   [Next.js Middleware] ─── Resolve Region ───► Injects "x-tenant-region: eu-central"
              │
              ▼
   [TenantRouter.getTenantDb()] ─── Selects "eu-central" Database Pool
              │
              ▼
   [TenantGuard.validateScope()] ─── Verifies institutionId boundary
```

### Runtime Guardrail
`TenantGuard.validateScope(context, targetInstitutionId)` validates that tenant operators cannot query or mutate records belonging to a foreign institution. If a violation is attempted, `TenantIsolationError` is raised immediately.

---

## 3. Zero-Downtime Tenant Migration

To migrate an institution from one region pool to another:

### Automated Migration API:
```bash
POST /api/system/tenant/migrate
Authorization: Bearer <super_admin_jwt>
Content-Type: application/json

{
  "tenantId": "inst-101",
  "targetRegion": "eu-central"
}
```

### Migration Stages:
1. **Acquire Read-Only Lock:** The tenant is briefly placed into read-only mode (< 5.0 seconds).
2. **Replicate Dataset:** Tables (`institutions`, `users`, `departments`, `financeTransactions`, `auditLogs`) are synchronized to the destination pool.
3. **Parity Check:** SHA-256 table checksums are verified between source and destination.
4. **Atomic Cutover:** `tenantRouter.migrateTenantRegion(tenantId, newRegion)` updates the routing key.
5. **Release Lock:** Tenant read/write capability is restored on the new regional pool.

---

## 4. Static Isolation Integrity Scanner

Run the automated tenant isolation scanner across the codebase:
```bash
pnpm security:tenants
```
Outputs report to `reports/tenant-isolation-report.json`. Blocks CI if un-scoped multi-tenant queries are detected.
