# Machine Onboarding Reference (AIOS 2.0.0)

**Project**: ThaibaHive

## Current Status
- Phase 3 Complete (Admin & Operations)
- Phase 4 Finance & Reports begins next

## Tech Stack
- **Web**: Next.js 16.2.10 (App Router, React 19.2.4), Tailwind CSS 3.4.19
- **Mobile**: Flutter 3.x (Riverpod state management, GoRouter routing)
- **Database**: Drizzle ORM 0.45.2 (SQLite dev `dev.db`, PostgreSQL prod)
- **Auth**: JWT via `jose` 6.2.3, custom WebView nonces handoff
- **Components**: Radix UI + shadcn/ui primitives

## ⚡ Lazy-Loading Context Protocol (Token Saver)
To conserve token context window, **DO NOT** read all documentation files sequentially. Follow this lazy-loading route:
1. Read [PROJECT_STATE.json](file:///d:/ThaibaHive/.ai/PROJECT_STATE.json) to parse project parameters.
2. Read [CURRENT_TASK.md](file:///d:/ThaibaHive/.ai/CURRENT_TASK.md) for active task goals.
3. Read [HANDOFF.md](file:///d:/ThaibaHive/.ai/HANDOFF.md) for the latest execution context status.
4. **On-Demand Loading**: Read other files (e.g. `rules/`, `prompts/`, `maps/`, `DECISIONS.md`, `FEATURES.md`) *only* if they directly relate to the current active task.

## Critical Constraints

### NEVER
- Rewrite existing architecture without prior team discussion.
- Replace core packages or UI framework (use shadcn/ui wrappers, not custom fixed-inset overlays).
- Delete migration files or change database schemas without explicit permission.
- Hardcode Tailwind status colors (use `<Badge variant="...">`).

### ALWAYS
- Update [CHANGELOG.md](file:///d:/ThaibaHive/.ai/CHANGELOG.md) at the end of every coding session.
- Update [HANDOFF.md](file:///d:/ThaibaHive/.ai/HANDOFF.md) and [PROJECT_STATE.json](file:///d:/ThaibaHive/.ai/PROJECT_STATE.json) before finishing.
- Run complete compile & lint tests.
