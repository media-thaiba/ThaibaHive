# 00_START_HERE.md — ThaibaHive Institution OS (AIOS 3.0) Entry Point

> **System Status**: Active | **Version**: AIOS 3.0.0-V1 | **Classification**: Authoritative Knowledge Base  
> **Source of Truth**: `.ai/` Directory | **Governing Architecture**: Multi-Tenant / Multi-Institution Campus OS

---

## 1. What is ThaibaHive?

**ThaibaHive Institution OS** is a unified, enterprise-grade campus operating system built for the **Thaiba Garden Group of Institutions** (23+ campuses across Nepal) and designed to scale to any educational, residential, charitable, or vocational institution globally.

It transcends traditional software by integrating:
1. **Identity & Security Engine**: NFC, QR, biometric face recognition, JWT session management, RBAC authorization, and httpOnly token security.
2. **Workplace & Academic Platform**: Daily attendance, tasks, leaves, reports, circulars, events, polls, helpdesk, assets, media library, and classes.
3. **Institutional ERP**: Finance, fee collection, payroll, inventory, hostel management, fleet/transport, library, admissions, and compliance.
4. **AIOS Experience Layer**: Task-driven wizard workflows, role-based workspaces, universal search, entity timelines, and proactive AI event triggers.

---

## 2. Vision & Mission

* **Vision**: To render traditional, administrative ERP systems obsolete by creating an intuitive, human-centered "Institution OS" where users interact through intent-focused workspaces rather than raw database tables.
* **Mission**: To provide a single, unified operating system for schools, colleges, hostels, orphanages, NGOs, moral academies, and coaching centers that streamlines operations, enforces institutional security, protects privacy, and drives proactive administrative intelligence.

---

## 3. Technology Stack Summary

| Layer | Primary Technology | Context & Usage |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.2 (App Router) | Monolithic web application, Server Components, Route Handlers |
| **UI Engine** | React 19.2 + Tailwind CSS 3.4 | Custom design system (`globals.css`), Radix UI primitives, Lucide icons |
| **Mobile Native** | Flutter 3.2+ (Riverpod 2.5) | WebView handoff shell, NFC card scanner, FCM push, offline Hive cache |
| **State Management**| TanStack Query v5 + React Context | Server state caching & global Auth/Theme context |
| **Database & ORM** | Drizzle ORM 0.45 + SQLite / PostgreSQL | Dual-dialect schema (`schema.ts` dev SQLite, `schema.pg.ts` prod PG) |
| **Authentication** | `jose` (JWT) + `bcryptjs` | `httpOnly` secure cookies, 24h default / 7d extended sessions |
| **Realtime Engine** | Server-Sent Events (SSE) | Presence tracking, live notifications, institutional broadcasts |
| **Push & Communications**| Firebase Admin SDK + Resend API | Mobile FCM push notifications & transactional email delivery |
| **File Storage** | Supabase Storage API | Range-streamed media uploads, document management, avatars |

---

## 4. Repository Structure

```
D:\ThaibaHive\
├── .ai/                      # ← AIOS 3.0 AUTHORITATIVE KNOWLEDGE BASE
│   ├── 00_START_HERE.md      # Entry point & AI session instructions
│   ├── 01_PROJECT_MANIFEST.md # Philosophy, goals, principles, institution types
│   ├── 02_ARCHITECTURE.md    # Platform architecture, middleware, packages, DB
│   ├── 03_EXPERIENCE_ARCHITECTURE.md # Workspaces, Timelines, Universal Search, AI Layer
│   ├── 04_DOMAIN_MODEL.md    # Business entities, lifecycles, and ownership rules
│   ├── 05_AI_RULES.md        # 100 Non-negotiable architectural rules for AI agents
│   ├── 06_CODING_STANDARDS.md# Code quality, naming, structure, testing guidelines
│   ├── 07_DESIGN_SYSTEM.md   # Tokens, typography, animation, UI primitives
│   └── 08_DECISION_LOG.md    # Architectural Decision Records (ADRs 001–010)
├── packages/
│   ├── auth/                 # @thaiba/auth — Shared RBAC, JWT verification, roles
│   └── db/                   # @thaiba/db — Drizzle schemas (SQLite + PG)
├── src/
│   ├── app/                  # Next.js App Router (Shell, Public, API, Auth)
│   ├── components/           # UI primitives & feature-specific components
│   ├── config/               # Navigation definitions & whitelist gating
│   ├── contexts/             # AuthContext, ThemeContext
│   ├── hooks/                # Custom React hooks (realtime, debounce, presence)
│   ├── lib/                  # Utilities (auth-guard, crypto, storage, validation)
│   └── types/                # Shared TypeScript definitions
├── thaibahive_mobile_app/    # Flutter companion app for Android/iOS
└── AGENTS.md                 # Agent execution rules & project skills
```

---

## 5. How AI Agents Must Begin Every Session

Whenever an AI agent (Claude, Gemini, Qoder, Antigravity, Copilot, ChatGPT, etc.) initializes a new session on this repository, it **MUST** follow this startup sequence:

```
┌────────────────────────────────────────────────────────┐
│  1. Read .ai/00_START_HERE.md                          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  2. Read .ai/05_AI_RULES.md (Verify 100 Rules)         │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  3. Read Task-Specific Knowledge Base File             │
│     - Architecture task? -> Read 02_ARCHITECTURE.md   │
│     - UI/UX task?        -> Read 03_ & 07_           │
│     - Domain/Data task?  -> Read 04_DOMAIN_MODEL.md     │
│     - Code edit task?    -> Read 06_CODING_STANDARDS.md│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  4. Execute Task Aligned with Decision Log (08_)       │
└────────────────────────────────────────────────────────┘
```

---

## 6. AI Session Startup Checklist

Before making any code modifications, schema updates, or architecture proposals, execute the following verification steps:

- [ ] **Context Verification**: Read `.ai/00_START_HERE.md` and `.ai/05_AI_RULES.md`.
- [ ] **Scope Alignment**: Ensure changes fit into the **ThaibaHive Institution OS** model rather than creating standalone apps.
- [ ] **Institution Scoping**: Confirm all database mutations and query routes enforce `institutionId` isolation.
- [ ] **Dual Schema Sync**: Confirm that any schema addition in `packages/db/schema.ts` is mirrored in `packages/db/schema.pg.ts`.
- [ ] **RBAC Guard Enforcement**: Verify API Route Handlers are wrapped with `requireAuth(handler, "domain:permission")`.
- [ ] **No Code Duplication**: Check if existing utilities in `src/lib/` or shared components in `src/components/ui/` can be reused.
