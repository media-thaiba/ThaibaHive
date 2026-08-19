# Global Education Intelligence — Feature Guide

## Sprint-017 · ThaibaHive v3.1.0

> **Audience**: Platform architects, institution administrators, DevOps engineers.
> This guide covers the three major subsystems shipped in Sprint-017 and the production deployment requirements for each.

---

## Table of Contents

1. [Multi-Region Data Mesh](#1-multi-region-data-mesh)
2. [Predictive Learning Analytics](#2-predictive-learning-analytics)
3. [Hybrid WebRTC/HLS Distance Learning Streaming](#3-hybrid-webrtchls-distance-learning-streaming)
4. [PostgreSQL Multi-Node Cluster Certification](#4-postgresql-multi-node-cluster-certification)
5. [API Reference](#5-api-reference)
6. [Database Schema](#6-database-schema)
7. [Configuration](#7-configuration)
8. [Operational Runbook](#8-operational-runbook)

---

## 1. Multi-Region Data Mesh

### Overview
The multi-region mesh synchronises institution data across geographically distributed nodes using **LWW-CRDTs** (Last-Write-Wins Conflict-free Replicated Data Types) with Vector Clock causality tracking, ensuring eventual consistency with deterministic conflict resolution.

### Architecture
```
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Region EU-W  │◄────►│  Region AP-SE │◄────►│  Region US-E  │
│  (Primary)    │      │  (Replica)    │      │  (Replica)    │
└───────┬───────┘      └───────┬───────┘      └───────┬───────┘
        │                      │                      │
        └──────────────────────┴──────────────────────┘
                         Mesh Replication Bus
```

### CRDT Conflict Resolution

Conflicts are resolved in this priority order:
1. **Vector Clock causality** — if one state causally dominates the other, it wins.
2. **Higher timestamp** — tie-break using wall-clock time.
3. **Lexicographic Region ID** — final deterministic tie-breaker.

### Key Modules

| File | Description |
|------|-------------|
| `src/lib/mesh/crdt-resolver.ts` | LWW conflict resolution with VC causality |
| `src/lib/mesh/vector-clock.ts` | VectorClockManager with tick/merge operations |
| `src/lib/mesh/replication-engine.ts` | Batch replication orchestration |
| `src/lib/mesh/sync-queue.ts` | Persistent cross-region sync queue with exponential backoff |
| `src/lib/mesh/region-health.ts` | Region health probing and degradation detection |
| `src/lib/mesh/query-router.ts` | Latency-aware read routing |

### Performance SLAs (verified in GEI-018)

| Metric | Target | Measured |
|--------|--------|----------|
| CRDT merge latency | < 5ms | ~0.001ms |
| Sync queue enqueue (10k items) | < 500ms | ~14ms |
| Sync queue flush (1k items) | < 100ms | ~10ms |

---

## 2. Predictive Learning Analytics

### Overview
The predictive engine uses a multi-factor weighted scoring model to calculate **student risk assessments** and generate **personalised learning paths** in real time.

### Risk Score Formula

```
Risk Score = (35% × Attendance)
           + (30% × Exam Trend)
           + (20% × Assignment Completion)
           + (10% × LMS Engagement)
           + (5%  × Financial Risk Flag)
```

All inputs are normalised to `[0.0, 1.0]` before weighting. The final score is in `[0, 100]`.

### Risk Level Thresholds

| Score Range | Risk Level | Actions |
|-------------|-----------|---------|
| 0 – 35 | `LOW` | Encouragement, optional tutoring |
| 36 – 64 | `MEDIUM` | Counselor alert, attendance intervention |
| 65 – 100 | `HIGH` | Immediate academic support, early warning |

### Key Modules

| File | Description |
|------|-------------|
| `src/lib/analytics/feature-extractor.ts` | Normalises raw activity data into feature vectors |
| `src/lib/analytics/prediction-engine.ts` | Weighted scoring + risk level classification |
| `src/lib/analytics/learning-path-recommender.ts` | Generates personalised action plans |
| `src/lib/analytics/inference-service.ts` | Cached orchestration with 5-minute TTL |

### Performance SLAs (verified in GEI-018)

| Metric | Target | Measured |
|--------|--------|----------|
| Single student inference | < 50ms | ~3ms |
| Batch 1,000 students | < 5,000ms | ~3ms |

---

## 3. Hybrid WebRTC/HLS Distance Learning Streaming

### Overview
Provides low-latency live streaming with:
- **WebRTC** for interactive sessions (< 150ms latency) with up to 250 concurrent participants.
- **HLS** (HTTP Live Streaming) for broadcast-quality recording with adaptive bitrate.
- **Collaboration Bridge** connecting stream and chat context.

### Session Lifecycle

```
createRoom() → joinRoom() → [live session] → leaveRoom() / endRoom()
                   ↓
              StreamRecorder (HLS segments)
                   ↓
              recordingUrl stored in stream_recordings
```

### Adaptive Bitrate Profiles

| Quality | Bandwidth | Resolution |
|---------|-----------|-----------|
| 1080p | 3,000 kbps | 1920×1080 |
| 720p | 1,500 kbps | 1280×720 |
| 480p | 800 kbps | 854×480 |

### Key Modules

| File | Description |
|------|-------------|
| `src/lib/streaming/media-session.ts` | Room lifecycle, participant management |
| `src/lib/streaming/webrtc-signaling.ts` | SDP offer/answer + ICE signaling |
| `src/lib/streaming/hls-segmenter.ts` | HLS playlist generation (sliding window, 10 segments) |
| `src/lib/streaming/stream-recorder.ts` | Recording lifecycle management |
| `src/lib/streaming/collaboration-bridge.ts` | Chat ↔ stream context bridge |

### Performance SLAs (verified in GEI-018)

| Metric | Target | Measured |
|--------|--------|----------|
| Room creation latency | < 10ms avg | ~0.01ms |
| HLS segment enqueue | < 1ms avg | < 0.001ms |

---

## 4. PostgreSQL Multi-Node Cluster Certification

### Overview
Production-grade cluster management with:
- **Automated Failover** — promotes a standby node to primary in < 30 seconds.
- **Quorum Guard** — prevents split-brain by requiring ≥ ⌈N/2⌉ healthy nodes before promoting.
- **Zero-Downtime Migration** — dual-write → validate → cutover lifecycle.
- **Replica Pool** — routes read queries to the lowest-lag replica.

### Failover Algorithm

```
1. evaluateClusterHealth()
   → isQuorumHealthy? NO → ABORT (split-brain guard)
2. Find standby nodes with replicationLagMs ≤ 2,000ms
   → None eligible? → ABORT (lag SLA guard)
3. Sort eligible candidates by replicationLagMs ASC
4. Promote node[0] → mark as PRIMARY
5. Mark failed node → OFFLINE
6. Return FailoverResult with promotion time
```

### Zero-Downtime Migration States

```
PENDING → DUAL_WRITING → COMPLETED
                ↓
           ROLLED_BACK (on validation failure)
```

### Lag SLA Thresholds

| Threshold | Value | Meaning |
|-----------|-------|---------|
| Failover eligible | ≤ 2,000ms | Node can be safely promoted |
| Read replica eligible | ≤ 2,000ms (configurable) | Node serves read queries |

### Key Modules

| File | Description |
|------|-------------|
| `src/lib/database/cluster-monitor.ts` | Node health tracking + cluster health report |
| `src/lib/database/replica-pool.ts` | Lag-aware read replica routing |
| `src/lib/database/failover-manager.ts` | Automated quorum-guarded failover |
| `src/lib/database/live-migrator.ts` | Zero-downtime migration lifecycle |

---

## 5. API Reference

### Multi-Region Mesh

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/api/admin/mesh/nodes` | `admin:read` | List all mesh nodes and health |
| POST | `/api/admin/mesh/replicate` | `admin:write` | Trigger manual replication batch |
| GET | `/api/admin/mesh/conflicts` | `admin:read` | List recent CRDT conflict events |

### Predictive Analytics

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/api/analytics/predict` | `hod:read` | Infer risk for a student |
| GET | `/api/analytics/students/:id/risk` | `hod:read` | Get latest risk assessment |
| GET | `/api/analytics/students/:id/learning-path` | `staff:read` | Get recommended learning path |

### Streaming

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/api/streaming/rooms` | `staff:write` | Create a streaming room |
| POST | `/api/streaming/rooms/:id/join` | `staff:read` | Join a streaming session |
| GET | `/api/streaming/rooms/:id/hls` | `staff:read` | Get HLS master playlist |
| GET | `/api/streaming/recordings` | `hod:read` | List stream recordings |

### Database Cluster

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | `/api/admin/database/cluster/health` | `admin:read` | Cluster health report |
| POST | `/api/admin/database/cluster/failover` | `super_admin:write` | Trigger automated failover |
| POST | `/api/admin/database/cluster/migrate` | `super_admin:write` | Start zero-downtime migration |

---

## 6. Database Schema

New tables added in Sprint-017 (see `packages/db/schema.ts` and `packages/db/schema.pg.ts`):

| Table | Purpose |
|-------|---------|
| `mesh_nodes` | Registered mesh region nodes |
| `replication_logs` | Cross-region replication batch history |
| `conflict_events` | CRDT conflict resolution audit log |
| `predictive_models` | ML model registry (name, version, precision/recall) |
| `student_risk_scores` | Per-student risk assessments |
| `learning_path_recommendations` | AI-generated learning paths |
| `streaming_rooms` | Active streaming room registry |
| `streaming_sessions` | Participant session records |
| `stream_recordings` | HLS recording references |
| `cluster_nodes` | PostgreSQL cluster node registry |
| `failover_events` | Failover audit log |
| `migration_jobs` | Zero-downtime migration job tracker |

---

## 7. Configuration

### Environment Variables

```env
# Multi-Region Mesh
MESH_REGION_ID=region-eu-west            # Current node's region identifier
MESH_REPLICATION_BATCH_SIZE=500          # Mutations per replication batch
MESH_MAX_QUEUE_SIZE=50000                # Max pending sync queue items
MESH_HEALTH_PROBE_INTERVAL_MS=5000       # Region health check interval

# Predictive Analytics
ANALYTICS_INFERENCE_CACHE_TTL_MS=300000  # 5-minute inference result cache
ANALYTICS_HIGH_RISK_THRESHOLD=65         # Score above which triggers HIGH alert
ANALYTICS_MEDIUM_RISK_THRESHOLD=36       # Score above which triggers MEDIUM alert

# Streaming
STREAMING_MAX_PARTICIPANTS=250           # Default room capacity
STREAMING_HLS_SEGMENT_DURATION_S=6      # HLS segment duration in seconds
STREAMING_RECORDING_BUCKET=             # Object storage bucket for recordings
WEBRTC_STUN_SERVERS=stun:stun.l.google.com:19302

# PostgreSQL Cluster
POSTGRES_MAX_FAILOVER_LAG_MS=2000       # Max replication lag for failover eligibility
POSTGRES_READ_REPLICA_LAG_MS=2000       # Max lag for read replica routing
POSTGRES_CLUSTER_QUORUM_SIZE=2          # Minimum healthy nodes for quorum
```

---

## 8. Operational Runbook

### Triggering a Manual Failover

```bash
curl -X POST https://app.thaibahive.com/api/admin/database/cluster/failover \
  -H "Authorization: Bearer <super_admin_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"failedNodeId": "node-1-primary"}'
```

**Expected response:**
```json
{
  "status": "SUCCESS",
  "promotedNodeId": "node-2-standby",
  "recoveryDurationMs": 127,
  "newPrimaryEndpoint": "postgresql://db2.example.com:5432"
}
```

### Monitoring Replication Lag

```bash
curl https://app.thaibahive.com/api/admin/database/cluster/health \
  -H "Authorization: Bearer <admin_jwt>"
```

**Alert thresholds**: Page on-call if `maxReplicationLagMs > 5,000ms` or `isQuorumHealthy = false`.

### Checking Mesh CRDT Conflicts

```bash
curl "https://app.thaibahive.com/api/admin/mesh/conflicts?since=2026-08-01" \
  -H "Authorization: Bearer <admin_jwt>"
```

> **Note**: A conflict rate > 1% of total mutations indicates a network partition or clock drift issue. Investigate region connectivity immediately.

### Starting a Distance Learning Session

1. **Create room**: `POST /api/streaming/rooms` (host user)
2. **Share room ID** to participants
3. **Join**: `POST /api/streaming/rooms/:id/join` (each participant)
4. **Embed HLS**: `GET /api/streaming/rooms/:id/hls?quality=720p` for broadcast viewers
5. **End session**: `DELETE /api/streaming/rooms/:id` (host)
