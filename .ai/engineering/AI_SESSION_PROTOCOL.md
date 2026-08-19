# AI_SESSION_PROTOCOL.md — AI Agent Session Lifecycle Protocol

> **Specification Tier**: Engineering Operations Manual (AIOS 8.0)  
> **Source of Truth**: `.ai/engineering/AI_SESSION_PROTOCOL.md`

---

## 1. AI Session Execution Cycle

```
┌────────────────────────────────────────────────────────┐
│ 1. INIT: Read .ai/00_START_HERE.md & .ai/05_AI_RULES.md│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. LOAD: Read target Domain (.ai/4.0) & API (.ai/5.0)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. IMPLEMENT: Edit code using @/components/ui/ & Zod  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. VALIDATE: Run typecheck, lint, and test validation │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 5. FINISH: Verify against DEFINITION_OF_DONE.md        │
└────────────────────────────────────────────────────────┘
```

---

# ARCHITECTURE_CONFORMANCE.md & KNOWLEDGE_UPDATE_POLICY.md

## 1. Conformance Rules
Code implementations MUST conform 100% to AIOS 3.0–7.0 specifications. Deviations are rejected during code review.

## 2. Knowledge Base Updates
When new platform services, permission keys, or ADRs are created, the corresponding `.ai/` files MUST be updated in the same commit.

---

# DEFINITION_OF_DONE.md — Official Engineering Definition of Done

A task is considered **DONE** if and only if all of the following criteria are satisfied:
1. **Architectural Alignment**: Feature implements business domain requirements defined in `.ai/domains/`.
2. **Security & Scoping**: API handlers wrapped with `requireAuth`; DB queries enforce `institution_id` row isolation.
3. **Type Safety**: `pnpm typecheck` (`tsc --noEmit`) passes with 0 errors.
4. **Linting**: `pnpm lint` passes with 0 errors.
5. **Testing**: `pnpm test` passes all unit tests (231/231 passing).
6. **UI/UX Consistency**: Uses `@/components/ui/` primitives, semantic badges, and skeleton loading states.
7. **Error Resilience**: Promises chain `.catch()` and display user feedback toasts via `sonner`.
8. **No Placeholders**: Zero TODO comments, zero mock stubs, zero hardcoded dummy values.

---

# ENGINEERING_GLOSSARY.md — Engineering Terminology

* **App Router**: Next.js 16 file-system based router using React Server Components and Route Handlers.
* **Drizzle ORM**: Type-safe TypeScript ORM compiling directly to raw SQL without runtime overhead.
* **requireAuth**: Higher-order wrapper for API route handlers enforcing JWT session verification and RBAC permissions.
* **Institution Scoping**: Mandatory row-level query filtering using `institution_id` to guarantee tenant isolation.
* **Definition of Done (DoD)**: The strict checklist of quality, security, and testing requirements for task completion.
