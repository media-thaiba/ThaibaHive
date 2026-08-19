# DATABASE_GUIDE.md — Physical Database Architecture & Data Philosophy

> **Specification Tier**: Physical Architecture Blueprint (AIOS 5.0)  
> **Source of Truth**: `.ai/database/DATABASE_GUIDE.md`  
> **Standards Alignment**: Google Spanner / PostgreSQL Enterprise Architecture / Microsoft SQL Server Blueprint

---

## 1. Database Philosophy & Architectural Strategy

ThaibaHive Institution OS uses a **Relational Modular Core with Hybrid Persistence Flexibility**. The database architecture is designed to support both local single-file development (`dev.db` via SQLite) and distributed enterprise cloud deployments (PostgreSQL / libSQL) using a dual-dialect schema model.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                APPLICATION LAYER (Drizzle ORM)                         │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
┌──────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
│  LOCAL DEV ENVIRONMENT (SQLite)          │    │  ENTERPRISE PRODUCTION (PostgreSQL)      │
│  - Single-file (dev.db)                  │    │  - Multi-node Managed Database Cluster   │
│  - Driver: better-sqlite3                │    │  - Driver: @libsql/client / pg           │
│  - Schema: packages/db/schema.ts         │    │  - Schema: packages/db/schema.pg.ts      │
└──────────────────────────────────────────┘    └──────────────────────────────────────────┘
```

---

## 2. Normalization & Extension Table Strategy

### 2.1 Third Normal Form (3NF) Core
Master identity, financial ledgers, and operational registers are normalized to 3NF to guarantee zero data redundancy and eliminate update anomalies.

### 2.2 Extension Table Pattern (1:1 Relationships)
To prevent bloat in core master tables (`students`, `staff`), domain-specific capabilities are attached via 1:1 extension tables referencing the primary key:
* `students` (Core Identity Master) ──1:1──► `hostel_boarders` (Hostel Attributes)
* `students` (Core Identity Master) ──1:1──► `transport_passengers` (Transit Attributes)
* `students` (Core Identity Master) ──1:1──► `library_members` (Circulation Attributes)

---

## 3. Row-Level Tenancy & Isolation Model

Multi-institution isolation is strictly enforced at the physical row level:
1. Every operational database table MUST include `institution_id text NOT NULL REFERENCES institutions(id)`.
2. All select, update, and delete queries MUST append `WHERE institution_id = ?`.
3. Cross-institution aggregate queries are restricted to Super Admin or Group Chairman BI dashboards.

---

## 4. Transaction Boundaries & Concurrency Control

### 4.1 Transaction Boundaries
* **Financial Ledger Posting**: Multi-statement transactions posting to `financial_transactions`, `fee_invoices`, and `fee_receipts` MUST execute within an atomic ACID transaction.
* **Bulk Attendance Registers**: Register upserts (`student_attendance_logs`) and summary calculations (`attendance_register`) MUST execute atomically.

### 4.2 Optimistic Locking Pattern
High-concurrency entities (e.g., class capacities, room bed allocations) utilize optimistic locking via an integer `version` or timestamp `updated_at` column to prevent lost updates:

```
UPDATE classes 
SET name = ?, version = version + 1 
WHERE id = ? AND version = ?
```

If zero rows are updated, the transaction aborts and throws an Optimistic Lock Conflict (HTTP 409).

---

## 5. Soft Delete & Archival Strategy

1. **Soft Delete Rule**: Master tables (`staff`, `students`, `classes`, `institutions`) NEVER execute physical `DELETE` statements. Soft deletion is marked via `is_active = 0` (SQLite) / `false` (PG) or an ISO timestamp `deleted_at`.
2. **Archival Strategy**: Audit logs (`audit_log`) and historical attendance logs older than 7 years are automatically moved to cold storage compressed archive partitions.

---

## 6. Read vs. Write Model & Future Sharding Strategy

* **Current State**: Single primary database handling both reads and writes, with TanStack Query client-side response caching.
* **Scale-Out Target**:
  * **Read Replicas**: Distribute heavy BI reporting and dashboard read queries to secondary read-only replicas.
  * **Sharding Key**: `institution_id` serves as the natural shard key for future horizontal database sharding across group campuses.
