# ARCHITECTURE_CERTIFICATION.md — Architecture Certification Framework

> **Specification Tier**: Quality Assurance & Architecture Certification Framework (AIOS 9.0)  
> **Source of Truth**: `.ai/quality/ARCHITECTURE_CERTIFICATION.md`  
> **Standards Alignment**: ISO/IEC 25010 System Quality Model / TOGAF Architecture Governance

---

## 1. Architecture Certification Levels

To guarantee that every module, API, and codebase modification strictly conforms to the AIOS 3.0–8.0 master architecture, implementations are evaluated against three formal **Architecture Certification Levels**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LEVEL 3: FULL ENTERPRISE CERTIFIED                              │
│  - 100% compliance with AIOS 3.0-8.0 rules, zero type/lint errors, 100% test pass      │
│  - Multi-tenant institution_id scoping, AES-256-GCM encrypted biometrics, audit logging│
│  - Passed Performance SLA (< 15ms auth), WCAG 2.1 AA accessibility & security audit  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LEVEL 2: PROVISIONAL CERTIFIED                                  │
│  - Feature complete, passes typecheck & unit tests, requireAuth guards active          │
│  - Minor non-blocking lint warnings logged; awaiting final accessibility/E2E audit     │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LEVEL 1: NON-CERTIFIED / REJECTED                               │
│  - Fails typecheck/lint, missing requireAuth guards, unscoped DB queries, mock stubs   │
│  - PROHIBITED FROM MERGING INTO MAIN OR PRODUCING RELEASE CANDIDATES                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Compliance Review Stages

1. **Stage 1 (Design Review)**: Verification of proposal against domain spec (`.ai/domains/`) and ADR log (`.ai/08_DECISION_LOG.md`).
2. **Stage 2 (Static Code Audit)**: Execution of automated static checks (`pnpm typecheck`, `pnpm lint`, `pnpm test`).
3. **Stage 3 (Security & Scoping Audit)**: Verification of `requireAuth` permission guards and `institution_id` query filters.
4. **Stage 4 (UX & Accessibility Audit)**: Verification of Workspace layout, skeleton loading states, and keyboard navigation.
5. **Stage 5 (Final ARB Sign-Off)**: Architecture Review Board formal sign-off into Level 3 Certified status.

---

# IMPLEMENTATION_AUDIT.md — Enterprise Implementation Audit Specification

> **Specification Tier**: Quality Assurance Framework (AIOS 9.0)  
> **Source of Truth**: `.ai/quality/IMPLEMENTATION_AUDIT.md`

---

## 1. Audit Dimensions & Procedures

The Architecture Review Board executes implementation audits across 8 structural dimensions:

1. **Architecture Conformance Audit**: Verifies monorepo package boundaries and shared service usage (`@thaiba/auth`, `@thaiba/db`).
2. **Database Schema Audit**: Verifies structural parity between SQLite (`schema.ts`) and PostgreSQL (`schema.pg.ts`).
3. **API & Route Guard Audit**: Verifies all Route Handlers enforce `requireAuth(handler, permission)`.
4. **Security & Cryptography Audit**: Verifies facial embeddings are encrypted via AES-256-GCM and session cookies enforce `httpOnly`.
5. **Performance Audit**: Verifies p95 latency targets (< 15ms auth, < 40ms workspace stats) and absence of N+1 SQL patterns.
6. **UX & Accessibility Audit**: Verifies workspace integration, Command Palette registration, and WCAG 2.1 AA keyboard support.
7. **AI & Automation Audit**: Verifies ambient AI follows the *Draft & Propose* pattern with non-irreversible safety boundaries.
8. **Documentation Audit**: Verifies new endpoints and permissions are logged in `.ai/permissions.md` and `.ai/apis/`.
