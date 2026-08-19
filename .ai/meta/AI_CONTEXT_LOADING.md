# AI_CONTEXT_LOADING.md — Deterministic AI Context Retrieval Strategy

> **Specification Tier**: Meta-Architecture System Layer (AIOS X.0)  
> **Source of Truth**: `.ai/meta/AI_CONTEXT_LOADING.md`

---

## 1. Context Loading Matrix by Task Type

To minimize token consumption while guaranteeing zero architectural drift, AI agents MUST load exact specification subset files based on the primary task type:

| Task Type | Mandatory Base Documents | Task-Specific Context Documents |
| :--- | :--- | :--- |
| **All Tasks (Startup)** | `.ai/00_START_HERE.md`, `.ai/05_AI_RULES.md` | None |
| **Database & Schema Work** | Base + `.ai/08_DECISION_LOG.md` | `.ai/database/`, `packages/db/schema.ts` |
| **API & Route Handler Work**| Base + `.ai/permissions.md` | `.ai/apis/`, `.ai/contracts/`, `src/lib/api/auth-guard.ts` |
| **Business Domain Work** | Base + `.ai/04_DOMAIN_MODEL.md` | `.ai/domains/[target-domain].md` |
| **UI & Workspace Work** | Base + `.ai/03_EXPERIENCE_ARCHITECTURE.md`| `.ai/07_DESIGN_SYSTEM.md`, `@/components/ui/` |
| **Bug Triage & Fixes** | Base + `.ai/engineering/BUG_TRIAGE.md` | Target source files & stack trace logs |

---

# AI_REASONING_MODEL.md — AI Reasoning & Decision Protocol

```
┌────────────────────────────────────────────────────────┐
│ 1. LOAD CONTEXT: Read .ai/00_ & .ai/05_ AI Rules       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. VERIFY BOUNDARIES: Check permissions & DB tenancy   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. EVALUATE OPTIONS: Compare against Pattern Library   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. EXECUTE & VALIDATE: Run typecheck, lint, and test   │
└────────────────────────────────────────────────────────┘
```

---

# API_PATTERNS.md, DATABASE_PATTERNS.md & WORKFLOW_PATTERNS.md

* **API Patterns**: Standard REST route handlers wrapped with Zod body validation (`safeParse`) and `requireAuth` permissions, returning standard JSON envelopes (`success`, `data`, `meta`).
* **Database Patterns**: Dual schema maintenance (`schema.ts` + `schema.pg.ts`), UUID v4 primary keys, row-level `institution_id` filters, optimistic locking concurrency (`version`).
* **Workflow Patterns**: Asynchronous Event-Trigger-Action execution responding to 100 cross-domain automation recipes.
