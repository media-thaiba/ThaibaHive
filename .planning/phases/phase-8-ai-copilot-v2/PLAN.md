# Phase 8: AI Copilot V2 — Multimodal LLM & Autonomous Remediation

**Milestone**: ThaibaHive v3.37.0 — Intelligent Campus Operations
**Branch**: `feat/phase-8-ai-copilot-v2`
**Base**: `v3.36.1` (Two-Tier Platform + Real-Time Messaging + Production Hardening)

---

## 1. Executive Summary

This phase transforms the campus AI from reactive Q&A into a **proactive, multimodal autonomous copilot** that sees, hears, reads, and acts across all campus operations. It builds directly on:

- **Phase 6 Messaging Mesh** → Voice copilot WebSocket transport + HITL approval modals in chat
- **Phase 7 Infra** → GPU-enabled Kubernetes pods, observability for inference latency, secret management for API keys
- **Phase 1–5 Core** → RBAC, tenant isolation, audit logs, Merkle chains for remediation integrity

**Core Value**: Staff/teachers operate hands-free; parents get voice answers; admins trigger cross-module remediation with cryptographic audit trails.

---

## 2. Scope & Deliverables

### 2.1 Database & Schema (Week 1)

| Task | Description | Files |
|------|-------------|-------|
| **Schema: ai_documents** | Document upload tracking, extraction results, confidence, HITL confirmation | `packages/db/schema.ts`, `packages/db/schema.pg.ts` |
| **Schema: ai_copilot_sessions** | Voice/text session state, context persistence | same |
| **Schema: ai_rag_corpus** | pgvector embeddings, hybrid search, tenant-scoped | same |
| **Schema: ai_remediation_runs** | Workflow execution tracking, Merkle root, status | same |
| **Schema: ai_remediation_steps** | Per-step I/O, Merkle leaves, HITL status | same |
| **Schema: ai_approvals** | HITL decisions, payload, audit trail | same |
| **Drizzle Migrations** | SQLite (`drizzle/0034_ai_copilot.sql`) + PG (`drizzle/postgres/0018_ai_copilot.sql`) | `pnpm db:generate && pnpm db:generate:pg` |
| **RBAC Permissions** | 11 new permissions mapped across 5 tiers + `accounts`/`purchase` | `packages/auth/roles.ts` |

### 2.2 LLM Provider Abstraction (Week 1-2)

| Component | Description |
|-----------|-------------|
| **Provider Interface** | `LLMProvider` with `chat`, `embed`, `transcribe`, `synthesize`, `vision` |
| **Gemini Provider** | `gemini-2.5-pro` (complex), `gemini-2.5-flash` (fast), `text-embedding-3-large` |
| **Ollama Provider** | Local: `llama3.1:70b`, `mistral:7b`, `phi3:mini`, `nomic-embed-text` |
| **Vertex Provider** | Enterprise: Gemini, Claude via Model Garden |
| **Routing** | Feature flag `ai_provider` + per-request override |
| **Cost Tracking** | Token usage logged per request → `/api/ai/usage` |

### 2.3 Multimodal Document Intelligence (Week 2-3)

| Feature | Spec |
|---------|------|
| **Upload Endpoint** | `POST /api/ai/documents/upload` — multipart, 25MB limit, virus scan (ClamAV) |
| **MIME Detection** | `file-type` lib → route to vision / pdf / audio processor |
| **Image Processor** | Gemini Vision → structured JSON (fee receipt, medical cert, ID card, CCTV) |
| **PDF Processor** | `pdf-parse` + Vision fallback for scanned pages → text + tables |
| **Audio Processor** | Whisper.cpp (local) / Gemini Audio → transcript → intent parse |
| **Schema Validation** | Zod schemas per document type → confidence score |
| **HITL Confirmation** | `POST /api/ai/documents/:id/confirm` → persist to target table (fee, leave, student, incident) |

### 2.4 Voice Copilot (Week 3-4)

| Component | Spec |
|-----------|------|
| **WebSocket Endpoint** | `WS /api/ai/copilot/voice/ws/:sessionId` — bidirectional audio frames (Opus/WebM) |
| **STT** | Browser Web Speech API (Web) / Native (Flutter) → fallback to Whisper.cpp |
| **Intent Classification** | LLM few-shot → structured action + params |
| **Action Execution** | Workflow DSL → HITL modal in chat drawer → execute |
| **TTS** | ElevenLabs API (Web) / Native TTS (Mobile) — voice selection per user |
| **Session Management** | `POST /start` → `sessionId` → `WS` → `POST /end` |
| **Context Persistence** | Last 10 turns in `ai_copilot_sessions.context_json` |

### 2.5 RAG + Policy Engine (Week 4)

| Component | Spec |
|-----------|------|
| **Ingestion Pipeline** | Admin UI → chunk (512/50) → embed (text-embedding-3-large / nomic-embed-text) → pgvector HNSW |
| **Corpus Sources** | Policies, circulars, academic calendar, HR rules, fee structures |
| **Query API** | `POST /api/ai/rag/query` — hybrid (vector + keyword) → rerank (bge-reranker) → grounded answer |
| **Citations** | Source doc ID + chunk index + relevance score |
| **Access Control** | Tenant-scoped corpus; role-based document visibility |

### 2.6 Autonomous Remediation Runtime (Week 5-6)

| Component | Spec |
|-----------|------|
| **Workflow DSL** | YAML extending `agenticWorkflows` with `forEach`, `filter`, `tool`, `merkle.log` |
| **Tools** | `sql.query`, `llm.analyze`, `notification.send`, `fee.reconcile`, `leave.approve`, `merkle.log` |
| **HITL Gates** | `approval.required: true` → modal in chat drawer → Accept/Reject/Modify |
| **Merkle Audit** | Each step output → SHA-256 leaf → sequential Merkle root → `audit_logs` |
| **Step-Up Auth** | DPoP + biometric for `finance:*` / `student:pii:*` operations |
| **Compensating Transactions** | `onFailure: compensate` with inverse tool calls |

### 2.7 Web UI Integration (Week 6-7)

| Feature | Location |
|---------|----------|
| **Voice Copilot Button** | CommandPalette (`Cmd+K`) → microphone icon → opens voice session |
| **Document Upload** | ActionCenter drawer → "Upload Document" → camera/file picker → preview extracted JSON |
| **RAG Search** | CommandPalette → "Ask Policy" → streams answer with citations |
| **Remediation Trigger** | Admin pages → "Run Remediation" → selects workflow → streams progress |
| **HITL Modals** | Chat drawer → "Approval Required" → Accept/Reject/Modify with diff view |
| **Merkle Audit Viewer** | Admin → `/admin/ai/audit` → search runs, verify Merkle proofs |

### 2.8 Mobile Flutter Integration (Week 7-8)

| Feature | Spec |
|---------|------|
| **Voice Copilot** | `ChatScreen` → mic button → native STT → REST → TTS playback |
| **Camera OCR** | Leave/fee flows → camera icon → capture → preview extracted JSON → confirm |
| **RAG Search** | `CommandPalette`-style search → policy answers |
| **HITL Push** | FCM data message → deep link to `ApprovalScreen` |
| **Offline Queue** | Document uploads → Hive outbox → `SyncCoordinator` drain |
| **TTS** | Native `flutter_tts` with voice selection |

---

## 3. Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
                              CLIENT LAYER
├──────────────────┬──────────────────┬──────────────────────────────────────┤
│   Web (Next.js)  │  Mobile (Flutter) │  Admin Portal                       │
│  - Voice WS      │  - Native STT/TTS │  - RAG Search                       │
│  - File Upload   │  - Camera OCR     │  - HITL Modals                      │
│  - Merkle Viewer │  - Offline Queue  │  - Remediation Dashboard            │
└────────┬─────────┴────────┬──────────┴────────────┬────────────────────────┘
         │                  │                        │
         ▼                  ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
                            API GATEWAY (Next.js)
│  /api/ai/documents/*    /api/ai/copilot/voice/*    /api/ai/rag/*             │
│  /api/ai/remediation/*  /api/ai/approvals/*       /api/ai/usage/*            │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  LLM Providers   │ │  Vector Store    │ │  Agent Runtime   │
│  - Gemini 2.5    │ │  - pgvector      │ │  - Workflow DSL  │
│  - Ollama Local  │ │  - Hybrid Search │ │  - Merkle Audit  │
│  - Vertex AI     │ │  - Reranker      │ │  - HITL Gates    │
└──────────────────┘ └──────────────────┘ └──────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
             ┌─────────────┐   ┌─────────────┐
             │ PostgreSQL  │   │   Redis     │
             │ - ai_* tbls │   │ - Session   │
             │ - pgvector  │   │ - Rate Limit│
             └─────────────┘   └─────────────┘
```

---

## 4. Verification Gates (All Must Pass)

| # | Gate | Command | Target |
|---|------|---------|--------|
| 1 | TypeScript | `pnpm typecheck` | 0 errors |
| 2 | ESLint | `pnpm lint` | 0 errors |
| 3 | Unit Tests | `pnpm test` | 100% pass |
| 4 | RBAC Audit | `pnpm security:rbac` | 100% mapped |
| 5 | RequireAuth | `pnpm security:requireauth` | 0 naked handlers |
| 6 | Tenant Isolation | `pnpm security:tenants` | 0 leaks |
| 7 | Schema Drift | `pnpm test packages/db/__tests__/schema-drift.test.ts` | 0 drift |
| 8 | Flutter Analyze | `flutter analyze` | 0 errors |
| 9 | Flutter Tests | `flutter test` | 100% pass |
| 10 | Next.js Build | `pnpm build` | Clean standalone |
| 11 | LLM Provider Tests | `pnpm test src/lib/ai/__tests__/` | All providers pass |
| 12 | Document Pipeline | `pnpm test src/lib/ai/document/__tests__/` | 4 doc types |
| 13 | Voice E2E | `pnpm test:e2e` (Playwright) | STT→LLM→TTS < 2s |
| 14 | RAG Accuracy | `pnpm test src/lib/ai/rag/__tests__/` | Citations correct |
| 15 | Remediation E2E | `pnpm test src/lib/ai/remediation/__tests__/` | HITL + Merkle |
| 16 | Accessibility | `pnpm a11y:audit` | WCAG 2.1 AA |

---

## 5. Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| LLM latency / cost | Flash model default; caching; token budgets per user |
| Voice privacy (cloud STT) | On-device Whisper.cpp fallback; configurable per tenant |
| pgvector scale | HNSW index; partitioning by `institution_id`; read replicas |
| Remediation safety | HITL mandatory; Merkle audit; compensating transactions; dry-run mode |
| Voice WebSocket scaling | Redis Pub/Sub for session affinity; connection pooling |

---

## 6. Rollout Plan

| Phase | Environment | Validation |
|-------|-------------|------------|
| **Dev** | Local SQLite + Ollama | All gates pass |
| **Staging** | `pnpm test:staging:smoke` + manual voice/doc tests | 24h soak |
| **Canary** | 5% traffic via `ai_copilot_v2` flag | Error rate < 0.1% |
| **Prod** | Full rollout | Monitor p95 < 2s, cost < $0.01/req |

---

## 7. Definition of Done

- [ ] All 16 verification gates pass
- [ ] OpenAPI spec at `/api/openapi.json` includes all AI endpoints
- [ ] Voice copilot works Web + Mobile (offline TTS fallback)
- [ ] Document pipeline extracts 4 types with >85% confidence
- [ ] RAG answers grounded with citations; no hallucination in eval set
- [ ] Remediation workflow executes 5-step with HITL + Merkle proof
- [ ] Web + Mobile UI integrated in CommandPalette / ChatScreen
- [ ] Release notes drafted in `CHANGELOG.md` (v3.37.0)
- [ ] Peer review completed (Qwen + opencode + Claude Code)

---

## 8. Immediate Next Steps

1. **Commit 1**: Database schema + migrations + RBAC permissions
2. **Commit 2**: LLM Provider abstraction + Gemini/Ollama/Vertex implementations
3. **Commit 3**: Document upload + extraction pipeline (Vision/PDF/Audio)
4. **Commit 4**: Voice Copilot WebSocket + STT/TTS + Intent classification
5. **Commit 5**: RAG ingestion + query API + hybrid search
6. **Commit 6**: Remediation DSL + Runtime + HITL + Merkle
7. **Commit 7**: Web UI (CommandPalette voice, ActionCenter upload, RAG search)
8. **Commit 8**: Mobile UI (Voice, Camera OCR, HITL push)
9. **Commit 9**: E2E tests + Accessibility + Release notes

---

*Generated: 2026-10-10*
*Author: opencode + Antigravity review*
*Status: READY FOR IMPLEMENTATION*