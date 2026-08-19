# CODE_REVIEW_STANDARD.md — Peer & AI Code Review Criteria

> **Specification Tier**: Engineering Operations Manual (AIOS 8.0)  
> **Source of Truth**: `.ai/engineering/CODE_REVIEW_STANDARD.md`

---

## 1. Mandatory Code Review Criteria

Every pull request MUST pass review against 6 core axes:
1. **AIOS Conformance**: Strictly complies with AIOS 3.0–7.0 rules and specifications.
2. **Security & Scoping**: API handlers wrapped with `requireAuth`; DB queries enforce `institution_id`.
3. **Type Safety**: Passes `tsc --noEmit` with zero errors.
4. **UI Consistency**: Uses `@/components/ui/` primitives, semantic badges, and layout skeletons.
5. **Error Resilience**: `useEffect` fetch calls catch errors and toast user feedback.
6. **No Code Duplication**: Reuses existing helpers in `src/lib/` and shared packages.

---

# COMMIT_STANDARD.md — Conventional Commit Specifications

All commits MUST follow Conventional Commits standard:
* `feat(fees): add cashier receipt printing button`
* `fix(attendance): resolve ref mutation in use-realtime-dashboard hook`
* `docs(aios): update 05_AI_RULES.md with rule 101`
* `refactor(auth): simplify JWT payload extraction`
* `test(academic): add unit tests for student promotion logic`

---

# BRANCHING_STANDARD.md — Git Branching Strategy

* `main`: Production-ready branch. All commits must pass CI build and tests.
* `feat/[domain]-[feature]`: Short-lived feature branch (e.g., `feat/fees-cashier-receipt`).
* `fix/[issue-description]`: Bug fix branch (e.g., `fix/attendance-ref-mutation`).

---

# PULL_REQUEST_STANDARD.md — Pull Request Verification & Evidence

PRs MUST contain:
1. **Summary**: Brief description of changes made.
2. **AIOS Conformance Proof**: Confirmation that `.ai/05_AI_RULES.md` and relevant domain specs were followed.
3. **Verification Evidence**: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors), `pnpm test` (231/231 passing).
