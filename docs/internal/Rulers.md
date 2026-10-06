# Rulers — ThaibaHive Code Conventions

## Technology Rules

### Use
- **Next.js 16 App Router** — `src/app/` with `(group)` route groups
- **React 19** — Server Components where possible, `"use client"` only when needed
- **TypeScript strict** — No `any`, explicit types on exports
- **Tailwind CSS** — Utility classes only, no inline styles, no CSS modules
- **Radix UI** — Accessible primitives via shadcn/ui wrappers
- **Drizzle ORM** — Type-safe queries, schema in `src/db/schema.ts`
- **Zod** — Validation schemas in `src/lib/validation/`
- **React Hook Form** — Forms with `@hookform/resolvers` for Zod
- **TanStack Query** — Server state, caching, optimistic updates
- **Zustand** — Client state when needed (stores in `src/stores/`)
- **Lucide React** — Icons exclusively
- **Sonner** — Toast notifications (`import { toast } from "sonner"`)
- **date-fns** — Date formatting and manipulation
- **Framer Motion** — Page transitions and micro-interactions
- **jose** — JWT creation and verification
- **bcryptjs** — Password hashing
- **clsx + tailwind-merge** — Conditional classes via `cn()` utility

### Avoid
- **No `moment.js`** — Use `date-fns` instead
- **No `axios`** — Use native `fetch` for API calls
- **No Redux** — Use Zustand or React Context
- **No CSS Modules** — Use Tailwind utility classes
- **No inline styles** — Use Tailwind classes or `cn()` helper
- **No `enum`** — Use union types (`type X = "a" | "b"`)
- **No default exports for utilities** — Named exports only
- **No barrel files** — Import from specific files
- **No `@ts-ignore` or `@ts-expect-error`** — Fix the type properly
- **No `console.log` in production code** — Use diagnostic logger
- **No relative imports outside `./`** — Use `@/` path alias

## Code Style Rules

### Files
- One component per file
- File names: `kebab-case.tsx` for components, `kebab-case.ts` for utilities
- Maximum file length: 300 lines (split if longer)
- Group imports: external → internal (`@/`) → relative (`./`)

### Components
```tsx
// ✅ Correct pattern
"use client"; // only if needed

import { cn } from "@/lib/utils";
import { SomeIcon } from "lucide-react";

type MyComponentProps = {
  title: string;
  variant?: "primary" | "secondary";
};

export function MyComponent({ title, variant = "primary" }: MyComponentProps) {
  return (
    <div className={cn("base-classes", variant === "primary" && "primary-classes")}>
      {title}
    </div>
  );
}
```

### API Routes
```ts
// ✅ Correct pattern
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { someTable } from "@/db/schema";

export const GET = requireAuth(async (request, session) => {
  // session.staffId, session.role available
  const data = await db.select().from(someTable);
  return Response.json({ data });
}, "permission:read"); // optional permission check
```

### Database
- All IDs are `text` type (UUID strings)
- Timestamps are `text` type (ISO 8601 strings)
- Boolean fields use `integer("field", { mode: "boolean" })`
- Foreign keys use `.references(() => table.column)`
- Always add `createdAt` and `updatedAt` to tables
- Use `uniqueIndex` for composite unique constraints

### Forms
```tsx
// ✅ Correct pattern
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
});

type FormData = z.infer<typeof schema>;

export function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  
  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

### Error Handling
- API routes: Return `Response.json({ error: "message" }, { status: 4xx/5xx })`
- Client fetch: Check `res.ok`, parse error from `res.json()`
- Forms: Display inline errors, not toasts
- Use `try/catch` around all async operations
- Never swallow errors silently — log with diagnostic logger

### Naming Conventions
| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `AttendanceForm` |
| Functions | camelCase | `fetchStaffList` |
| API routes | kebab-case | `/api/attendance/my` |
| Database tables | snake_case | `attendance_logs` |
| DB columns | snake_case | `check_in_time` |
| Types/Interfaces | PascalCase | `StaffRole` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| CSS classes | Tailwind utilities | `bg-primary text-white` |

### Testing
- Unit tests: `*.test.ts` co-located with source
- E2E tests: `e2e/*.spec.ts` using Playwright
- Test files use `describe` blocks, clear test names
- Mock API responses at the fetch level, not the DB level

## Security Rules
- Never log passwords, tokens, or secrets
- Never store secrets in client-side code
- Always use `requireAuth` wrapper on API routes
- Validate all inputs with Zod before processing
- Use parameterized queries (Drizzle handles this)
- Set `httpOnly`, `secure`, `sameSite` on auth cookies
- Never expose `passwordHash` in API responses

## Performance Rules
- Use `React.memo` for expensive list renders
- Lazy load heavy components with `dynamic()`
- Debounce search inputs (300ms default)
- Paginate API responses (default 50 items)
- Use TanStack Query for data caching
- Minimize `"use client"` usage — prefer Server Components
- Use `loading.tsx` for route-level loading states
