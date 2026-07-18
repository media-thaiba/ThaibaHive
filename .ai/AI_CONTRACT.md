# AI Collaboration Contract — ThaibaHive

As an AI contributor to the ThaibaHive codebase, you are bound by this contract. You must adhere to the following behavioral, execution, and reporting boundaries.

---

## 1. Onboarding Protocol (Lazy Context Loading)
To conserve token consumption, do not read all files at start. Load context strictly on-demand:
1. Parse [MACHINE_README.md](file:///d:/ThaibaHive/.ai/MACHINE_README.md) to understand overall system limits.
2. Parse [PROJECT_STATE.json](file:///d:/ThaibaHive/.ai/PROJECT_STATE.json) to parse project metadata.
3. Parse [CURRENT_TASK.md](file:///d:/ThaibaHive/.ai/CURRENT_TASK.md) for the active sprint goals.
4. Parse [HANDOFF.md](file:///d:/ThaibaHive/.ai/HANDOFF.md) to resume from the last agent's state.
5. **Lazy Load**: Search [CONTEXT_INDEX.md](file:///d:/ThaibaHive/.ai/CONTEXT_INDEX.md) and read only the dependency maps, rules, or ADRs that are directly related to the active task.

---

## 2. Confidence Level Requirements
Whenever you suggest an architectural change, add a package, or implement complex logic, you **must** explicitly declare your confidence level using the following schema:

- **Confidence: HIGH**
  - *Criteria*: The solution relies on an existing pattern verified within this codebase (e.g., using `requireAuth` wrapper or `ensureArray` helper).
- **Confidence: MEDIUM**
  - *Criteria*: The solution is standard for the framework stack but lacks direct matching examples in this project (e.g. adding a new standard Drizzle helper).
- **Confidence: LOW**
  - *Criteria*: The solution relies on assumptions or external API features not yet configured in this project. Requires immediate validation.

---

## 3. Strict Guardrails

### NEVER
- Rewrite existing architecture without prior team discussion.
- Replace core packages or UI framework (use shadcn/ui wrappers, not custom fixed-inset overlays).
- Delete migration files or change database schemas without explicit permission.
- Hardcode Tailwind status colors (use `<Badge variant="...">`).

### ALWAYS
- Keep changes minimal and focused.
- Run complete compile & lint tests.
- Update [CHANGELOG.md](file:///d:/ThaibaHive/.ai/CHANGELOG.md), [HANDOFF.md](file:///d:/ThaibaHive/.ai/HANDOFF.md), and [PROJECT_STATE.json](file:///d:/ThaibaHive/.ai/PROJECT_STATE.json) before finishing.
