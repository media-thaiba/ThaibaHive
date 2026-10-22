# ThaibaHive — Developer Onboarding Guide

> **Living documentation** — this file links to executable/versioned sources. Do not duplicate content here.

---

## 1. Product Requirements (What we're building)
- **PRD**: [`docs/internal/PRD.md`](internal/PRD.md) — single source of truth for product scope
- **Features tracker**: [`docs/internal/FEATURES.md`](internal/FEATURES.md) — implemented vs planned

---

## 2. Architecture & Technical Decisions (How we build)
- **Architecture overview**: [`docs/internal/Architecture.md`](internal/Architecture.md)
- **Design system & UI conventions**: [`docs/design-system-and-components.md`](../design-system-and-components.md)
- **Coding conventions**: [`AGENTS.md`](../../AGENTS.md) — includes Next.js 16, Tailwind, Radix, Drizzle, RBAC rules
- **ADR-style decisions**: Search `docs/internal/` for `*_SPEC.md`, `*_ARCHITECTURE.md`

---

## 3. Database Schema (Executable, not documented)
- **SQLite (dev)**: [`packages/db/schema.ts`](../../packages/db/schema.ts)
- **PostgreSQL (prod)**: [`packages/db/schema.pg.ts`](../../packages/db/schema.pg.ts)
- **Migrations**: `drizzle/` (SQLite) & `drizzle/postgres/` (PG)
- **Verification**: `pnpm db:verify:columns` — checks tenant column parity

---

## 4. App Flow & API Routes
- **API routes**: [`src/app/api/`](../../src/app/api/) — each route = one file, wrapped in `requireAuth()`
- **Server actions**: [`src/app/(shell)/**/actions.ts`](../../src/app/(shell)/)
- **Auth & permissions**: [`packages/auth/roles.ts`](../../packages/auth/roles.ts) — 5-tier RBAC matrix
- **Validation schemas**: [`src/lib/validation/schemas.ts`](../../src/lib/validation/schemas.ts)

---

## 5. UI/UX Implementation
- **Components**: [`src/components/ui/`](../../src/components/ui/) — Radix-based primitives
- **Pages**: [`src/app/(shell)/`](../../src/app/(shell)/) — authenticated shell routes
- **Design tokens**: Tailwind config + CSS variables in [`src/app/globals.css`](../../src/app/globals.css)
- **Dark mode**: Default `dark` class on `<html>` — see [`src/contexts/ThemeContext.tsx`](../../src/contexts/ThemeContext.tsx)

---

## 6. Implementation Process (GSD Methodology)
- **Roadmap**: [`PLAN.md`](../../PLAN.md)
- **Active phase**: `.planning/phases/<current-phase>/PLAN.md`
- **Verification loop**: `pnpm verification-loop` (build, typecheck, lint, test, security, diff)
- **Phase commands**: `gsd-*` CLI — see [`gsd-help`](../../.claude/skills/gsd-help/SKILL.md)

---

## 7. Key Commands
```bash
# Development
pnpm dev                 # Next.js + Turbopack
pnpm db:studio           # Drizzle Studio

# Quality gates (run before PR)
pnpm typecheck           # tsc --noEmit
pnpm lint                # ESLint
pnpm test                # Vitest + Playwright
pnpm security:rbac       # AST permission scanner
pnpm security:tenant     # Multi-tenant isolation scanner

# Database
pnpm db:migrate          # Apply migrations (SQLite)
pnpm db:migrate:pg       # Apply migrations (PostgreSQL)
pnpm db:verify:columns   # Verify tenant columns exist
```

---

## 8. Critical Conventions (from AGENTS.md)
| Area | Rule |
|------|------|
| API routes | Always `requireAuth(handler, "perm:string")` + Zod `safeParse()` |
| UI | Use `src/components/ui/` — never raw `<input>`, `<button>` |
| Loading | `<Skeleton>` only — no "Loading..." text |
| Status colors | `<Badge variant="success\|warning\|destructive\|info\|secondary">` |
| Modals | `<Dialog>` only — no custom overlays |
| Typography | ≥11px (`text-xs`/`text-[11px]`) for labels/badges |
| RBAC | 5 tiers: `super_admin` → `admin` → `principal` → `hod` → `staff` |

---

## 9. Where to Start
1. Read `AGENTS.md` — conventions are enforced in PR reviews
2. Open `docs/internal/PRD.md` — understand product scope
3. Run `pnpm dev` — explore the running app
4. Pick a GSD phase from `.planning/phases/` — each has `PLAN.md` with acceptance criteria

---

## 10. Questions?
- **Architecture**: Check `docs/internal/Architecture.md` or ask in PR
- **Permissions**: `packages/auth/roles.ts` has the full matrix
- **Schema changes**: Edit `packages/db/schema.ts` + `schema.pg.ts` together, run `pnpm db:verify:columns`
- **UI patterns**: Copy from `src/components/ui/` or existing pages in `(shell)/`