# DATABASE_CERTIFICATION.md — Physical Database Readiness Certification

> **Specification Tier**: Quality Assurance Framework (AIOS 9.0)  
> **Source of Truth**: `.ai/quality/DATABASE_CERTIFICATION.md`

* **Dual Schema Parity**: Verifies that any table or column addition in `packages/db/schema.ts` (SQLite) is mirrored in `packages/db/schema.pg.ts` (PostgreSQL).
* **Index Strategy Verification**: Verifies explicit indexes exist on foreign key columns and composite unique indexes enforce business rules.

---

# UX_CERTIFICATION.md — Workspace & Experience Layer Certification

* **Workspace First Rule**: Verifies users land on intent-driven Workspaces (`/workspace/[role]`) rather than plain CRUD table menus.
* **Primitive Reuse**: Verifies UI components are built from `@/components/ui/` primitives (`Button`, `Input`, `Select`, `Dialog`).
* **Loading Skeleton Parity**: Verifies loading states use layout-matching `<Skeleton>` shimmers.

---

# SECURITY_CERTIFICATION.md — Security & OWASP Alignment Certification

* **OWASP Top 10 Alignment**: Verifies protection against SQL injection (parameterized Drizzle ORM queries), XSS (React automatic escaping), and CSRF (`httpOnly` cookies).
* **Cryptographic Vault Verification**: Verifies facial embeddings are stored encrypted via AES-256-GCM (`iv:authTag:ciphertext`).

---

# PERFORMANCE_CERTIFICATION.md — Performance & SLA Certification

* **Latency Benchmark Tests**: Verifies API endpoints satisfy p95 latency bounds (< 15ms auth, < 40ms stats).
* **Query Efficiency Audit**: Verifies list queries enforce pagination (`limit=20`) and contain zero N+1 SQL queries.

---

# ACCESSIBILITY_CERTIFICATION.md — WCAG 2.1 AA Compliance Certification

* **Keyboard Operability**: Verifies all workspace views and modals are fully operable using `Tab`, `Enter`, `Space`, and `Escape`.
* **Mobile Touch Targets**: Verifies interactive targets satisfy minimum `44px x 44px` dimensions.
