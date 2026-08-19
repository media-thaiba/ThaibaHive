# Architecture Guide: Intelligent Agent Orchestration & Self-Healing Core

This guide details the design, registry, consensus, and operation of the ThaibaHive Intelligent Agent and Self-Healing Core (Sprint-019).

## 1. System Topology Overview

```
                          ┌──────────────────────────┐
                          │    Voice Copilot (SSE)   │
                          └─────────────┬────────────┘
                                        │ (Intents)
                                        ▼
 ┌──────────────┐         ┌──────────────────────────┐         ┌─────────────────┐
 │ Healer Agents├────────►│  Consensus Coordinator   │◄────────┤ ML Auto-Tuning  │
 └──────────────┘         └─────────────┬────────────┘         └─────────────────┘
                                        │ (Distributed Locks)
                                        ▼
                          ┌──────────────────────────┐
                          │    Agent Message Bus     │
                          └─────────────┬────────────┘
                                        │ (Priority Queue)
                                        ▼
                          ┌──────────────────────────┐
                          │    Agent State Store     │
                          └─────────────┬────────────┘
                                        │ (Drizzle DB)
                                        ▼
                          ┌──────────────────────────┐
                          │ SQLite/PostgreSQL Schema │
                          └──────────────────────────┘
```

## 2. Core Framework Components

1. **AgentRegistry (`src/lib/agents/core/registry.ts`)**:
   - Manages active agent metadata (ID, role, version, status).
   - Tracks live heartbeats.

2. **AgentMessageBus (`src/lib/agents/core/message-bus.ts`)**:
   - Priority-based queue pub-sub mechanism routing messages to topics and specific agents.
   - Validates messages on publish.

3. **AgentScheduler (`src/lib/agents/core/scheduler.ts`)**:
   - Schedules one-shot and recurring jobs with distributed locking to prevent duplicate runs across nodes.

4. **AgentStateStore (`src/lib/agents/core/state-store.ts`)**:
   - Persists agent statuses, console logging outputs, and remediation decisions in Drizzle database.
   - Enforces standard ISO string timestamps for consistency.

5. **ConsensusCoordinator (`src/lib/agents/core/consensus.ts`)**:
   - Prevents conflicting healer executions using heartbeat leases.
   - Automatically handles crash failovers for silent nodes.
   - Restricts rapid modifications with a 5-minute cooldown timer per asset.

## 3. Healer Agents Registry & Subscriptions

| Healer / Agent ID | Role | Monitored Metrics | Remediation Actions |
| :--- | :--- | :--- | :--- |
| `agent-db-healer` | `database-healer` | Replication Lag, Node Health | Promotes standbys, demotes primary, triggers failovers |
| `agent-edge-healer` | `edge-healer` | Edge Worker Error Rate | Routes to origin proxies, evicts caches |
| `agent-pool-healer` | `pool-healer` | Queue Wait Time Latency | Scales pool size up (to 200%) or down |
| `agent-stream-healer` | `stream-healer` | WebRTC Latency, Segmenter Errors | Restarts signaling, resets transcoders, redirects to backup |

## 4. Message Bus Topics

- `ml:drift:detected` (High priority): Published by `DriftDetector` when concept drift occurs.
- `ml:retrained:completed` (High priority): Published by `RetrainingPipeline` when retraining completes.
- `ml:model:promoted` (Normal priority): Published by `ModelPromoter` on successful candidate promotion.
- `ml:model:rolledback` (High priority): Published by `ModelPromoter` on accuracy drop rollback.
- `alert:failover` (High priority): Published during database cluster failovers.
