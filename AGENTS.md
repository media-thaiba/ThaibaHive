<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:thaibahive-skills -->
# Project Skills

The following skills are available for this project. Use them when relevant:

1. **graphify** — Build a queryable knowledge graph from any folder (code, docs, PDFs). Saves token costs by using a compact graph instead of reading every source file. Install: already in `~/.claude/skills/graphify/`. Trigger: `/graphify`.

2. **awesome-design-md** — Design reference files from major brands (Stripe, Linear, Vercel, etc.). Pin to project for consistent UI output across AI models. Install: already in `~/.claude/skills/awesome-design-md/`.

3. **gsd-core** (Get Shit Done) — Meta-prompting and context engineering framework. Commands: `/gsd-new-project`, `/gsd-help`. Install: `npx @opengsd/gsd-core@latest` (already installed).

4. **ecc** (Everything Claude Code) — 180+ community skills including code review, accessibility audits, testing, security scanning, and specialized agents. Install: already in `~/.claude/skills/ecc/`. Sub-skills include: `code-reviewer`, `e2e-testing`, `tdd-workflow`, `security-auditor`, `impeccable`, and more.

5. **ui-ux-pro-max** — Design intelligence skill with 57 UI styles, 95 color palettes, 56 font pairings, and 99 UX guidelines. Install: project-local at `.opencode/skills/ui-ux-pro-max/`. Run design system generation via Python scripts in its `scripts/` directory.
<!-- END:thaibahive-skills -->

<!-- BEGIN:plan-review-rule -->
# Plan Review Rule
Always ask Qwen (via `ask_qwen`), OpenCode (via `chat-with-local-ollama` / routing), and Claude Code to review and suggest improvements to any implementation plan or other plans created, then update the plan accordingly. This must be done after creating any plan.
<!-- END:plan-review-rule -->

<!-- BEGIN:thaibahive-conventions -->
# ThaibaHive Conventions

## Tech Stack
- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS 3.4
- **Components**: Radix UI + `src/components/ui/`
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Drizzle ORM
- **Auth**: JWT via `jose`
- **Package Manager**: pnpm (monorepo with `packages/auth` and `packages/db`)

## Project Structure
```
src/app/(shell)/     → Authenticated pages
src/app/api/         → API route handlers
src/components/ui/   → Reusable UI primitives
src/lib/             → Utilities, auth, validation
src/db/              → Schema, seed, connection
packages/auth/       → Auth package (roles, permissions, JWT)
packages/db/         → DB package (Drizzle schema)
```

## Coding Rules

### API Routes
- Always use `requireAuth(handler, "permission:string")` wrapper
- Validate with Zod schemas from `src/lib/validation/schemas.ts`
- Return `{ error: string }` on failure, proper HTTP status codes
- DELETE handlers must check existence before deleting (return 404 if missing)
- Use `eq()`, `and()`, `or()` from drizzle-orm for queries

### UI Pages
- Use UI components from `src/components/ui/` — never raw HTML `<input>`, `<select>`, `<button>`
- Always add `.catch()` to `useEffect` fetch calls to prevent stuck loading states
- Use `<Skeleton>` for loading states, not "Loading..." text or pulse divs
- Use `<Badge variant="success|warning|destructive|info|secondary">` for status colors — never hardcoded Tailwind
- Use `<Dialog>` for modals — never custom `fixed inset-0 z-50` overlays
- Import `ensureArray` from `@/lib/utils` instead of repeating `Array.isArray(x) ? x : []`

### Database
- Auth module re-exports from `@thaiba/auth` package — do not create local duplicates
- Role types: `super_admin | admin | principal | hod | staff`
- Staff ↔ Department: via `staffDepartments` junction table
- Staff ↔ Institution: via `staffInstitutions` junction table
- Timestamps: use `text` type with ISO strings, not native date types

### Permissions (RBAC)
- `super_admin` — `*` (all permissions)
- `admin` — Most management operations
- `principal` — Institution-level management
- `hod` — Department-level management
- `staff` — Read-only + own data operations

### Validation
- Zod schemas in `src/lib/validation/schemas.ts`
- All API routes that accept POST/PATCH body should use Zod
- Use `safeParse()` with proper error messages

### Error Handling
- API routes: return `{ error: string }` with appropriate status
- Client pages: catch fetch errors, show via `<Alert>` or `toast.error()`
- Never leave loading spinners stuck — always resolve loading state in catch

### State & Data Fetching
- `useState` for local component state
- `useCallback` for functions in `useEffect` dependency arrays
- `useEffect` must always have a dependency array (use `[]` for mount-only)

## Mobile Conventions (Flutter)

### State Management
- Use **Riverpod** (`flutter_riverpod` and generated code via `riverpod_generator`) for all features.
- Prefer `ConsumerWidget` or `ConsumerStatefulWidget` over raw widgets where state access is required.
- Keep State models immutable. Use `@freezed` or standard custom patterns for model mutation.

### Navigation & Routing
- Handle all screens and deep linking using `GoRouter`.
- Add new screens under `lib/app/router.dart` and protect paths using the `_authGuard` middleware.

### Mobile-Web Integration (Auth Handoff)
- Store JWT tokens securely using `FlutterSecureStorage` under `AppConstants.storageTokenKey`.
- When loading a web page in a WebView, always use the `WebViewHandoffScreen` component to perform Nonce Exchange (`/auth/mobile-handoff/nonce`), setting the session cookie securely to avoid manual credentials exposure.

### UI & UX
- Follow standard material design patterns.
- Always provide pull-to-refresh capabilities on dashboard and lists.
- Optimize network image rendering by using `cached_network_image` instead of default Image providers.
<!-- END:thaibahive-conventions -->
