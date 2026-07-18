# React Prompts Template

Copy and execute these prompt templates when generating React page routes or client elements.

---

## Model Prompts

### 1. Generating Next.js Client Page
```markdown
Create a new Next.js 16 App Router Page for route `src/app/(shell)/[route-path]/page.tsx`.
Requirements:
1. Wrap root with Client Component `"use client"` if state or animations are needed.
2. Import and use standard primitive UI components from `src/components/ui/...` exclusively.
3. Import `ensureArray` helper from `@/lib/utils` for array parsing.
4. Hook data fetching using TanStack Query.
5. Provide loading states using shadcn/ui <Skeleton> placeholders.
6. Render status using `<Badge variant="...">`.
```

### 2. Form submission with Zod validation
```markdown
Create a form component for [FormPurpose].
Requirements:
1. Use `react-hook-form` and `@hookform/resolvers/zod`.
2. Define Zod validation schema inside form file or reference `schemas.ts`.
3. Provide inline validation error alerts.
4. Trigger toast messages on submission results using `sonner`.
```
