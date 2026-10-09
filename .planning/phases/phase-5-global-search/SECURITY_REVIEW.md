# Phase 5: Global Search & Omnibox Command Center — Security & Backend Architecture Review

**Review Date**: 2026-10-09  
**Reviewed Files**: 
- `src/lib/api/global-search/service.ts`
- `src/app/api/search/route.ts`
- `src/lib/validation/schemas.ts` (globalSearchSchema)
- `packages/db/schema.ts` (relevant table definitions)
- `packages/auth/institution-scope.ts` (resolveScopedInstitutionId pattern)

---

## Summary of Findings

| Severity | Count |
|----------|-------|
| **Critical** | 3 |
| **High** | 3 |
| **Medium** | 2 |
| **Low** | 1 |
| **Total** | **9** |

---

## Detailed Findings

---

### 1. [CRITICAL] Tenant Isolation Not Enforced in Global Search Service

**Location**: `src/lib/api/global-search/service.ts` (lines 17-206)

**Issue**: The `globalSearch()` function queries 5+ tables (`students`, `staff`, `tasks`, `events`, `announcements`) **without any `institutionId` scoping**. This allows any authenticated user to search across **all institutions' data**, violating multi-tenant isolation.

**Evidence**:
- No call to `resolveScopedInstitutionId()` anywhere in the service
- Queries use `.select().from(table).where(ilike(...))` with no tenant predicate
- Other routes (e.g., `src/app/api/tasks/route.ts:181`, `src/app/api/visitors/route.ts:61`) correctly use:
  ```typescript
  const institutionId = await resolveScopedInstitutionId(session.institutionId);
  // then: .where(and(eq(table.institutionId, institutionId), ilike(...)))
  ```

**Impact**: Cross-tenant data leakage — a staff member at Institution A can search and see students, staff, tasks, events from Institution B.

**Fix Required**:
```typescript
import { resolveScopedInstitutionId } from "@thaiba/auth";
// In globalSearch(), accept session and resolve scope:
const institutionId = await resolveScopedInstitutionId(session.institutionId);
// Add to every query:
.where(and(eq(students.institutionId, institutionId), or(ilike(...))))
```

---

### 2. [CRITICAL] Data Leakage — Sensitive Fields Returned in Search Results

**Location**: `src/lib/api/global-search/service.ts` (lines 38-123)

**Issue**: All queries use `.select()` which returns **full entity rows**, including highly sensitive fields:

| Table | Sensitive Fields Exposed |
|-------|-------------------------|
| `staff` | `passwordHash`, `faceEmbedding`, `fingerprintHash`, `aadhaar`, `pan`, `bankAccount`, `ifscCode`, `tokenVersion`, `nfcTagId`, `biometricStatus`, `modelVersion` |
| `students` | `faceEmbedding`, `nfcTagId`, `qrCode`, `emergencyContactName`, `emergencyContactPhone`, `bloodGroup`, `address` |
| `tasks` | No direct secrets but may contain PII in description |
| `events`/`announcements` | Generally safe but `content` may contain internal info |

**Impact**: Search results leak biometric templates, government IDs, banking details, password hashes — **severe PII/credential exposure**.

**Fix Required**: Use explicit column selection (projections) via `.select({ id: table.id, firstName: table.firstName, ... })` for each entity type. Define a `GlobalSearchResultRow` type per entity with only safe fields.

---

### 3. [CRITICAL] DoS Vector — Unbounded `LIMIT 999999` with `skipPagination = true`

**Location**: `src/lib/api/global-search/service.ts` (lines 23, 49, 68, 85, 103, 120)

**Issue**: 
```typescript
const skipPagination = true; // Hardcoded!
.limit(skipPagination ? 999999 : limit)
```

- **999,999 rows per entity type** × 5+ types = **~5M rows** per request
- Parallel execution (5+ concurrent queries) with **no timeout**
- No query budget, no max execution time, no row budget
- `getSearchSuggestions()` also uses `.limit(5)` but no scope

**Impact**: Single request can exhaust database connections, memory, and CPU. Trivial to DoS the entire search endpoint.

**Fix Required**:
1. Remove `skipPagination` entirely — enforce pagination always
2. Hard cap: `limit = Math.min(parsedLimit, 20)` (match PLAN.md target: 10 web / 8 mobile)
3. Add query timeout via `Promise.race()` or database statement timeout
4. Implement query budget: max 100 total rows across all entity types per request

---

### 4. [HIGH] Insufficient Input Validation — Query Length & Sanitization

**Location**: `src/lib/validation/schemas.ts` (lines 396-401)

**Current Schema**:
```typescript
q: z.string().min(1, "Search query is required"),
```

**Issues**:
- No `max()` length — allows arbitrarily long queries (DoS via massive ILIKE patterns)
- No character allowlist — permits `%`, `_` wildcards that expand search scope
- No sanitization for control characters

**Impact**: Attacker can send 10KB+ query causing full-table scans on all 5+ tables simultaneously.

**Fix Required**:
```typescript
q: z.string()
  .min(1, "Search query is required")
  .max(100, "Query too long")           // Prevent DoS
  .regex(/^[\p{L}\p{N}\s\-@.]+$/u, "Invalid characters") // Allowlist
  .transform(s => s.replace(/[%_]/g, "")), // Escape wildcards if needed
```

---

### 5. [HIGH] No Rate Limiting on Search Endpoints

**Location**: `src/app/api/search/route.ts` (lines 1-159)

**Issue**: Neither `GET /api/search` nor `GET /api/search/suggestions` uses the existing rate limiting infrastructure (`src/lib/api/rate-limit.ts`).

**Comparison**: Other routes correctly apply rate limiting:
- `src/app/api/tasks/route.ts:173` → `checkRateLimit(..., "read")`
- `src/app/api/expense-claims/route.ts:61` → `checkRateLimit(..., "write")`
- `src/app/api/upload/route.ts:45` → `checkRateLimit(...)`

**Impact**: Unlimited search requests per user/IP — enables enumeration, scraping, DoS.

**Fix Required**:
```typescript
import { checkRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";

export const GET = requireAuth(async (request: Request, session) => {
  const ip = extractIp(request);
  const rl = checkRateLimit(`${session.staffId}:${ip}`, "read"); // or new "search" config
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);
  // ... rest of handler
}, "profile:read");
```

Add `"search": { windowMs: 60_000, max: 30, keyPrefix: "search" }` to `DEFAULT_CONFIGS`.

---

### 6. [HIGH] Missing Database Indexes on Searchable Columns

**Location**: `packages/db/schema.ts` (table definitions)

**Issue**: The global search uses `ILIKE` on these columns, but **no indexes exist** for them:

| Table | Searchable Columns (from service) | Current Indexes | Missing Indexes |
|-------|-----------------------------------|-----------------|-----------------|
| `staff` | `firstName`, `lastName`, `email`, `employeeId` | `email` (unique), `employeeId` (unique), `nfcTagId` (unique) | **`firstName`, `lastName`** |
| `students` | `firstName`, `lastName`, `admissionNo`, `email` | `admissionNo` (unique w/ institution), `classId`, `institutionId`, `nfcTagId` | **`firstName`, `lastName`, `email`** |
| `tasks` | `title`, `description` | `assignedToId+status`, `departmentId`, `institutionId` | **`title`, `description`** |
| `events` | `title`, `description`, `eventType` | **None on searchable columns** | **`title`, `description`, `eventType`** |
| `announcements` | `title`, `content` | `createdAt+isActive` | **`title`, `content`** |

**Impact**: Every search query performs **sequential scans** on large tables. With 10K+ rows, p95 latency will exceed 300ms target; with 100K+ rows, will timeout.

**Fix Required**: Add indexes in a migration:
```sql
-- SQLite (packages/db/schema.ts)
staffNameIdx: index("idx_staff_name").on(t.firstName, t.lastName),
studentNameIdx: index("idx_students_name").on(t.firstName, t.lastName),
studentEmailIdx: index("idx_students_email").on(t.email),
taskTitleIdx: index("idx_tasks_title").on(t.title),
eventTitleIdx: index("idx_events_title").on(t.title),
announcementTitleIdx: index("idx_announcements_title").on(t.title),
-- For PostgreSQL: use GIN trigram indexes for ILIKE performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_staff_name_trgm ON staff USING GIN (firstName gin_trgm_ops, lastName gin_trgm_ops);
-- ... similarly for other tables
```

---

### 7. [MEDIUM] Permission Model — Wrong Permission Key

**Location**: `src/app/api/search/route.ts` (line 56)

**Current**: `requireAuth(handler, "profile:read")`

**Issue**: `"profile:read"` implies access to *own* profile. Global search crosses **all entity types** (students, staff, tasks, events, announcements, finance, assets, etc.) — it's a **cross-cutting capability** requiring explicit authorization.

**Impact**: 
- Staff with `profile:read` (basically all staff) get global search access
- No way to restrict search to specific roles (e.g., only `admin`+`principal` can search students)
- Audit trail cannot distinguish "viewed own profile" vs "searched all students"

**Fix Required**: 
1. Add new permission: `"search:global"` in `packages/auth/roles.ts`
2. Map to appropriate roles: `super_admin`, `admin`, `principal`, `hod` (not `staff` by default)
3. Update route: `requireAuth(handler, "search:global")`
4. Add RBAC test in `packages/auth/__tests__/rbac-5tier-matrix.test.ts`

---

### 8. [MEDIUM] Search Suggestions Also Lack Tenant Scoping & Rate Limiting

**Location**: `src/lib/api/global-search/service.ts` (lines 208-235), `src/app/api/search/route.ts` (missing suggestions endpoint)

**Issue**: 
- `getSearchSuggestions()` queries `students` and `staff` **without institutionId**
- No suggestions endpoint exists in route.ts yet (PLAN.md mentions adding it)
- Same data leakage and DoS concerns apply

**Fix Required**: Apply same fixes as main search — tenant scoping, projections, rate limiting, query limits.

---

### 9. [LOW] Error Handling Swallows Errors Silently

**Location**: `src/lib/api/global-search/service.ts` (lines 202-205)

**Issue**:
```typescript
} catch (error) {
  console.error("Global search error:", error);
  return results; // Returns empty arrays — caller sees "success" with no data
}
```

**Impact**: 
- Database errors (timeouts, connection failures) return empty results instead of 500
- Frontend shows "no results" instead of error state
- No observability — errors only in server logs

**Fix Required**: Re-throw or return structured error; let `requireAuth` wrapper handle 500 response.

---

## Recommended Implementation Priority

| Priority | Fix | Effort |
|----------|-----|--------|
| **P0 (Blocker)** | Add `resolveScopedInstitutionId` to all queries | 2h |
| **P0 (Blocker)** | Add explicit column projections (strip sensitive fields) | 2h |
| **P0 (Blocker)** | Remove `skipPagination`, enforce hard limits (≤20/type) | 1h |
| **P0 (Blocker)** | Add rate limiting to `/api/search` and `/api/search/suggestions` | 1h |
| **P1** | Add missing DB indexes (migration + pg_trgm for Postgres) | 3h |
| **P1** | Strengthen Zod schema (max length, allowlist) | 30m |
| **P2** | Add `search:global` permission + RBAC mapping | 1h |
| **P2** | Fix error handling to propagate errors | 30m |
| **P3** | Apply same fixes to `getSearchSuggestions` | 1h |

---

## Verification Gates to Add to PLAN.md

Add these to the Verification Gates section (line 149+):

```markdown
9. **Tenant Isolation Test**: `pnpm security:tenants` → 100% isolated (must pass)
10. **RBAC Test**: `pnpm security:rbac` → `search:global` mapped correctly
11. **Rate Limit Test**: Manual/automated test → 429 after 30 req/min
12. **Data Leakage Test**: Unit test asserting `passwordHash`, `faceEmbedding`, `aadhaar` absent from results
13. **Index Verification**: `EXPLAIN QUERY PLAN` shows index usage for search queries
14. **Load Test**: 100 concurrent searches → p95 < 300ms, no 5xx errors
```

---

## Sign-Off Requirements

Before Phase 5 implementation begins, the following must be resolved:

- [ ] **Security Lead**: Tenant scoping + data leakage + DoS fixes approved
- [ ] **Backend Lead**: Index migration + query optimization plan approved  
- [ ] **Tech Lead**: `search:global` permission model approved
- [ ] **QA**: Verification gates added to PLAN.md and test cases written