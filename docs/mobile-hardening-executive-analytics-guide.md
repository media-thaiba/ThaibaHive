# Mobile Platform Production Hardening & Executive Dashboard Analytics Architecture Guide

**Sprint:** Sprint-014 (v2.6.0)  
**Classification:** Technical Architecture Guide  
**Status:** Certified Production Guide  

---

## 1. Overview

Sprint-014 completes the transition of ThaibaHive's mobile companion from development stage (95%) to production certified (100%), while introducing a unified Executive Intelligence Dashboard at `/admin/executive/analytics`.

---

## 2. Flutter Mobile Hardening Architecture

### 2.1 Voice Copilot HTTP Integration

`voice_copilot_screen.dart` uses `voiceCopilotProvider` (Riverpod) to execute authenticated queries to `/api/admin/voice/query`.
- **Nonce Exchange**: `WebViewHandoffScreen` exchanges single-use nonces for secure session cookies.
- **Nonce Retry**: Automatic 500ms exponential retry handles clock skew and network latency.

```
Flutter VoiceCopilotScreen
      │
      ▼ (StateNotifierProvider)
voiceCopilotProvider
      │
      ▼ POST /api/admin/voice/query
Next.js API Route Handler (requireAuth("voice:copilot"))
      │
      ▼
VoiceQueryParser (Phonetic Soundex + Levenshtein Matching)
      │
      ▼
Synthesized Audio Response & Copilot Swarm Intelligence
```

### 2.2 Offline Persistence Engine

`OfflineSyncQueue` in Flutter uses `LocalDbAdapter` backed by encrypted Hive storage (`HiveAesCipher`) for offline outbox persistence.
- **Migration Handler**: `HiveMigrationHandler` inspects `schema_version` and migrates/clears stale v0 mock data.
- **Data Integrity**: Outbox mutations survive app crashes, backgrounding, and restarts.

---

## 3. Executive Analytics Dashboard Architecture

### 3.1 Aggregation API Endpoint (`/api/admin/executive/analytics`)

Uses `Promise.all()` to aggregate metrics in parallel under a 5-second SLA:
1. **Governance**: Policy propagation count, conflict status.
2. **Resilience**: Circuit breaker states (CLOSED/OPEN), DLQ depth, candidate index count.
3. **Voice Copilot**: Queries today, average latency, top domain intents.
4. **Mobile Sync**: Outbox pending mutations, active device count.

### 3.2 SSE Event Bus Integration

`PolicySyncEngine.propagatePolicy()` publishes `POLICY_PROPAGATED` events on the `governance` channel. The executive dashboard listens via EventSource and refreshes metrics instantly upon policy changes.

---

## 4. CI/CD & Automated Testing

- **GitHub Actions (`.github/workflows/flutter-ci.yml`)**: Automated `flutter analyze` and `flutter test` on every PR.
- **Test Isolation**: `--maxWorkers 1` in `jest.config.js` and in-memory test databases eliminate SQLITE_BUSY lock contention.
