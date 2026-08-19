# AI_CONFLICT_RESOLUTION.md — Architectural Conflict Resolution Protocol

> **Specification Tier**: Meta-Architecture System Layer (AIOS X.0)  
> **Source of Truth**: `.ai/meta/AI_CONFLICT_RESOLUTION.md`

---

## 1. Conflict Resolution Hierarchy

If a conflict arises between conflicting requirements or documentation files, AI agents MUST resolve the conflict using the following precedence rules:

1. **Constitutional Rules Win**: `.ai/05_AI_RULES.md` and `.ai/00_START_HERE.md` ALWAYS override individual implementation files.
2. **ADRs Override Informal Specs**: A recorded decision in `.ai/08_DECISION_LOG.md` overrides informal comments or previous documentation notes.
3. **Physical DB Schemas Override Domain Docs**: When querying physical data, `packages/db/schema.ts` and `.ai/database/` represent physical reality over high-level vision documents.
4. **Explicit User Directives**: If a user explicitly issues a directive during a session that conflicts with non-constitutional specs, the agent MUST explain the trade-offs before proceeding.

---

# AI_MEMORY_MODEL.md, AI_TASK_PLANNING.md & AI_DECISION_PROTOCOL.md

* **Memory Layers**: Working Session Memory ──► Task Planning Memory ──► Repository Architecture Memory (`.ai/`).
* **Task Planning Protocol**: AI agents MUST verify pre-checks (typecheck, test suite pass) before declaring planning complete.
* **Decision Protocol**: AI agents selecting between implementation options MUST prioritize zero code duplication, existing shared utility reuse, and type safety.

---

# LESSONS_LEARNED.md — Repository Retrospective & Lessons Learned

1. **Lesson 1 (Lint Cleanliness)**: Automatic `--fix` can swallow subtle React Hook ref mutation bugs. Always inspect manual edits for `useRef` assignments inside render functions.
2. **Lesson 2 (Navigation Link Tags)**: Always use Next.js `<Link>` components instead of raw `<a>` tags inside App Shell layouts to preserve client SPA navigation state.
3. **Lesson 3 (Dual Schema Parity)**: SQLite and PostgreSQL schema files MUST be kept in perfect structural alignment to prevent production migration runtime failures.
