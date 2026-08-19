# COMPLIANCE_MATRIX.md — Master Architecture Compliance Matrix

> **Specification Tier**: Quality Assurance Framework (AIOS 9.0)  
> **Source of Truth**: `.ai/quality/COMPLIANCE_MATRIX.md`

---

## 1. Compliance Matrix Mapping (AIOS 3.0 to AIOS 8.0)

| AIOS Layer | Architectural Mandate | Evidence / Artifact | Validation Method | Status |
| :--- | :--- | :--- | :--- | :---: |
| **AIOS 3.0** | 100 Non-Negotiable Rules | `.ai/05_AI_RULES.md` | Static Code Audit & ARB Review | ✅ Enforced |
| **AIOS 3.1** | 100 Cross-Domain Recipes | `.ai/automation/recipes.md` | Automation Engine Test Suite | ✅ Enforced |
| **AIOS 4.0** | 30 Enterprise Business Domains | `.ai/domains/*.md` | Domain Capability Verification | ✅ Enforced |
| **AIOS 5.0** | Dual DB Schema Parity | `schema.ts` == `schema.pg.ts` | Dual-Schema Diff Validator | ✅ Enforced |
| **AIOS 5.0** | Stateless API Guards | `requireAuth(handler, permission)`| API AST Scanner | ✅ Enforced |
| **AIOS 6.0** | Monorepo Package Boundaries | `packages/auth`, `packages/db` | Import Boundary Scanner | ✅ Enforced |
| **AIOS 7.0** | Non-Irreversible AI Safety | `.ai/governance/AI_GOVERNANCE.md`| AI Playbook Safety Audit | ✅ Enforced |
| **AIOS 8.0** | Engineering Definition of Done| `.ai/engineering/DEFINITION_OF_DONE.md`| Pre-Merge CI Pipeline | ✅ Enforced |

---

# TRACEABILITY_MATRIX.md — Full Requirement Traceability Matrix

```
Business Requirement ──► Domain Spec (.ai/4.0) ──► Physical DB Schema (.ai/5.0)
                                                          │
                                                          ▼
Test Suite Execution ◄── Implementation (.ai/6.0) ◄── REST API Contract (.ai/5.0)
         │
         ▼
Production Release ──► Audit Log Entry (.ai/audit_log) ──► ARB Certification (.ai/9.0)
```

---

# REQUIREMENTS_CATALOG.md — Unique Architectural Requirement Catalog

## 1. Catalog ID Conventions
* `REQ-ARCH-xxxx`: System Architecture Requirements.
* `REQ-SEC-xxxx`: Security, Authentication & Cryptography Requirements.
* `REQ-DB-xxxx`: Database, Schema & Multi-Tenancy Requirements.
* `REQ-API-xxxx`: API Contract & Response Requirements.
* `REQ-UX-xxxx`: Experience Layer, Workspace & Accessibility Requirements.
* `REQ-AI-xxxx`: Ambient AI Safety & Anomaly Requirements.

## 2. Core Requirements Index
* `REQ-ARCH-0001`: System MUST be organized into pnpm monorepo workspace packages (`@thaiba/auth`, `@thaiba/db`).
* `REQ-SEC-0001`: Facial embeddings MUST be encrypted using AES-256-GCM prior to storage.
* `REQ-SEC-0002`: Protected API handlers MUST be wrapped in `requireAuth` enforcing permission strings.
* `REQ-DB-0001`: All operational queries MUST filter by `institution_id` row isolation.
* `REQ-UX-0001`: Users MUST enter role-tailored Workspaces (`/workspace/[role]`) upon login.
* `REQ-AI-0001`: AI background routines MUST use *Draft & Propose* pattern for human approval.
