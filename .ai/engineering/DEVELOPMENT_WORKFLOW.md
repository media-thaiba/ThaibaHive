# DEVELOPMENT_WORKFLOW.md — End-to-End Feature Development Workflow

> **Specification Tier**: Engineering Operations Manual (AIOS 8.0)  
> **Source of Truth**: `.ai/engineering/DEVELOPMENT_WORKFLOW.md`

---

## 1. Feature Lifecycle Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 1. TASK     │──►  │ 2. AIOS     │──►  │ 3. CODE     │──►  │ 4. LOCAL    │──►  │ 5. VERIFY   │
│ ASSIGNMENT  │     │ VERIFY      │     │ EDIT        │     │ VALIDATE    │     │ & MERGE     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

1. **Task Assignment**: Feature request reviewed against domain spec in `.ai/domains/`.
2. **AIOS Verification**: Verify permission keys (`permissions.md`), API path (`apis/`), and DB tables (`database/`).
3. **Code Edit**: Implement feature adhering to `.ai/06_CODING_STANDARDS.md` and UI primitives in `src/components/ui/`.
4. **Local Validation**: Execute `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
5. **Verify & Merge**: Confirm zero lint/type errors before committing.

---

# TASK_EXECUTION_PROTOCOL.md — Engineering Task Execution Protocol

1. **Pre-Check**: Read relevant `.ai/` specifications for the target business domain.
2. **Execution Boundary**: Modify code strictly within target route, component, or package files.
3. **Post-Validation Checklist**:
   - [ ] `pnpm typecheck` returns 0 errors.
   - [ ] `pnpm lint` returns 0 errors.
   - [ ] `pnpm test` passes all unit tests.
   - [ ] `requireAuth` guard wraps API handler.
   - [ ] `institution_id` filter is present in queries.

---

# PROMPTING_STANDARD.md — AI Agent Prompting Standard

When prompting AI agents for development tasks, human engineers MUST provide:
1. **Context**: Specify target domain (e.g., "Domain 07: Fee Management").
2. **AIOS Reference**: Reference relevant `.ai/` specs (e.g., "Follow `.ai/apis/fees.md` and `.ai/05_AI_RULES.md`").
3. **Execution Expectation**: Require zero type errors and full adherence to UI primitives.
