# Matt Pocock Engineering & Productivity Skills Policy

> **MANDATORY POLICY**: This policy is permanent, strictly enforced, and must be adhered to on every task. No miss skill is permitted.

---

## 1. Core Operating Principle & Routing

All development, debugging, design, planning, code review, and productivity tasks must follow the structured workflows defined by **Matt Pocock's Engineering & Productivity Skills Suite** (installed at `.agent/skills/` and global config).

When in doubt about which skill or sequence to apply, consult [`ask-matt`](file:///d:/ThaibaHive/.agent/skills/ask-matt/SKILL.md) as the authoritative router.

---

## 2. Engineering Lifecycle Workflow (Idea → Ship)

Every coding and software engineering task must route through the standard lifecycle:

1. **Phase 1: Clarification & Alignment**
   - **`grill-with-docs`** / **`grilling`** / **`grill-me`**: Relentlessly challenge assumptions, clarify requirements, resolve ambiguities, and record domain vocabulary into `GLOSSARY.md` and decisions into ADRs before writing code.
   - **`domain-modeling`**: Keep project vocabulary razor-sharp, eliminating overloaded terms and documenting hard-to-reverse choices.

2. **Phase 2: Specification & Ticket Decomposition**
   - **`to-spec`**: Turn the conversation and architecture agreement into an actionable technical specification defining testing seams and explicit acceptance criteria.
   - **`to-tickets`**: Break the spec into tracer-bullet tickets with explicit dependency blocking edges.

3. **Phase 3: Test-Driven Implementation & Architecture**
   - **`implement`** / **`implement-spec`**: Build features ticket-by-ticket with fresh or clean context boundaries.
   - **`tdd`**: Execute strict test-driven development (red-green-refactor slices) for every behavior change.
   - **`codebase-design`**: Design deep modules with narrow interfaces, clear seams, high leverage, and strong locality.
   - **`diagnosing-bugs`**: For defects and regressions, strictly demand a tight reproducible feedback loop (a test that fails red first) before attempting any theory or fix.

4. **Phase 4: Review, Delivery & Continuous Improvement**
   - **`code-review`**: Conduct rigorous two-axis reviews (Spec compliance + Standards) on every diff before merging.
   - **`pr`**: Structure pull request notes with smallest visual evidence, before/after proof, and one-way vs. two-way door decisions.
   - **`retro`**: After completion or unexpected friction, inspect the session to lock in mechanical guards, tooling improvements, or steering checks.

---

## 3. Productivity & Context Flow

- **`handoff`**: Compact and export context when changing directories, harnesses, or handing over session states.
- **`to-questionnaire`** / **`wait-what`**: Unblock ambiguities and structure inquiries when requirements are incomplete.
- **`teach`**: Create structured learning loops and glossaries when adopting or evaluating new concepts.

---

## 4. Strict Enforcement Directive

- **Always Activate Pertinent Skills**: Before taking action on any engineering or productivity request, reference and execute the corresponding Matt Pocock skill.
- **No Skipping**: Do not write unverified code or skip testing seams, spec alignment, or review gates.
