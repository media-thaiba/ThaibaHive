# CLAUDE.md — ThaibaHive

Read `AGENTS.md` for project conventions, tech stack, coding rules, and architecture decisions.

## Quick Reference

- **Package manager**: pnpm
- **Dev server**: `pnpm dev`
- **Type check**: `pnpm typecheck`
- **Lint**: `pnpm lint`
- **Test**: `pnpm test`
- **E2E**: `pnpm test:e2e`
- **DB push**: `pnpm db:push`
- **DB seed**: `pnpm db:seed`

## Key Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Full project conventions and coding rules |
| `src/lib/validation/schemas.ts` | All Zod validation schemas |
| `src/lib/utils.ts` | Utility functions (cn, formatDate, timeAgo, ensureArray) |
| `src/lib/constants.ts` | Shared constants (statusBadgeVariants, priorityBadgeVariants) |
| `src/lib/api/auth-guard.ts` | Auth wrapper for API routes |
| `packages/auth/roles.ts` | Role permissions definition |
| `packages/db/schema.ts` | Database schema |

## Conventions

### API Routes
```tsx
import { requireAuth } from "@/lib/api/auth-guard";
export const GET = requireAuth(async (request, session) => {
  // session.staffId, session.role, session.email
}, "permission:string");
```

### UI Components
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
```

### Zod Validation
```tsx
import { SomeSchema } from "@/lib/validation/schemas";
const parsed = SomeSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
}
```

### Permissions
```tsx
import { hasPermission, getRolePermissions, type StaffRole } from "@/lib/auth";
const canDo = hasPermission(session.role as StaffRole, "resource:action");
```
