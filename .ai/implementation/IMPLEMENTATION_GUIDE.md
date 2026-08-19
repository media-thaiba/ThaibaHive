# IMPLEMENTATION_GUIDE.md — Solution Architecture & Implementation Philosophy

> **Specification Tier**: Implementation Masterplan (AIOS 6.0)  
> **Source of Truth**: `.ai/implementation/IMPLEMENTATION_GUIDE.md`  
> **Standards Alignment**: Google Engineering Standards / Atlassian Architecture Blueprint

---

## 1. Solution Architecture Philosophy

ThaibaHive Institution OS is implemented as a **Clean Layered Monolithic Monorepo** targeting high developer velocity during phase one, while establishing strict logical package boundaries to allow independent microservice extraction if scale demands it in future years.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PRESENTATION LAYER                                     │
│  Next.js 16 App Router (RSC + Client Components) | Workspaces | Wizards | Flutter Shell│
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                APPLICATION / SERVICE LAYER                             │
│  API Route Handlers (/api/*) | Security Guards (requireAuth) | Shared Platform Services│
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                DOMAIN & PACKAGES LAYER                                 │
│  @thaiba/auth (RBAC, JWT) | @thaiba/db (Drizzle Dialects) | Validation Schemas       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PERSISTENCE & INFRASTRUCTURE                             │
│  SQLite (dev.db) / PostgreSQL (Prod) | Supabase Storage | SSE Realtime Hub             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Implementation Principles

### 1. Dependency Inversion
Higher-level UI components and route handlers depend on abstract platform service interfaces (`requireAuth`, `logActivity`, `sendPushNotificationToStaff`) rather than concrete third-party SDK calls directly.

### 2. Feature Isolation
Business domains operate within dedicated route namespaces (`/api/academic/`, `/api/erp/fees/`). Cross-domain dependencies MUST interact via published domain events or shared platform services.

### 3. Progressive Enhancement
Core capabilities (e.g., attendance marking, fee collection) operate robustly over standard HTTPS web interfaces, while enhanced capabilities (NFC tapping, FCM push notifications, offline local cache) activate automatically on native mobile devices.

---

# MONOREPO_STRUCTURE.md — Repository Topology & Boundary Specification

## 1. Repository Topology

```
D:\ThaibaHive\
├── .ai/                      # AIOS 3.0-6.0 Authoritative Architecture Knowledge Base
├── packages/                 # Monorepo Shared Workspace Packages
│   ├── auth/                 # @thaiba/auth — RBAC, JWT, roles, permissions
│   └── db/                   # @thaiba/db — Drizzle schemas (SQLite + PostgreSQL)
├── src/
│   ├── app/                  # Next.js 16 App Router (Pages, API Route Handlers)
│   ├── components/           # Reusable UI Primitives & Workspaces
│   ├── config/               # Navigation & Feature Gating whitelist
│   ├── contexts/             # AuthContext, ThemeContext
│   ├── hooks/                # React Hooks (Realtime, Debounce, Presence)
│   ├── lib/                  # Utilities (auth-guard, crypto, storage, validation)
│   └── types/                # Shared TypeScript Type Definitions
└── thaibahive_mobile_app/    # Flutter Mobile Shell Companion Project
```

## 2. Import Dependency Rules
* `src/app/` MAY import from `src/components/`, `src/lib/`, `@thaiba/auth`, and `@thaiba/db`.
* `packages/auth` MUST NOT import from `packages/db` or `src/`.
* `packages/db` MUST NOT import from `src/`.
* Circular dependencies between route modules or packages are strictly prohibited.
