# ENGINEERING_HANDBOOK.md — Enterprise Engineering Handbook & Discipline

> **Specification Tier**: Engineering Operations Manual (AIOS 8.0)  
> **Source of Truth**: `.ai/engineering/ENGINEERING_HANDBOOK.md`  
> **Target Engineering Standards**: Google Engineering Principles / Atlassian Engineering Playbook

---

## 1. Engineering Philosophy

Engineering at ThaibaHive Institution OS is governed by **Five Foundational Disciplines**:

1. **Architecture-First Development**: No code is written without explicit specification in the AIOS 3.0–7.0 knowledge base. Architecture precedes code.
2. **Documentation-First Discipline**: System behavior, API schemas, and permission keys MUST be documented in `.ai/` before implementation begins.
3. **Small Incremental Delivery**: Feature changes are delivered in small, atomic, fully tested pull requests that preserve production stability.
4. **Human Experience Above Database Simplicity**: We engineer for human intent via Workspaces and Task Wizards, encapsulating database complexity inside platform services.
5. **Zero Technical Debt Tolerated**: Unused code, stray warnings, unhandled promises, and non-type-safe shortcuts are strictly prohibited.

---

## 2. Definition of Engineering Quality

Quality is measured by six non-negotiable criteria:
* **Type Safety**: 0 TypeScript compilation errors (`pnpm typecheck`).
* **Clean Syntax**: 0 ESLint errors or unresolved warnings (`pnpm lint`).
* **Test Verification**: 100% passing unit test suite (`pnpm test`).
* **Performance Compliance**: API p95 latency targets (< 15ms auth, < 40ms workspaces).
* **Security & Tenant Isolation**: 100% adherence to `requireAuth` permissions and `institution_id` row isolation.
* **Accessibility Compliance**: WCAG 2.1 AA keyboard & screen reader support across all workspace views.

---

# AI_AGENT_PLAYBOOK.md — AI Agent Operating & Execution Protocol

> **Specification Tier**: Engineering Operations Manual (AIOS 8.0)  
> **Source of Truth**: `.ai/engineering/AI_AGENT_PLAYBOOK.md`

---

## 1. Mandatory AI Session Initialization Protocol

Whenever an AI coding agent (Claude, Gemini, Qoder, Antigravity, Copilot, ChatGPT, etc.) initializes a new development session, it MUST execute the following sequence:

```
┌────────────────────────────────────────────────────────┐
│ 1. READ .ai/00_START_HERE.md                          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. READ .ai/05_AI_RULES.md (Verify 100 Rules)         │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. LOAD TASK-SPECIFIC SPECIFICATION DOCUMENTS         │
│    - Database Task? -> Read .ai/database/ & .ai/5.0   │
│    - Domain Task?   -> Read .ai/domains/              │
│    - Implementation? -> Read .ai/implementation/      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. EXECUTE TASK & VERIFY AGAINST DEFINITION OF DONE    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Forbidden AI Behaviors

1. **Schema Mutation Without ADR**: NEVER modify stable database schemas in `packages/db/schema.ts` without logging an ADR in `.ai/08_DECISION_LOG.md`.
2. **Unscoped Database Queries**: NEVER output database queries omitting `institution_id` filters.
3. **Raw HTML Form Controls**: NEVER use raw `<input>`, `<select>`, `<button>` tags; ALWAYS use `@/components/ui/` primitives.
4. **Placeholder Code**: NEVER output TODO comments, mock stub implementations, or incomplete code blocks.
5. **Silent Try/Catch Blocks**: NEVER catch exceptions silently without toast user feedback or error logging.
