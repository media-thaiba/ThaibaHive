# ADR 0005: Biometric Attendance Projection Filtering & Trusted Metric Boundaries

**Status:** Accepted  
**Date:** 2026-10-30  
**Domain:** Attendance, Biometrics & Payroll Ingestion  
**Decision Drivers:** Payroll accuracy, fraud prevention, auditability, multi-tenant concurrency  

---

## Context and Problem Statement

The architectural review highlighted two consistency and data-integrity defects in `src/lib/attendance/sync-engine.ts`:
1. **Polluted Authoritative Projections:** `firstIn`, `lastOut`, and `totalMinutes` in `attendanceDays` and `attendanceLogs` were derived indiscriminately from all punches. Even when events were marked with `mock_location`, `clock_skew`, or `geofence_violation`, their timestamps directly determined first/last times and worked hours. Consequently, payroll algorithms ingesting `attendanceDays` credited fraudulent or skewed hours.
2. **All-Flagged Day Edge Case:** If an employee submitted only mock or invalid punches on a given day, naive calculation would either credit the mock punch span or calculate broken durations.

## Decision

We enforce **Strict Trusted Punch Partitioning**:
1. **Trusted Metric Boundary:**
   - Authoritative `firstIn`, `lastOut`, and worked session intervals (`totalMinutes`) are computed exclusively from **trusted punches** (free of `mock_location`, `clock_skew`, or `geofence_violation` flags).
   - Flagged events remain safely recorded in the immutable `attendanceEvents` ledger for auditability and supervisor review.
2. **All-Flagged Day Handling:**
   - If a day contains events but zero trusted punches, the system sets:
     - `firstIn: null`
     - `lastOut: null`
     - `totalMinutes: 0`
     - `status: "absent"`
     - `needsReview: true` with review reason `"all_punches_flagged"`
   - Prevents unverified hours from propagating into salary/payroll calculations.
3. **Optimistic Concurrency & Idempotent Upsert:**
   - Concurrent sync batches for the same `(staffId, localDate)` rely on the unique composite index `(staffId, localDate)` with fail-closed insert-or-update fallback, ensuring safe deterministic convergence without SQLite file-lock deadlocks.

## Consequences

### Positive
- Payroll and HR reporting receive strictly validated hours.
- Automated anomaly detection surfaces suspicious activity immediately (`needsReview: true`) while protecting the ledger.
- 100% test pass rate across all concurrency and edge-case sync scenarios (18/18 tests passing).

### Negative / Trade-offs
- An employee whose device legitimately suffers severe clock skew must have their punch manually verified or regularized by a supervisor.
