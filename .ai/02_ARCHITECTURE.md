# 02_ARCHITECTURE.md — ThaibaHive Technical Platform Architecture

> **Classification**: Core System Architecture & Infrastructure Specification  
> **Source of Truth**: `.ai/02_ARCHITECTURE.md`

---

## 1. Overall Platform Architecture

ThaibaHive Institution OS is structured as a **Modular Monolith** built on Next.js 16 (App Router), leveraging pnpm workspace packages for core business logic (`@thaiba/auth`, `@thaiba/db`) and a Flutter companion application for mobile-native interactions.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PRESENTATION LAYER                                     │
│  Next.js 16 React Server Components | Client Workspaces | Flutter Native Shell (WebView)│
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                APPLICATION / API LAYER                                 │
│  Next.js Route Handlers (/api/*) | requireAuth Security Guard | Zod Schemas | SSE Hub  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              SHARED DOMAIN PACKAGES                                    │
│  @thaiba/auth (JWT, Roles, RBAC) | @thaiba/db (Drizzle ORM Dialect Layer)               │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  DATA & PERSISTENCE                                    │
│  SQLite (dev.db) / PostgreSQL (Prod) | Supabase Storage | Redis Pub/Sub (Target State)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Platform Core Subsystems

### 2.1 Web Platform Shell (`src/app/(shell)`)
* **Framework**: Next.js 16 App Router over React 19.
* **Layout**: Sticky header (`ShellNav`), responsive desktop sidebar (`SidebarNav`), mobile bottom bar (`BottomNav`), lazy-loaded Command Palette (`CommandPalette`, Cmd+K).
* **Feature Gating**: Controlled by `navigation.ts` via `ENABLED_PATHS` whitelist gating.

### 2.2 Shared Package Monorepo (`packages/`)
* **`packages/auth` (`@thaiba/auth`)**: Centralized RBAC matrix (`roles.ts`), JWT signing/verification (`session.ts`), permission evaluator (`hasPermission()`).
* **`packages/db` (`@thaiba/db`)**: Dual Drizzle ORM schema definition (`schema.ts` for SQLite dev, `schema.pg.ts` for PostgreSQL production).

### 2.3 Mobile Platform (`thaibahive_mobile_app/`)
* **Framework**: Flutter 3.2+ with Riverpod state management.
* **Handoff Authentication**: Secure Nonce Exchange via `/api/auth/mobile-handoff/nonce` storing tokens in `FlutterSecureStorage`.
* **Native Features**: NFC tag scanning (`nfc_manager`), FCM push listening (`firebase_messaging`), background presence service, offline Hive DB cache (`hive_flutter`).

### 2.4 Media Platform (`src/app/api/media` & `src/lib/storage.ts`)
* **Capabilities**: Range-streamed media delivery, chunked upload pipeline with SHA-256 integrity verification, folder hierarchy, shareable link expiration.
* **Storage Provider**: Supabase Storage with automatic dev fallback to local `/uploads/`.

---

## 3. Database & Persistence Architecture

### 3.1 Dual-Dialect Strategy
To preserve zero-config local development speed while guaranteeing cloud production scalability, the ORM maintains dual schemas:
* **Development**: `better-sqlite3` driver executing against `dev.db`.
* **Production**: `@libsql/client` or PostgreSQL (`pg`) managed via Supabase / AWS RDS.

### 3.2 Schema Rules
1. **Primary Keys**: UUID v4 strings generated via `crypto.randomUUID()`.
2. **Timestamps**: Stored as ISO 8601 strings (`text` type in SQLite, `timestamptz` in PG).
3. **Booleans**: Stored as `integer` mode boolean (`0` or `1`) in SQLite.
4. **Soft Deletions**: Enforced via `isActive` boolean or `deletedAt` ISO timestamp on master records.

---

## 4. Security, Auth & RBAC Architecture

### 4.1 Authentication Flow
1. User submits credentials to `POST /api/auth/login`.
2. Password verified via `bcryptjs.compare()`.
3. Active status and `tokenVersion` checked in `staff` or `students` DB table.
4. `jose` signs HS256 JWT containing `{ staffId, email, role, tokenVersion }`.
5. Cookie set: `thb_session` with `httpOnly: true`, `secure: true` (prod), `sameSite: lax`, `maxAge: 24h` (or 7d).

### 4.2 Middleware & Proxy Hardening (`src/proxy.ts`)
* Scanner Path Blocking (`/wp-admin`, `/.env`, `/.git` → 404).
* Request Body Size Limits (5 MB max on write APIs).
* Security Headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy`).
* Global Cache Control: `no-store` on all `/api/*` routes.

### 4.3 RBAC Permission Wrapper (`src/lib/api/auth-guard.ts`)
Every API route MUST be wrapped in `requireAuth(handler, "domain:permission")`:
```
export const POST = requireAuth(async (request, session) => {
  // Handler logic execution
}, "finance:receipt:create");
```

---

## 5. Shared Services & Communication Engine

### 5.1 Realtime Server-Sent Events (SSE) (`src/lib/api/realtime.ts`)
* In-memory registry (`Map<string, Set<SSEConnection>>`) stored on `globalThis`.
* Channels: `notification-${staffId}`, `institution-${institutionId}`, `presence`.
* Debounced disconnect handling (5-second grace period before setting user offline).

### 5.2 FCM Push Dispatcher (`src/lib/sendPush.ts`)
* Dispatches targeted push notifications to mobile devices via Firebase Admin SDK.
* Automatic dead token pruning on `UNREGISTERED` device response.

### 5.3 Activity & Audit Logging (`src/lib/api/activity-log.ts`)
* `activityLogs`: High-frequency, lightweight event stream for operational timelines.
* `auditLog`: Immutable, structured JSON audit detail table for financial and security compliance.

---

## 6. Target Production Scaling & Redis Migration Plan

```
  CURRENT DEV STATE (Single Process)            TARGET PRODUCTION STATE (Scaled Cluster)
┌──────────────────────────────────┐          ┌──────────────────────────────────┐
│  Next.js Server Instance         │          │  Next.js Server Instances (N)    │
│  - In-Memory SSE Registry        │          │  - Stateless Server Handlers     │
│  - In-Memory Rate Limiter        │          └────────────────┬─────────────────┘
│  - SQLite (dev.db)               │                           │
└──────────────────────────────────┘                           ▼
                                              ┌──────────────────────────────────┐
                                              │  Redis Infrastructure Cluster    │
                                              │  - Pub/Sub SSE Broadcast Engine  │
                                              │  - Distributed Rate Limiter      │
                                              │  - Global Session Cache          │
                                              └────────────────┬─────────────────┘
                                                               │
                                                               ▼
                                              ┌──────────────────────────────────┐
                                              │  PostgreSQL Managed Cluster      │
                                              └──────────────────────────────────┘
```

1. **Redis Pub/Sub Layer**: Replace `globalThis.sseConnections` with Redis Pub/Sub to allow SSE broadcasts across multi-node server clusters.
2. **Distributed Rate Limiting**: Migrate `src/lib/api/rate-limit.ts` from in-memory Map to Redis sliding-window algorithm.
3. **Database Connection Pooling**: Deploy PgBouncer in front of PostgreSQL for high-concurrency transaction handling.
