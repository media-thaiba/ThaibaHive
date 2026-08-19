# REALTIME_ARCHITECTURE.md — Server-Sent Events (SSE) Architecture

> **Specification Tier**: Implementation Masterplan (AIOS 6.0)  
> **Source of Truth**: `.ai/implementation/REALTIME_ARCHITECTURE.md`

---

## 1. SSE Realtime Infrastructure (`src/lib/api/realtime.ts`)

* **Channel Registry**: `Map<string, Set<SSEConnection>>` attached to `globalThis` to survive Next.js dev HMR.
* **Broadcasting Methods**:
  * `broadcastDashboardEvent(staffId, channel, data)`: Per-user targeted notification channel.
  * `broadcastInstitutionEvent(institutionId, channel, data)`: Campus-wide event stream.
  * `broadcastPresence(staffId, online, lastSeenAt)`: Presence updates scoped to shared campuses.
* **Debounced Disconnect**: 5-second disconnect buffer preventing false offline status during brief network flickers.

---

# CACHE_STRATEGY.md — Multi-Layer Caching Specification

1. **Browser Cache**: Static Next.js assets (`_next/static`) cached with `max-age=31536000`.
2. **API Route Cache Control**: All `/api/*` handlers enforce `Cache-Control: no-store` via `proxy.ts`.
3. **Client Server State**: TanStack Query manages in-memory API response caching with configurable `staleTime`.
4. **Target Redis Layer**: Production target state introduces Redis for distributed rate limiting and global session caching.

---

# OBSERVABILITY.md — Structured Logging & Diagnostics

* **Structured JSON Logging**: API errors and security violations output structured JSON logs with event names, user IDs, URLs, and timestamps.
* **Telemetry Diagnostics**: System health and version checks exposed via `/api/telemetry` and `/api/system`.

---

# DEPLOYMENT_ARCHITECTURE.md — Production Cloud Deployment

```
   INBOUND CLIENT TRAFFIC
              │
              ▼
┌───────────────────────────┐
│ Next.js Proxy Middleware  │ (Security Headers, Rate Limit, Body Caps)
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│ Next.js Server App Cluster│ (Monolithic API & Workspace SSR)
└─────────────┬─────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ PostgreSQL DB│  │ Supabase Storage │
└──────────────┘  └──────────────────┘
```

---

# SCALING_GUIDE.md — Horizontal & Vertical Scaling Blueprint

1. **Phase 1 (Single Node Monolith)**: Current production model using Next.js on single instance with SQLite or hosted PG.
2. **Phase 2 (Clustered Stateless Nodes)**: Migrate in-memory rate limiting and SSE registry to Redis Pub/Sub to allow multi-instance web scaling.
3. **Phase 3 (Database Sharding)**: Shard PostgreSQL database by `institution_id` if group campus volume exceeds 1,000,000 active students.
