# ThaibaHive

The unified multi-campus enterprise management and learning operations platform for Thaiba Garden Group of Institutions (23+ campuses, 800–1,000 staff).

---

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env

# Initialize database (SQLite dev / PostgreSQL prod)
pnpm db:push
pnpm db:seed

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) or navigate to [http://localhost:3000/docs](http://localhost:3000/docs) for the interactive OpenAPI documentation.

---

## 🏗️ Monorepo Architecture

ThaibaHive is structured as a high-performance pnpm monorepo combining Next.js 16 full-stack App Router, shared core packages, and a cross-platform Flutter companion application:

```
ThaibaHive/
├── src/                                  # Next.js 16 Web Application (App Router & React 19)
│   ├── app/
│   │   ├── (public)/                     # Login, onboarding, public enquiry portals
│   │   ├── (shell)/                      # Authenticated dashboard pages (Staff, Attendance, Reviews, Finance, Operations)
│   │   │   └── docs/                     # Interactive Swagger/OpenAPI API documentation viewer
│   │   └── api/                          # Next.js Serverless & Node Route Handlers
│   │       ├── auth/                     # JWT session creation, WebAuthn, OAuth, Nonce Handoff
│   │       ├── realtime/events/          # SSE stream for user presence & instant token revocation
│   │       ├── vision/stream/            # SSE stream for live ALPR, threat detection, and CCTV alerts
│   │       ├── workspaces/sse/           # SSE stream for collaborative workspaces with 5s keep-alive
│   │       ├── mobile/v1/sync/           # Offline delta sync (Pull / Push) with CRDT resolution
│   │       ├── openapi.json/             # Official OpenAPI 3.1 specification endpoint
│   │       └── system/                   # Health checks, Prometheus metrics, and failover drills
│   ├── components/ui/                    # Reusable Radix UI & Tailwind component primitives
│   └── lib/                              # Core engines, APM telemetry, RBAC guard, and crypto utilities
│
├── packages/
│   ├── auth/                             # Auth package (@thaiba/auth: JWT, DPoP, roles, permissions)
│   └── db/                               # DB package (@thaiba/db: Drizzle schema, SQLite/PG dialects)
│
├── thaibahive_mobile_app/                # Mobile Companion App (Flutter 3.41 / Dart 3.11)
│   ├── lib/                              # Riverpod state management, GoRouter, Secure Storage
│   └── test/                             # 78 unit, widget, and offline sync test suites
│
├── load-tests/                           # Concurrency & Streaming Load Test Harnesses
└── scripts/
    ├── dr/                               # Disaster recovery drill runners & failover verifiers
    └── staging/                          # Staging preflight smoke tests & dependency canary scanners
```

---

## 📚 OpenAPI 3.1 Specification

ThaibaHive exposes a complete, validated **OpenAPI 3.1.0** specification accessible at runtime:

- **JSON Endpoint**: `GET /api/openapi.json`
- **Interactive UI**: `GET /docs` (Swagger UI embedded in the application shell)
- **Supported Modules**:
  - **Authentication & Nonce Handoff**: `/api/auth/login`, `/api/auth/me`, `/api/auth/mobile-handoff`
  - **Staff & Academic Operations**: `/api/staff`, `/api/attendance/check-in`, `/api/leaves`, `/api/reviews`
  - **Real-Time Streaming**: `/api/realtime/events`, `/api/vision/stream`, `/api/workspaces/sse`
  - **Mobile Sync & MDM**: `/api/mobile/v1/sync/pull`, `/api/mobile/v1/sync/push`
  - **System Resilience & Telemetry**: `/api/system/health`, `/api/system/metrics`, `/api/system/failover`

---

## ⚡ Real-Time Streaming & Concurrency Architecture

ThaibaHive implements zero-leak, high-concurrency Server-Sent Events (SSE) across three core real-time channels:

1. **User Revocation & Presence** (`/api/realtime/events`):
   - Dispatches initial handshake frames and polls token versions in the database.
   - Emits `session_invalidated` or `account_deactivated` frames immediately upon privilege revocation.
2. **Computer Vision & Threat Alerts** (`/api/vision/stream`):
   - Streams ALPR plate scans, perimeter alerts, and slip-and-fall anomaly telemetry.
3. **Collaborative Workspaces** (`/api/workspaces/sse`):
   - Broadcasts collaborative mutations with a keep-alive heartbeat (`: ping\n\n`) to prevent carrier disconnections.

---

## 📱 Mobile Companion Workspace (`thaibahive_mobile_app`)

- **State Management**: Flutter Riverpod with immutable state models.
- **Offline Sync**: Offline-first mutation outbox with optimistic local updates and CRDT conflict resolution.
- **Hardware Integration**: NFC tag check-in, biometric biometric authentication (`local_auth`), and CameraX scanning.
- **WebView Nonce Handoff**: Single-use cryptographic nonce exchange (`/api/auth/mobile-handoff`) allowing secure, seamless transitions into authenticated web drawers without manual credential entry.

---

## 🛡️ Quality Gates & Verification

```bash
# Run web test matrix (Jest)
pnpm test

# Run real-time streaming load benchmark (50 VUs per stream)
npx tsx load-tests/streaming-concurrency-benchmark.ts

# Run TypeScript typecheck
npx tsc --noEmit

# Run ESLint analysis
pnpm lint

# Run mobile tests & analyzer
cd thaibahive_mobile_app
flutter test
flutter analyze lib/
```

---

## 📄 License

Proprietary © Thaiba Garden Group of Institutions. All rights reserved.
