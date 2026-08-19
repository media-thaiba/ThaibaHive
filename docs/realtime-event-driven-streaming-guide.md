# Predictive Multi-Campus Enterprise Resource Allocation & Real-Time Event-Driven Streaming Architecture Guide

**Version:** v2.4.0 (Sprint-012 Milestone)  
**Classification:** Technical Architecture & Operational Guide  

---

## 1. System Architecture Overview

ThaibaHive v2.4.0 introduces a **Real-Time Event-Driven Streaming Architecture** that transforms multi-campus enterprise operations from HTTP polling to continuous real-time streaming, automated intervention triggers, predictive retention scoring, interactive budget scenario simulations, and multi-region Redis Cluster key sharding.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Client Workspaces & Receivers                         │
│   (Next.js Admin Workspaces / Flutter Mobile Companion Real-Time Stream Receiver) │
└────────────────                       ▲                                 ────────┘
                                        │ (WebSocket / SSE Stream)
┌───────────────────────────────────────┴─────────────────────────────────────────┐
│                      Real-Time Streaming Service & SSE Handler                  │
│                     (Sequence Replay Buffer & Heartbeat Ping/Pong)              │
└────────────────                       ▲                                 ────────┘
                                        │ (Event Stream Frames)
┌───────────────────────────────────────┴─────────────────────────────────────────┐
│                Automated Trigger Engine & Remediation Bridge                     │
│               (SMS Provider Gateway & FCM/APNs Push Dispatch Router)            │
└────────────────                       ▲                                 ────────┘
                                        │ (Multi-Region Sharded State)
┌───────────────────────────────────────┴─────────────────────────────────────────┐
│               Redis Cluster Manager with Tenant Hashtag Key Sharding            │
│                        (thaiba:{tenant_id}:domain:key)                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Components

### 2.1 Redis Cluster Key Sharding (`redis-cluster-manager.ts`)
- **Key Syntax:** `thaiba:{tenant_id}:<domain>:<key>`
- **Slot Alignment:** The curly braces `{tenant_id}` force Redis Cluster CRC16 hash slot calculations to operate strictly on `tenant_id`, guaranteeing that all keys for a single tenant reside in the exact same cluster hash slot.
- **Failover:** Uses `InMemoryStateAdapter` for single-node local development environments or network fallback.

### 2.2 Dual-Channel Streaming Engine (`realtime-streaming-service.ts`, `sse-handler.ts`)
- **Primary Transport:** Full-duplex WebSockets for low-latency live copilot feeds.
- **Fallback Transport:** Server-Sent Events (SSE) with `Last-Event-ID` sequence headers for proxy-restricted enterprise networks.
- **Replay Buffer:** Holds up to 100 recent event frames per tenant channel for automatic client reconnection sync.

### 2.3 Automated Notification & Trigger Engine (`trigger-evaluation-engine.ts`, `automated-notification-router.ts`)
- **Trigger Evaluation:** Evaluates chronic absenteeism, fee defaults, grade drops, and compliance warnings against configurable rule conditions.
- **SMS Gateway Adapter:** Abstract HTTP client supporting Twilio and AWS SNS SMS provider formats with branded opt-out footers.
- **Rate Limiting:** Enforces a maximum of 3 SMS dispatches per recipient per 24-hour window using token bucket counters.

### 2.4 Predictive Retention & Scenario Simulation (`student-retention-predictor.ts`, `budget-scenario-simulator.ts`)
- **Retention Predictor:** Uses a logistic sigmoid model: $P(\text{Retention Risk}) = \frac{1}{1 + e^{-z}}$ where $z$ combines weighted absenteeism, grade drops, and fee delays.
- **Budget Simulator:** Evaluates multi-campus financial reallocations (staff cost, tuition, facility, scholarship deltas) under 100ms SLA bounds using deterministic matrix transformation algorithms.

---

## 3. Data Schemas & API Routes

### 3.1 Drizzle ORM Tables (`packages/db/schema.ts`)
- `realtime_stream_sessions`: Tracks active WebSocket/SSE connections.
- `automated_trigger_rules`: Configurable intervention trigger rules.
- `notification_dispatch_logs`: Audit trail for SMS and Push dispatches.
- `student_retention_predictions`: Normalized student retention risk scores.
- `enrollment_forecasts`: 12-month multi-campus enrollment and resource projections.
- `budget_simulation_scenarios`: Saved "What-If" budget simulation parameter snapshots.

### 3.2 API Route Map
- `POST /api/admin/realtime/stream` - Initialize stream session
- `GET /api/admin/realtime/sse` - Subscribe to SSE stream
- `GET /api/admin/realtime/health` - Cluster metrics & active session count
- `POST /api/admin/triggers/evaluate` - Evaluate event payload
- `POST /api/admin/triggers/dispatch` - Execute notification dispatch
- `GET /api/admin/predictive/retention` - Query at-risk student predictions
- `GET /api/admin/predictive/forecasting` - Query multi-campus enrollment projections
- `POST /api/admin/simulation/budget` - Execute "What-If" budget scenario simulation
- `GET /api/mobile/v1/realtime-stream` - Mobile companion stream receiver endpoint

---

## 4. Verification & Testing

Verify system health and multi-tenant security via:
```bash
# Run Sprint-012 Real-Time Streaming test suite
npx vitest run src/lib/__tests__/realtime-streaming-e2e.test.ts

# Run Multi-Tenant Security & Redis Key Sharding audit suite
npx vitest run src/lib/__tests__/realtime-security-audits.test.ts
```
