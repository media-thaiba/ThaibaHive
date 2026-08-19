# ER_DIAGRAMS.md — Logical Entity Relationship Diagrams

> **Specification Tier**: Physical Architecture Blueprint (AIOS 5.0)  
> **Source of Truth**: `.ai/database/ER_DIAGRAMS.md`

---

## 1. Identity & Staff Architecture ERD

```
┌──────────────────┐       1:N       ┌─────────────────────┐       M:N       ┌──────────────────┐
│   institutions   ├─────────────────┤  staff_institutions ├─────────────────┤      staff       │
└────────┬─────────┘                 └─────────────────────┘                 └────────┬─────────┘
         │                                                                            │
         │ 1:N                                                                        │ 1:N (via Junction)
         │                                                                            │
┌────────┴─────────┐                 ┌─────────────────────┐                 ┌────────┴─────────┐
│   departments    ├─────────────────┤  staff_departments  ├─────────────────┤   departments    │
└──────────────────┘       1:N       └─────────────────────┘       N:1       └──────────────────┘
```

---

## 2. Student & Academic Architecture ERD

```
┌──────────────────┐       1:N       ┌─────────────────────┐       1:N       ┌──────────────────┐
│   academic_years ├─────────────────┤       classes       ├─────────────────┤     students     │
└──────────────────┘                 └─────────────────────┘                 └────────┬─────────┘
                                                                                      │
                                                                                      │ 1:N
                                                                             ┌────────┴─────────┐
                                                                             │student_guardians │
                                                                             └────────┬─────────┘
                                                                                      │ N:1
                                                                             ┌────────┴─────────┐
                                                                             │    guardians     │
                                                                             └──────────────────┘
```

---

## 3. Financial & Fee Architecture ERD

```
┌──────────────────┐       1:N       ┌──────────────────────────┐
│   institutions   ├─────────────────┤  financial_transactions  │
└────────┬─────────┘                 └──────────────────────────┘
         │
         │ 1:N
┌────────┴─────────┐       1:N       ┌──────────────────────────┐       1:N       ┌──────────────────┐
│     students     ├─────────────────┤       fee_invoices       ├─────────────────┤   fee_receipts   │
└──────────────────┘                 └──────────────────────────┘                 └──────────────────┘
```

---

# SCHEMA_EVOLUTION.md — Zero-Downtime Schema Evolution Standard

## 1. Migration Protocol
1. **Never Drop Columns directly**: Renaming or dropping columns requires a 2-phase deployment (Deprecate -> Dual Write -> Drop in N+1 release).
2. **Additive-First Changes**: Adding columns MUST provide default values or accept NULLs to support running code during zero-downtime rolling deployments.
3. **Migration Scripts**: Generated via `drizzle-kit generate` and stored under `drizzle/`.
