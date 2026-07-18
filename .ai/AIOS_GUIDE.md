# AIOS Product Guide — The AI Operating System

Welcome to the AI Collaboration Infrastructure of ThaibaHive. This document describes the purpose, structure, workflows, and evolution of the **AI Operating System (AIOS)**.

---

## 1. Vision & Purpose
AIOS is a repository-native collab infrastructure designed to solve **context drift** and **multi-model coding inconsistencies**. Rather than relying on transient chat threads or memory history, the absolute source of truth for project state and coding rules is stored directly within the repository root inside the `.ai/` directory. 

---

## 2. File Hierarchy Map

The `.ai/` directory is structured into layered tiers:

```
.ai/
├── Entry Points (Lazy Load)
│   ├── MACHINE_README.md  # 30-second onboarding card
│   ├── PROJECT_STATE.json # Machine-readable metadata state
│   ├── START_HERE.md      # Onboarding protocols
│   └── CONTEXT_INDEX.md   # Feature-to-documentation index map
│
├── Memory & Status
│   ├── PROJECT_MEMORY.md  # Permanent vision and folder conventions
│   ├── SESSION_MEMORY.md  # Daily temporary workarounds
│   ├── MEMORY_SUMMARY.md  # Compressed milestones list
│   ├── CURRENT_TASK.md    # Active task/sprint status
│   └── HANDOFF.md         # Active session handover
│
├── Governance & Context
│   ├── SYSTEM_GUARDRAILS.md # Forbidden AI actions
│   ├── TERMINOLOGY.md       # Project glossaries & vocabulary
│   ├── DECISIONS.md         # DEC-XXX decisions register
│   ├── ARCHITECTURE.md      # System flow and nonce auth maps
│   ├── AI_MODELS.md         # Capabilities matrix of models
│   ├── RECOVERY.md          # Discarding broken actions protocols
│   ├── FEATURES.md          # Canonical features registry
│   ├── METRICS.md           # Session speeds log
│   └── SESSION_TEMPLATE.md  # Uniform handoff formatting template
│
├── maps/                    # System dependency diagrams
│   ├── frontend.md
│   ├── backend.md
│   ├── mobile.md
│   └── database.md
│
├── rules/                   # Styling and code conventions
│   ├── global/              # Coding, security, performance, git
│   └── framework/           # Next.js, React, Flutter, Supabase/Drizzle, Design
│
└── prompts/                 # Modular prompts templates
    ├── flutter.md
    └── react.md (etc.)
```

---

## 3. Standard Workflows

### Onboarding Protocol (`/onboard`)
When any AI model starts a session, it must:
1. Read `MACHINE_README.md` to identify current constraints.
2. Read `PROJECT_STATE.json` and `CURRENT_TASK.md` to get current task alignment.
3. Read `HANDOFF.md` to pick up where the last agent left off.
4. **Lazy Load**: Refer to `CONTEXT_INDEX.md` and load only the maps, features, or rules relevant to the immediate task.

### Offboarding Protocol (`/handoff`)
When ending a session, the AI must:
1. Ensure the workspace compiles and passes lint/tests.
2. Update `CHANGELOG.md` with description of edits.
3. Update `CURRENT_TASK.md` to check completed tasks and declare next goals.
4. Rewrite `HANDOFF.md` with compile confirmations and recommended prompts.
5. Update `PROJECT_STATE.json` if the project phase or dependencies shifted.

---

## 4. Maintenance & Evolution Roadmap

### AIOS 2.x Feature Freeze
> [!IMPORTANT]
> **AIOS 2.x is now feature-frozen**. Only bug fixes, terminology corrections, or data-accuracy logs are allowed. Any new platform capabilities (such as validators, sync scripts, and MCP server endpoints) belong in **AIOS 3.x**.

### Compatibility Matrix
| AIOS Spec | Target Models | Min. Reader Engine |
|---|---|---|
| **AIOS 2.x** | Claude 3.5 Sonnet / 4, GPT-4o / 5, Gemini 2.0 / 3.5, Qwen 2.5 Coder | Context lazy load, ADR structure, and Feature Contracts |
| **AIOS 3.x** | MCP-enabled agents (Claude Code, Cursor IDE, etc.) | Automated syncing, graph layouts, and live Doctor scripting |

---

## 5. Development Roadmap to AIOS 3.0 (Automation)

### Phase 1: AIOS Doctor & Validator (Tooling)
- Implement `npm run aios:doctor` to validate broken markdown links, check for orphaned decisions (unreferenced in rules), find stale tasks, or look for features in `FEATURES.md` that aren't mapped in `maps/`.
- Set up a CI workflow that runs the Doctor script on every push, ensuring AIOS documents remain up-to-date with code changes.

### Phase 2: Sync & Context Builders (Command Automation)
- Develop `npm run aios:sync` to parse the Git diff and automatically update `PROJECT_STATE.json` completed list, `CHANGELOG.md`, and `FEATURES.md`.
- Develop `npm run aios:context <feature>` to assemble and print only the required documentation, rules, and dependency maps for that feature, saving context tokens during model input initialization.

### Phase 3: The AIOS MCP Server (Dynamic Context)
- Expose the entire `.ai/` directory as an **Model Context Protocol (MCP)** server.
- Instead of reading files, AI models will execute tools like `getCurrentTask()`, `getDecisions()`, or `getFeatureSchema()` to query context dynamically and save thousands of input tokens per prompt.
