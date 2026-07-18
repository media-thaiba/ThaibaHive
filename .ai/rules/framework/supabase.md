# Supabase & Drizzle Database Conventions

Guidelines for schema definition, migrations, and database querying.

---

## 1. Drizzle ORM Configurations
- All schemas are defined inside the `packages/db/schema.ts` file.
- **Dialect Switching**: The workspace uses SQLite (`dev.db`) for local development and PostgreSQL (e.g. Supabase) in production. Query syntax must remain dialect-agnostic.
- **Migrations**: Generate and apply migrations using `drizzle-kit` commands. Never manually edit SQL files within `drizzle/`.

## 2. Table Column Standards
- **IDs**: Use the Drizzle `text` type for ID fields and assign a unique UUID string as the default value.
- **Timestamps**: Store all timestamps using the `text` type in ISO 8601 string format (never native Date database types).
- **Booleans**: Map booleans to integer fields using `integer("field", { mode: "boolean" })`.
- **Auditing**: Always include `createdAt` and `updatedAt` timestamps on every table definition.
- **Foreign Keys**: Define relation links explicitly using `.references(() => table.column)`.

## 3. Query Guidelines
- Use named imports from `drizzle-orm` (e.g., `eq()`, `and()`, `or()`, `inArray()`).
- Always run database transactions inside `db.transaction()` blocks if performing multiple sequential updates.
