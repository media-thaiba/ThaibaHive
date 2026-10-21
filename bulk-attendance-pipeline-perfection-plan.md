# Bulk Student Class Attendance Pipeline — Perfection Plan

## Vulnerabilities Identified

### 1. Missing Authorization
**File:** `src/app/api/academic/attendance/bulk/route.ts`
- `requireAuth(async (request, _session) => { ... })` called without permission string
- Should require `"student_attendance:manage"`

### 2. Missing Rate Limiting
- No `checkRateLimit` on the bulk attendance endpoint
- Should use `checkRateLimit(session.staffId, "write")`

### 3. Unsafe JSON Parsing
- `await request.json()` without try/catch
- Crashes with 500 on malformed/empty payloads

### 4. No Batch Size Limit
- `records: z.array(...).min(1)` has no `.max(500)`
- Unbounded payload risk

### 5. No Date Validation
- `date: z.string().min(1)` doesn't validate `YYYY-MM-DD` format

### 6. No Student Enrollment Verification
- Doesn't verify students in `records` are actually enrolled in the class
- Could mark attendance for students not in the class

### 7. No Authorization Check
- No check if caller has permission to manage this class's attendance
- No institutional boundary check

### 7. No Concurrency Control
- No mutex for batch operations
- Race conditions possible on concurrent bulk submissions

### 8. No Multi-Tenant Isolation
- No institutional boundary enforcement
- Cross-tenant data access possible

### 9. No Batch Size Limit
- `records: z.array(...).min(1)` has no `.max(500)`

---

## Hardening Plan

### 1. Add Zod Schemas (`src/lib/validation/schemas.ts`)
- `bulkAttendanceSchema` with:
  - `classId: z.string().min(1)`
  - `date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`
  - `records: z.array(recordSchema).min(1).max(500)`
  - `recordSchema` with studentId, status enum, optional reason

### 2. Create Ledger Module (`src/lib/academic-attendance/ledger.ts`)
- `withAttendanceBulkLock(classId, date, fn)` - per-class-date mutex
- `verifyClassAttendancePermission(session, classId)` - authorization check
- `verifyStudentEnrollment(classId, studentIds)` - enrollment verification

### 3. Harden Route (`src/app/api/academic/attendance/bulk/route.ts`)
- Add `requireAuth(..., "student_attendance:manage")`
- Add `checkRateLimit(session.staffId, "write")`
- Safe JSON parsing with try/catch
- Schema validation with new schema
- Batch size limit (500)
- Date format validation (YYYY-MM-DD regex)
- Multi-tenant scoping via `resolveInstitutionContext`
- Authorization check via `canManageClassAttendance`
- Student enrollment verification
- Per-class-date mutex (`withAttendanceBulkLock`)
- Structured audit logging

### 5. Create Hardening Test Suite
- Safe JSON parsing tests
- Rate limiting test
- Batch size limit test
- Date format validation
- Cross-tenant isolation
- Student enrollment verification
- Concurrency serialization
- Duplicate prevention (upsert behavior)

---

## Implementation Order
1. Add Zod schemas to `schemas.ts`
2. Create `src/lib/academic-attendance/ledger.ts`
3. Harden `src/app/api/academic/attendance/bulk/route.ts`
4. Create test suite
5. Run all gates (ESLint, TypeScript, tests, security scans)
7. Commit