# 06_CODING_STANDARDS.md — Code Quality & Engineering Standards

> **Classification**: Project-Wide Technical Engineering Guidelines  
> **Source of Truth**: `.ai/06_CODING_STANDARDS.md`

---

## 1. Directory & File Naming Conventions

* **React Components**: `kebab-case.tsx` (e.g., `stat-card.tsx`, `onboarding-modal.tsx`).
* **API Route Handlers**: `route.ts` inside nested route directories (`src/app/api/academic/students/route.ts`).
* **Utility Libraries**: `kebab-case.ts` (e.g., `auth-guard.ts`, `rate-limit.ts`).
* **Types & Interfaces**: PascalCase for interface/type names (`StaffUser`, `NavItem`, `PushNotificationPayload`).

---

## 2. Next.js & React Coding Standards

### 2.1 Component Structure & Directives
* Every client file MUST start with `"use client";` at Line 1.
* Prefer function declarations for components: `export default function PageName()`.
* Keep components small and modular; extract complex sub-views into `src/components/[feature]/`.

### 2.2 Hook Usage Guidelines
* `useEffect` MUST always specify an explicit dependency array (`[]` for mount-only or specified dependencies).
* Functions called inside `useEffect` MUST be wrapped in `useCallback`.
* Never mutate ref values (`ref.current = value`) directly during the render phase; execute mutations within `useEffect`.

```tsx
// CORRECT PATTERN
const onEventRef = useRef(onEvent);
useEffect(() => {
  onEventRef.current = onEvent;
}, [onEvent]);
```

---

## 3. TypeScript Standards

* Enforce strict type checking across all files (`"strict": true` in `tsconfig.json`).
* Explicitly type API response structures and state models. Avoid using `any`; use `unknown` with type guards if necessary.
* Use `type` imports for type-only dependencies: `import type { ReactNode } from "react";`.

---

## 4. Drizzle ORM & Database Access Standards

### 4.1 Query Patterns
* Always use Drizzle query operators (`eq`, `and`, `or`, `like`, `sql`) imported from `drizzle-orm`.
* Executing single-record queries MUST append `.get()` (or `.all()` for arrays) when using SQLite drivers.

```ts
// Example Drizzle Query Pattern
const existing = await db
  .select()
  .from(students)
  .where(and(eq(students.admissionNo, admissionNo), eq(students.institutionId, institutionId)))
  .get();
```

### 4.2 Database Mutations
* Use `.returning()` to fetch inserted/updated rows immediately after mutation execution.
* Always handle potential unique constraint violations with explicit conflict handlers (`onConflictDoUpdate`) or pre-query checks.

---

## 5. API Handler Architecture

### 5.1 Route Handler Template
Every API Route Handler MUST adhere to the following architecture:

```ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireAuth } from "@/lib/api/auth-guard";
import { z } from "zod";

const requestSchema = z.object({
  name: z.string().min(1),
  // Additional fields...
});

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // 1. Business Logic & DB Operations
  // 2. Log Activity
  // 3. Return JSON Response

  return NextResponse.json({ success: true }, { status: 201 });
}, "domain:permission");
```

---

## 6. Error Handling & Toast Feedback

* **Client Data Fetching**: Catch errors gracefully and present readable alert banners (`<Alert>`) or toast notifications via `sonner`.

```tsx
// Toast Notification Standard
import { toast } from "sonner";

try {
  // Action execution
  toast.success("Record updated successfully");
} catch (err) {
  toast.error(err instanceof Error ? err.message : "Failed to update record");
}
```

---

## 7. Testing & Quality Assurance Standards

* **Unit Testing**: Jest + `@testing-library/react`. Run `pnpm test` to verify unit suites pass.
* **E2E Testing**: Playwright (`@playwright/test`). Configured in `e2e/`.
* **Linting & Typechecking**:
  * Run `pnpm typecheck` (`tsc --noEmit`) to verify zero type errors.
  * Run `pnpm lint` to check for unused imports and syntax warnings.
