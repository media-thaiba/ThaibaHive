# AI_CERTIFICATION.md — Ambient AI Safety & Compliance Certification

> **Specification Tier**: Quality Assurance Framework (AIOS 9.0)  
> **Source of Truth**: `.ai/quality/AI_CERTIFICATION.md`

* **Safety Boundaries**: Verifies ambient AI routines follow the *Draft & Propose* pattern and CANNOT execute irreversible financial or identity mutations without human sign-off.
* **Audit Trail Verification**: Verifies all AI background recommendations are logged to `activity_logs`.

---

# RELEASE_CERTIFICATION.md — Production Release Certification Protocol

* **Release Readiness Sign-Off**: Requires 100% typecheck pass, 100% lint pass, 100% test pass (231/231), verified DB dual-schema parity, and ARB Level 3 approval.

---

# TEST_COVERAGE_STANDARD.md — Test Coverage Standards

* **Unit Test Requirement**: Core auth, utility functions, and business logic MUST be covered by unit tests (currently 231 passing tests across 22 suites).
* **E2E Smoke Tests**: Core user flows (login, attendance, fee collection) covered by Playwright test suites.

---

# NON_FUNCTIONAL_REQUIREMENTS.md — Non-Functional Requirements (NFR) Index

* **Availability**: 99.9% uptime SLA.
* **Performance**: Auth < 15ms p95, Workspace Stats < 40ms p95, Cmd+K search < 35ms p95.
* **Security**: AES-256-GCM encrypted face vectors, `httpOnly` JWT sessions, mandatory `requireAuth` RBAC guards.
* **Data Tenancy**: 100% row-level `institution_id` isolation.

---

# SYSTEM_ACCEPTANCE.md — Enterprise Campus Go-Live Acceptance Criteria

Go-live approval for a new institution campus requires:
1. Valid `institution_id` configured in `institutions` table.
2. Department and sub-department hierarchy provisioned.
3. Master staff accounts created with assigned roles.
4. Active academic year and class sections configured.
5. Biometric consent policy and NFC card inventory initialized.
