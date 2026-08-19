# DECISION_FRAMEWORK.md — Technology & Architecture Decision Matrix

> **Specification Tier**: Strategic Governance Framework (AIOS 7.0)  
> **Source of Truth**: `.ai/governance/DECISION_FRAMEWORK.md`

| Decision Category | Primary Standard | Evaluation Threshold | Fallback / Alternative |
| :--- | :--- | :--- | :--- |
| **Framework Choice** | Next.js 16 App Router | RSC performance, serverless route co-location | Vite SPA (Only for isolated client tools) |
| **Database ORM** | Drizzle ORM | Type safety, zero-overhead SQL compilation, dual dialect | Kysely / Raw SQL (Only for hyper-complex analytical CTEs) |
| **State Management**| TanStack Query v5 | Server state caching, background revalidation | React Context (Only for global auth/theme state) |
| **Mobile Native** | Flutter 3.2+ | Cross-platform WebView shell, NFC/FCM native bindings | React Native (Prohibited to prevent stack fragmentation) |
| **Realtime Engine** | Server-Sent Events (SSE) | Native HTTP streaming, automatic reconnect | WebSockets (Reserved for future multi-party whiteboards) |

---

# QUALITY_MODEL.md — Measurable Enterprise Quality Metrics

1. **Reliability & Availability**: 99.9% uptime SLA for cloud production clusters.
2. **Performance SLA**: p95 API response latency < 15ms for auth verification, < 40ms for workspace rendering.
3. **Security Quality**: Zero OWASP Top 10 vulnerabilities; 100% AES-256-GCM encryption on stored face vectors.
4. **Code Quality**: Zero TypeScript errors (`tsc --noEmit`), zero ESLint errors (`pnpm lint`), 100% passing unit tests (231/231 tests).

---

# AI_GOVERNANCE.md — Safety & Ethical AI Framework

* **Non-Irreversible Action Guard**: Ambient AI agents CANNOT issue final grade report cards, execute fee refunds, or delete master identity records without explicit human sign-off.
* **The Draft & Propose Pattern**: AI outputs pre-filled draft requisitions, draft tasks, and proposed reminder schedules.
* **Audit Trail**: Every AI inference recommendation and background trigger is logged to `activity_logs`.

---

# SECURITY_GOVERNANCE.md — Security & Threat Modeling Policy

* **Authentication & Sessions**: `httpOnly` secure cookies, HS256 JWTs via `jose`, single-click global token revocation via `tokenVersion`.
* **Database Security**: Mandatory `requireAuth` permissions on all routes; TLS 1.3 enforced on database connections.

---

# DATA_GOVERNANCE.md — Data Stewardship & Lifecycle Policy

* **Master Data Authority**: `students`, `staff`, `institutions`, and `financial_transactions` tables serve as authoritative master data sources.
* **Data Lineage & Audit**: All mutations written to immutable `audit_log` with JSON diffs.
