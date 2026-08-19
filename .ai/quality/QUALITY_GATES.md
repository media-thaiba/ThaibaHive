# QUALITY_GATES.md — Mandatory Quality Gate Specifications

> **Specification Tier**: Quality Assurance Framework (AIOS 9.0)  
> **Source of Truth**: `.ai/quality/QUALITY_GATES.md`

---

## 1. Quality Gate Lifecycle

```
 Gate 1: Design  ──►  Gate 2: Static   ──►  Gate 3: Security ──►  Gate 4: Testing ──► Gate 5: Release
 (AIOS Spec Review)  (Type/Lint Check)   (Auth & Scoping)    (Unit/E2E Pass)    (ARB Sign-Off)
```

1. **Gate 1 (Architecture & Design)**: Feature specification verified against `.ai/domains/` and `.ai/08_DECISION_LOG.md`.
2. **Gate 2 (Static Analysis)**: `pnpm typecheck` returns 0 TypeScript errors; `pnpm lint` returns 0 ESLint errors.
3. **Gate 3 (Security & Scoping)**: `requireAuth` guards active on all write routes; `institution_id` query filters verified.
4. **Gate 4 (Automated Testing)**: All unit tests pass (`pnpm test`, 231/231 passing); Playwright E2E smoke tests pass.
5. **Gate 5 (Release Certification)**: ARB level 3 sign-off granted before production deployment.

---

# VALIDATION_FRAMEWORK.md — Continuous Validation Methodology

* **Static Validation**: Automated CI scripts executing TypeScript typechecking and ESLint validation.
* **Dynamic Validation**: Test suite execution verifying API endpoint envelopes, RBAC guards, and database transactions.
* **Peer & AI Validation**: Code review against `.ai/engineering/CODE_REVIEW_STANDARD.md`.

---

# ARCHITECTURE_SCORECARD.md — Enterprise Architecture Scorecard

| Dimension | Target Metric | Minimum Passing Threshold | Weight |
| :--- | :--- | :--- | :---: |
| **Architecture Compliance** | 100% adherence to AIOS rules | 100% | 20% |
| **Type Safety & Code Quality**| 0 TypeScript / 0 ESLint errors | 0 Errors | 15% |
| **Security & Tenant Scoping** | 100% `requireAuth` + `institution_id` | 100% | 20% |
| **Performance SLA Compliance**| p95 latency < 15ms auth, < 40ms stats | 95% of routes | 15% |
| **Accessibility (WCAG 2.1 AA)**| Keyboard accessible, 44px targets | 100% Workspace views | 10% |
| **Automated Test Pass Rate** | 100% pass rate (231/231 tests) | 100% | 10% |
| **Documentation Integrity** | Up-to-date specs in `.ai/` | 100% Specs updated | 10% |

---

# MODULE_CERTIFICATION.md & API_CERTIFICATION.md

* **Module Certification Checklist**: Verification that new features adhere to Workspace-first UX, Task Wizards, Universal Search indexing, and event emissions.
* **API Certification Checklist**: Verification that API routes conform to REST conventions, supply valid Zod schemas, enforce `requireAuth`, return standardized envelopes, and pass latency SLA tests.
