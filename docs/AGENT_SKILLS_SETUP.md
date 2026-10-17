# AI Agent Skills & Meta-Harness Setup Guide

> **For AI Agents (Claude Code, Antigravity, OpenCode, Cursor, etc.):**
> If a developer shares this file with you and asks you to set up these skills in their repository or global agent environment, execute the installation commands in **Section 1**, copy or scaffold the skill definitions in **Sections 2–8**, and add the project skill references to the project's `AGENTS.md` / `CLAUDE.md` file.

---

## Quick Agent Prompt for Developers

Share this file with your team. Other developers can drop this file into their project and prompt their AI coding agent:

```text
Read AGENT_SKILLS_SETUP.md and install/configure all listed meta-frameworks, CLI skill packs, and project-local skills for my environment and repository. Update AGENTS.md when finished.
```

---

## 1. Core Meta-Frameworks & Skill Packs (Automated Install)

Run these commands to install the foundational skill packs and multi-agent harnesses:

### 1.1 Everything Claude Code (`ecc` v2.2.3)
Installs **293 skills + 71 specialized agents** (`full` profile) covering TDD, code review, accessibility audits, security scanning, and verification loops into `~/.claude/skills/`.
```bash
npx ecc-universal@2.2.3 install --profile full --target claude --no-hooks
npx ecc-universal@2.2.3 doctor
```

### 1.2 Get Shit Done (`gsd-core`)
Meta-prompting and context engineering framework (`/gsd-new-project`, `/gsd-help`).
```bash
npx @opengsd/gsd-core@latest
```

### 1.3 Ruflo Agent Meta-Harness (`ruflo` v3.56.9)
Initializes the `claude-flow` MCP server (`.mcp.json`), 30 skills, 16 commands, and 17 agents in `.claude/` for multi-agent swarm coordination, AgentDB vector memory, and background workers.
```bash
npx ruflo@latest init
# Optional runtime commands:
# npx ruflo daemon start
# npx ruflo swarm init
# npx ruflo tui
```

### 1.4 Graphify (`graphify`)
Builds a queryable knowledge graph from any codebase, docs, or PDFs (with god nodes & community detection) so agents query a compact graph instead of reading every source file.
* **Location:** `~/.claude/skills/graphify/`
* **Trigger:** `/graphify`

### 1.5 UI/UX Pro Max (`ui-ux-pro-max`)
Design intelligence skill with 57 UI styles, 95 color palettes, 56 font pairings, and 99 UX guidelines.
* **Location:** `.opencode/skills/ui-ux-pro-max/` (includes Python design system generator scripts under `scripts/`).

### 1.6 Awesome Design MD (`awesome-design-md`)
Design reference files from major brands (Stripe, Linear, Vercel, etc.) to pin consistent UI output across AI models.
* **Location:** `~/.claude/skills/awesome-design-md/`

---

## 2. Full-Stack Architecture, Web & Desktop Engineering Skills

Install or configure these skills under `~/.gemini/config/skills/` or `~/.claude/skills/`:

| Skill Name | Description & When to Use |
| :--- | :--- |
| **`nextjs-rsc-architect`** | Design, implement, and optimize Next.js App Router applications, React Server Components (RSC), Server Actions, client-server boundaries, and hydration fixes. |
| **`architecture-and-performance`** | Optimize codebase architecture, Next.js bundle sizing, React rendering performance, memory allocation, and database query index rules. |
| **`supabase-postgres-expert`** | Design, implement, and audit PostgreSQL/Supabase schemas, Row Level Security (RLS) policies, triggers/functions, realtime subscriptions, and Storage buckets. |
| **`database-admin`** | Cloud database reliability engineering, high availability, migrations, disaster recovery, backup checksum verification, and multi-tenant indexing. |
| **`offline-sync-patterns`** | Offline-first sync databases (Hive for Flutter, Dexie for JS/TS), sync queue outboxes, CRDT/LWW conflict resolution, JWT refresh interceptors, and Dead Letter Queues (DLQ). |
| **`media-pipeline-ffmpeg`** | Media processing pipelines, EXIF/XMP metadata extraction, video transcoding, FFmpeg proxy/thumbnail generation, and chunked uploads. |
| **`tauri-desktop-expert`** | Architect, debug, and optimize Tauri desktop apps, WebView2 viewport issues, custom titlebars, IPC commands, and multi-window management. |
| **`graphql-architect`** | GraphQL schema design, federation, caching, and performance optimization. |
| **`openapi-spec-generation`** | Generate and maintain OpenAPI 3.1 specifications from code, design-first specs, and contract validation. |
| **`payment-integration`** | Integrate Stripe, PayPal, and payment processors (checkout flows, subscriptions, webhooks, PCI compliance). |
| **`stripe-integration`** | Specific Stripe payment processing patterns for checkout, subscriptions, and webhook signature verification. |

---

## 3. UI/UX, Design System & Visual Validation Skills

| Skill Name | Description & When to Use |
| :--- | :--- |
| **`impeccable`** | Comprehensive frontend UI/UX design, redesign, visual hierarchy, cognitive load reduction, typography, color, motion, micro-interactions, and anti-pattern elimination. |
| **`design-system-components`** | Manage design tokens, Tailwind CSS theme configurations, shared web-desktop UI component contracts, and Radix UI accessibility compliance. |
| **`motion-designer`** | High-end visual animations, layout transitions, Framer Motion configs, and GSAP scroll milestones. |
| **`ui-visual-validator`** | Visual regression testing, screenshot analysis, design system compliance, and component validation. |
| **`accessibility-compliance-accessibility-audit`** | WCAG compliance audits, inclusive design, and assistive technology compatibility. |
| **`generative_ui`** | Render rich interactive HTML widgets, diagrams, and data visualizations. |

---

## 4. Mobile Development Skills (Flutter, Dart & Android)

Provided via the **Flutter Plugin**, **Android CLI Plugin**, and custom mobile skills:

### 4.1 Flutter Architecture, Layout & Navigation
* **`flutter-apply-architecture-best-practices`** — Layered architecture (UI, Logic, Data) with Riverpod (`flutter_riverpod` / `@freezed`).
* **`flutter-build-responsive-layout`** — Adaptive layouts for mobile, tablet, and desktop (`LayoutBuilder`, `MediaQuery`, `Expanded/Flexible`).
* **`flutter-fix-layout-issues`** — Resolve `RenderFlex overflowed` and unbounded height/width constraints using Dart & Flutter MCP tools.
* **`flutter-setup-declarative-routing`** — Configure `GoRouter` for URL-based navigation, deep linking, and auth guard middleware.
* **`flutter-setup-localization`** — Configure `flutter_localizations`, `intl`, and `l10n.yaml`.

### 4.2 Data, Networking & Native Interop
* **`flutter-implement-json-serialization`** — Model serialization with `fromJson` / `toJson`.
* **`flutter-use-http-package`** — REST API integration (`GET`, `POST`, `PUT`, `DELETE`).
* **`dart-setup-ffi-assets`** — Compile and bundle C/C++ native assets via `hook/build.dart` and `hook/link.dart`.
* **`dart-use-ffigen`** — Auto-generate FFI bindings for C/Objective-C/Swift integrations using `package:ffigen`.

### 4.3 Dart Code Quality & Testing
* **`dart-run-static-analysis`** — Run `dart analyze` and `dart fix --apply`.
* **`dart-fix-runtime-errors`** — Inspect stack traces via MCP `get_runtime_errors`, apply fixes, and verify via `hot_reload`.
* **`dart-resolve-package-conflicts`** — Troubleshoot and resolve `pub get` dependency version conflicts.
* **`dart-use-pattern-matching`** & **`dart-use-primary-constructors`** — Modern Dart 3+ syntax patterns.
* **`dart-write-documentation`** — Effective Dart `///` API documentation guidelines.
* **`dart-build-cli-app`** — Cross-platform Dart CLI utilities and exit code conventions.
* **`dart-add-unit-test`**, **`dart-generate-test-mocks`**, **`dart-collect-coverage`**, **`dart-migrate-to-checks-package`** — Unit testing and LCOV coverage.
* **`flutter-add-widget-test`**, **`flutter-add-widget-preview`**, **`flutter-add-integration-test`** — Component, preview, and Flutter Driver E2E tests.

### 4.4 Android & Device Bridge Tooling
* **`android-cli`** — Manage Android SDK components, create/inspect Android Virtual Devices (AVDs), capture screenshots, and inspect UI hierarchies.
* **`managing-phone-bridge`** — Starts the local Node.js phone bridge server on port `8080` and generates connection QR codes for physical device testing.

---

## 5. Security, RBAC, Threat Modeling & Compliance Skills

| Category | Skill Name | Purpose |
| :--- | :--- | :--- |
| **Auth & RBAC** | `auth-implementation-patterns` | JWT, OAuth2, session management, and multi-tier RBAC access control. |
| **Auth & RBAC** | `mediahive-permissions-matrix` | Enforce and audit multi-tier Role-Based Access Control (RBAC) across UI drawers, modals, and API routes. |
| **Secure Coding** | `backend-security-coder` | Input validation (Zod), SQL injection prevention, API security, and multi-tenant isolation. |
| **Secure Coding** | `frontend-security-coder` | XSS prevention, output sanitization, and client-side security patterns. |
| **Secure Coding** | `frontend-mobile-security-xss-scan` | Deep XSS vulnerability scanning across React and web views. |
| **Secure Coding** | `mobile-security-coder` | Mobile secure storage (`FlutterSecureStorage`), WebView nonce exchange handoffs, and mobile input validation. |
| **Auditing & SAST** | `security-auditor` | Comprehensive DevSecOps auditing, OWASP compliance, and vulnerability assessment. |
| **Auditing & SAST** | `security-scanning-security-hardening` | Multi-layer security hardening across application and infrastructure. |
| **Auditing & SAST** | `security-scanning-security-sast` & `sast-configuration` | Static Application Security Testing (SAST) configuration and execution. |
| **Supply Chain** | `dependency-management-deps-audit` & `security-scanning-security-dependencies` | Dependency vulnerability scanning, license compliance, and SBOM generation. |
| **Secrets** | `secrets-management` | CI/CD secrets management (Vault, AWS Secrets Manager, rotation policies). |
| **Threat Modeling** | `threat-modeling-expert`, `stride-analysis-patterns`, `attack-tree-construction`, `threat-mitigation-mapping`, `security-requirement-extraction` | End-to-end STRIDE/PASTA threat modeling, attack trees, and security test derivation. |
| **Compliance** | `gdpr-data-handling`, `security-compliance-compliance-check`, `legal-advisor` | GDPR, SOC2, HIPAA, PCI-DSS compliance checks, privacy by design, and legal/privacy documentation. |

---

## 6. Testing, Code Review & CI/CD DevOps Skills

* **`code-review`** & **`autofix`** *(CodeRabbit Plugin)* — Run CodeRabbit CLI reviews on local committed/uncommitted changes and safely apply GitHub PR review-thread fixes.
* **`code-reviewer`** — AI-powered static analysis, security, and reliability code review before commits.
* **`exploratory-qa-auditor`** & **`verification-quality`** *(in `.claude/skills/`)* — Comprehensive QA verification and 0.95 truth-score quality gates.
* **`playwright-testing`** — Author, execute, and debug Playwright E2E test suites, network interceptors, and auth storage states.
* **`cicd-automation-workflow-automate`**, **`deployment-engineer`**, **`deployment-pipeline-design`** — GitHub Actions workflows, multi-stage approval gates, progressive delivery, and zero-downtime deployments.
* **`cloud-architect`**, **`terraform-specialist`**, **`network-engineer`** — AWS/Azure/GCP multi-cloud architecture, Terraform/OpenTofu IaC, and zero-trust networking.
* **`framework-migration-deps-upgrade`** — Incremental, low-risk framework and dependency upgrades.

---

## 7. Multi-Agent Swarms, Memory & Token Optimization Skills

### 7.1 Local Model & Token Routing
* **`token-smart-router`** & **`token-optimization`** — Pre-task orchestrators that route safe code/text tasks to local models (Ollama / Qwen / OpenCode) via MCP to minimize cloud API token costs.

### 7.2 Project-Local Ruflo & AgentDB Skills (`.claude/skills/`)
Installed in `.claude/skills/` when `ruflo` is initialized:
* **Swarm & Workflow Orchestration:**
  * `swarm-orchestration`, `swarm-advanced`, `v3-swarm-coordination`
  * `sparc-methodology`, `stream-chain`, `pair-programming`, `hooks-automation`, `skill-builder`, `browser`
* **AgentDB & ReasoningBank Memory:**
  * `agentdb-advanced`, `agentdb-learning`, `agentdb-memory-patterns`, `agentdb-optimization`, `agentdb-vector-search`
  * `reasoningbank-agentdb`, `reasoningbank-intelligence`, `v3-memory-unification`
* **GitHub Multi-Repo & Release Automation:**
  * `github-code-review`, `github-multi-repo`, `github-project-management`, `github-release-management`, `github-workflow-automation`
* **V3 Architecture Modules:**
  * `v3-cli-modernization`, `v3-core-implementation`, `v3-ddd-architecture`, `v3-integration-deep`, `v3-mcp-optimization`, `v3-performance-optimization`, `v3-security-overhaul`

---

## 8. AI & External Platform Integrations

* **`gemini-api-dev`** — Official `@google/genai` (TS/JS) and `google-genai` (Python) SDK patterns for text generation, multimodal input, structured output, function calling, and embeddings.
* **`gemini-live-api-dev`** — Real-time bidirectional WebSocket audio/video/text streaming with Gemini Live API, Voice Activity Detection (VAD), and session management.
* **`gemini-omni-flash-api`** — Generative video editing, text-to-video, and frame transitions using Gemini Omni Flash.
* **`google-maps-platform`** — Grounded implementation of Google Maps Platform SDKs, Places, Geocoding, Eco-friendly Routes, and 3D maps across Web, Android, and iOS.

---

## 9. Snippet to Add to Your Project's `AGENTS.md` / `CLAUDE.md`

Have your agent append the following block to your repository's `AGENTS.md` (or `CLAUDE.md`):

```markdown
<!-- BEGIN:project-skills -->
# Project Skills

The following skills are available for this project. Use them when relevant:

1. **graphify** — Build a queryable knowledge graph from any folder (code, docs, PDFs). Saves token costs by using a compact graph instead of reading every source file. Install: `~/.claude/skills/graphify/`. Trigger: `/graphify`.
2. **awesome-design-md** — Design reference files from major brands (Stripe, Linear, Vercel, etc.). Install: `~/.claude/skills/awesome-design-md/`.
3. **gsd-core** (Get Shit Done) — Meta-prompting and context engineering framework. Commands: `/gsd-new-project`, `/gsd-help`. Install: `npx @opengsd/gsd-core@latest`.
4. **ecc** (Everything Claude Code) v2.2.3 — 293 skills + 71 agents (`full` profile, hooks declined) covering code review, accessibility audits, TDD, testing, security scanning, and specialized workflows. Install: `npx ecc-universal@2.2.3 install --profile full --target claude --no-hooks`.
5. **ui-ux-pro-max** — Design intelligence skill with 57 UI styles, 95 color palettes, 56 font pairings, and 99 UX guidelines. Install: `.opencode/skills/ui-ux-pro-max/`.
6. **ruflo** (agent meta-harness) v3.56.9 — MCP server `claude-flow` registered via `.mcp.json`. 30 skills, 16 commands, 17 agents in project `.claude/`. Use proactively on multi-file/complex features for swarm coordination, agent memory, and background workers.
<!-- END:project-skills -->
```
