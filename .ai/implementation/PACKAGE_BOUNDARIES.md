# PACKAGE_BOUNDARIES.md — Monorepo Package Architecture

> **Specification Tier**: Implementation Masterplan (AIOS 6.0)  
> **Source of Truth**: `.ai/implementation/PACKAGE_BOUNDARIES.md`

---

## 1. Monorepo Package Definitions

### 1.1 `@thaiba/auth` (`packages/auth/`)
* **Purpose**: Centralized authentication tokens, session payloads, role definitions, and permission matrices.
* **Responsibilities**: Encapsulates `jose` JWT verification, `bcryptjs` password comparisons, and `hasPermission(role, permission)` evaluation.
* **Public APIs**: `verifySession()`, `createSession()`, `hasPermission()`, `StaffRole`, `SessionPayload`.
* **Forbidden Dependencies**: MUST NOT import React components, database ORM instances, or Next.js route contexts.

### 1.2 `@thaiba/db` (`packages/db/`)
* **Purpose**: Canonical physical database schemas and Drizzle ORM mappings.
* **Responsibilities**: Dual-dialect table definitions (`schema.ts` for SQLite, `schema.pg.ts` for PostgreSQL), relational indexes, and constraints.
* **Public APIs**: Exported table objects (`students`, `staff`, `financialTransactions`, `attendanceLogs`).
* **Forbidden Dependencies**: MUST NOT import authentication logic, UI components, or external HTTP clients.

---

# MODULE_DEPENDENCIES.md — Domain Dependency Direction Specification

```
                          ┌───────────────────────────┐
                          │   UI / PRESENTATION LAYER │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │    API ROUTE HANDLERS     │
                          └─────────────┬─────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
┌─────────────────────────┐┌─────────────────────────┐┌─────────────────────────┐
│     @thaiba/auth        ││    SHARED SERVICES      ││       @thaiba/db        │
│  (Session & RBAC Matrix)││ (Storage, Push, Log)   ││   (Drizzle Schema DB)   │
└─────────────────────────┘└─────────────────────────┘└─────────────────────────┘
```

---

# SHARED_SERVICES.md — Master Platform Services Specification

## 1. Platform Service Catalog

### 1. Authentication Guard Service (`src/lib/api/auth-guard.ts`)
* **Interface**: `requireAuth(handler, permission?)`
* **Consumer**: All protected API Route Handlers.
* **Function**: Decodes JWT from `thb_session` cookie, verifies DB session freshness, enforces permission strings, logs security violations.

### 2. Activity & Audit Service (`src/lib/api/activity-log.ts`)
* **Interface**: `logActivity(payload)`
* **Consumer**: All write API route handlers.
* **Function**: Appends lightweight timeline events to `activity_logs` and structured JSON diffs to `audit_log`.

### 3. File Storage Service (`src/lib/storage.ts`)
* **Interface**: `uploadToSupabase()`, `downloadFromSupabase()`, `deleteFromSupabase()`
* **Consumer**: Upload API, MediaHive, Avatar Uploader, Document Circulars.
* **Function**: Manages REST uploading, signed download URL proxying, range-request streaming, and local `/uploads/` dev fallback.

### 4. Push Notification Service (`src/lib/sendPush.ts`)
* **Interface**: `sendPushNotificationToStaff(staffIds[], payload)`
* **Consumer**: Workflow Engine, Task Manager, Event Dispatcher.
* **Function**: Looks up FCM tokens in `staff_device_tokens`, dispatches push via Firebase Admin SDK, prunes dead tokens.

### 5. Realtime SSE Broadcast Engine (`src/lib/api/realtime.ts`)
* **Interface**: `broadcastDashboardEvent()`, `broadcastInstitutionEvent()`, `broadcastPresence()`
* **Consumer**: Presence Tracker, Chat Engine, Notification Center.
* **Function**: Stream events to connected client SSE channels with debounced disconnect handling.
