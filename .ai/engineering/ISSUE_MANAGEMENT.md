# ISSUE_MANAGEMENT.md — Issue & Task Management Protocol

> **Specification Tier**: Engineering Operations Manual (AIOS 8.0)  
> **Source of Truth**: `.ai/engineering/ISSUE_MANAGEMENT.md`

---

## 1. Issue Severity Classification

* **P0 (Critical)**: Production down, data leakage, biometric encryption breach, multi-tenant scoping failure. Response SLA: < 1 hour.
* **P1 (High)**: Major feature broken (e.g., fee collection failing, attendance register locking up). Response SLA: < 4 hours.
* **P2 (Medium)**: Non-critical feature bug, UI layout alignment issue, minor performance delay. Response SLA: < 24 hours.
* **P3 (Low)**: Code cleanup, non-blocking lint warning cleanup, minor UI cosmetic fix. Next sprint.

---

# BUG_TRIAGE.md — Bug Diagnosis & Resolution Protocol

1. **Log Inspection First**: Never guess root cause. Read full error logs and stack traces from server output or telemetry APIs.
2. **Reproduction**: Create atomic reproduction test or step sequence.
3. **Root Cause Analysis**: Identify contract or logic break.
4. **Fix Execution**: Fix underlying cause without symptom masking or swallowed try/catch blocks.
5. **Regression Verification**: Run `pnpm test` to ensure zero regressions.

---

# REFACTORING_GUIDE.md — Safe Refactoring Guidelines

* **Preserve Behavior**: Refactoring MUST NOT alter existing API request/response contracts or UI user flows.
* **Preserve Tests**: Existing unit tests MUST continue passing after refactoring.
* **Incremental Edits**: Refactor code in small, reviewable commits.

---

# DEPENDENCY_POLICY.md — Dependency Evaluation & Security Policy

* **Minimal Dependencies**: Prefer native Node.js / Web APIs over adding external npm packages.
* **Security Scanning**: Dependencies evaluated for known vulnerabilities prior to installation.
* **Monorepo Cohesion**: Third-party UI packages MUST support React 19 and Tailwind CSS 3.4.
