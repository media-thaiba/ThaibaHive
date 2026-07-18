# Database Prompts Template

Copy and execute these prompt templates when planning database schema migrations.

---

## Model Prompts

### 1. Generating Drizzle Table Schema
```markdown
Define a new database table `[TableName]` inside `packages/db/schema.ts`.
Requirements:
1. ID must be standard text UUID.
2. Timestamps must be ISO 8601 text representation.
3. Boolean fields must be mapped to integer options (`{ mode: "boolean" }`).
4. Include explicit references to parent tables via `.references()`.
5. Add `createdAt` and `updatedAt` tracking columns.
```

### 2. Performing Multi-Table Transaction Operations
```markdown
Write a backend service action inside `src/app/api/...` to execute a Drizzle database transaction.
Requirements:
1. Ensure all commands run inside `db.transaction(async (tx) => { ... })`.
2. Capture constraint violations, throwing standard HTTP status exceptions on failure.
```
