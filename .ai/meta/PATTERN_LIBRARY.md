# PATTERN_LIBRARY.md — Master Reusable Engineering Patterns

> **Specification Tier**: Meta-Architecture System Layer (AIOS X.0)  
> **Source of Truth**: `.ai/meta/PATTERN_LIBRARY.md`

---

## 1. Core Engineering Pattern Index

1. **Stateless API Guard Pattern**: Wrapping API handlers in `requireAuth(handler, permission)`.
2. **Dual-Dialect Schema Pattern**: Mirroring SQLite table definitions (`schema.ts`) in PostgreSQL (`schema.pg.ts`).
3. **1:1 Identity Extension Pattern**: Attaching domain-specific records (`hostel_boarders`) to `students.id`.
4. **Draft & Propose Ambient AI Pattern**: AI routine drafts pre-filled tasks/requisitions requiring human approval.
5. **Optimistic UI Update Pattern**: Updating client state optimistically via TanStack Query and reverting on API error.

---

# ANTI_PATTERN_LIBRARY.md — Prohibited Engineering Patterns

1. **Prohibited: Raw HTML Form Inputs**: NEVER use raw `<input>`, `<select>`, `<button>`.  
   *Alternative*: Use `@/components/ui/` primitives (`Button`, `Input`, `Select`, `Dialog`).
2. **Prohibited: Unscoped Database Queries**: NEVER execute queries without `institution_id` filters.  
   *Alternative*: Append `eq(table.institutionId, session.institutionId)` to all queries.
3. **Prohibited: Swallowed Try/Catch Blocks**: NEVER silently catch errors without user toast feedback.  
   *Alternative*: Log error internally and show `toast.error("Operation failed")`.
4. **Prohibited: Hardcoded Menu Trees**: NEVER construct 60-link navigation trees.  
   *Alternative*: Group domain actions inside intent-driven role Workspaces (`/workspace/[role]`).
5. **Prohibited: Plaintext Biometric Storage**: NEVER store raw facial images or plaintext float vectors.  
   *Alternative*: Encrypt feature vectors using AES-256-GCM (`iv:authTag:ciphertext`).

---

# DECISION_MEMORY.md, ARCHITECTURE_PATTERNS.md & UI_PATTERNS.md

* **Decision Memory Protocol**: New architectural choices log formal ADRs to `.ai/08_DECISION_LOG.md`. Citing existing ADRs is mandatory during PR code reviews.
* **Architecture Patterns**: Clean Layered Monolith, pnpm Monorepo Workspaces (`@thaiba/auth`, `@thaiba/db`), SSE Realtime Hub.
* **UI Patterns**: Role Workspaces (`/workspace/[role]`), Step-by-Step Task Wizards, Command Palette (`Cmd+K`), Shimmer Loading Skeletons (`<Skeleton>`), Universal Entity Timelines.
