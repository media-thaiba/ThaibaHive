# INDEX_STRATEGY.md — Physical Indexing & Performance Blueprint

> **Specification Tier**: Physical Architecture Blueprint (AIOS 5.0)  
> **Source of Truth**: `.ai/database/INDEX_STRATEGY.md`

---

## 1. Indexing Philosophy

Indexes are applied strategically to optimize high-frequency read queries (workspaces, dashboards, universal search) while maintaining fast write performance. Every foreign key column MUST be indexed.

---

## 2. Core Index Categories

### 2.1 Composite Unique Indexes (Business Uniqueness)
* `idx_students_inst_admission_no`: ON `students(institution_id, admission_no)` — Guarantees admission number uniqueness within an institution.
* `idx_student_attendance_student_date`: ON `student_attendance_logs(student_id, date)` — Prevents duplicate daily attendance logs.
* `idx_attendance_register_class_date`: ON `attendance_register(class_id, date)` — Ensures one register summary per class per date.
* `idx_student_guardians_uniq`: ON `student_guardians(student_id, guardian_id)` — Prevents duplicate parent links.
* `idx_leave_balances_uniq`: ON `leave_balances(staff_id, leave_type_id, year)` — Prevents duplicate annual leave allocations.

### 2.2 Foreign Key Performance Indexes
* `idx_students_class`: ON `students(class_id)` — Accelerates class roster queries.
* `idx_students_institution`: ON `students(institution_id)` — Enforces tenant query filtering speed.
* `idx_staff_departments_staff_id`: ON `staff_departments(staff_id)`.
* `idx_staff_institutions_inst_id`: ON `staff_institutions(institution_id)`.
* `idx_financial_transactions_inst_date`: ON `financial_transactions(institution_id, transaction_date)` — Optimizes financial ledger reporting.

---

# TENANCY_MODEL.md — Physical Multi-Tenancy Architecture

## 1. Multi-Tenant Architecture Pattern
ThaibaHive OS uses **Row-Level Shared Database Multi-Tenancy**. All campuses within the group share the central database cluster, with logical data isolation enforced via `institution_id`.

## 2. Row Security Protocol
* Every write query MUST populate `institution_id`.
* Every API Route Handler wrapped in `requireAuth` extracts `session.institutionId` and appends `eq(table.institutionId, session.institutionId)` to the query builder.
