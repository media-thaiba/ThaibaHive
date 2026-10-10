# Phase 8: AI Copilot V2 — Multimodal LLM & Autonomous Remediation (Draft v2)

**Milestone**: ThaibaHive v3.37.0 — Intelligent Campus Operations  
**Branch**: `feat/phase-8-ai-copilot-v2`  
**Base**: `v3.36.1` (Two-Tier Platform + Real-Time Messaging + Production Hardening)  
**Status**: Draft v2 — Cross-AI Reviewed (Security, Mobile UX, AI/ML Architecture Incorporated)

---

## 1. Executive Summary

This phase transforms the campus AI from reactive Q&A into a **proactive, multimodal autonomous copilot** that sees, hears, reads, and acts across all campus operations. It builds directly on:

- **Phase 6 Messaging Mesh** → Voice copilot WebSocket transport + HITL approval modals in chat
- **Phase 7 Infra** → GPU-enabled Kubernetes pods, observability for inference latency, secret management for API keys
- **Sprint-100 AIGENT-OS & Core** → Unified `agentic_workflow_*` tables, `MerkleAuditLedger`, D12 Step-Up auth, and tenant isolation

**Core Value**: Staff/teachers operate hands-free; parents get voice answers; admins trigger cross-module remediation with cryptographic Merkle audit trails and DLP protection.

---

## 2. Scope & Deliverables

### 2.1 Database & Dual-Dialect Schema (Commit 1)

| Task | Description | Files |
|------|-------------|-------|
| **Schema: ai_documents** | Document upload tracking, extraction results, multi-factor confidence, HITL confirmation | `packages/db/schema.ts`, `packages/db/schema.pg.ts` |
| **Schema: ai_copilot_sessions** | Voice/text session state, context persistence, rate limiting | same |
| **Schema: ai_rag_corpus** | 1536-dim embeddings (HNSW in PG, Float32 JSON in SQLite), hybrid search, tenant-scoped | same |
| **Schema: ai_token_budgets** | Multi-tenant monthly token limits, usage metering (input/output/cached) | same |
| **Remediation Integration** | Re-use Sprint-100 `agentic_workflow_runs` (trigger `copilot`), `agentic_workflow_steps`, and `agent_approval_gates` | same |
| **Drizzle Migrations** | SQLite (`drizzle/0034_ai_copilot.sql`) + PG (`drizzle/postgres/0018_ai_copilot.sql`) | `pnpm db:generate && pnpm db:generate:pg` |
| **RBAC Permissions** | 11 new permissions mapped across 5 tiers + `accounts`/`purchase` | `packages/auth/roles.ts` |

### 2.2 Segregated LLM Provider Abstraction (Commit 2)

| Component | Description |
|-----------|-------------|
| **Provider Interfaces** | Segregated `IChatProvider`, `IEmbeddingProvider`, `ISpeechToTextProvider`, `ITextToSpeechProvider` with `chatStream` |
| **Gemini Provider** | `gemini-2.5-pro` (reasoning), `gemini-2.5-flash` (fast), `text-embedding-3-small` (1536-dim standard) |
| **Ollama Provider** | Local: `llama3.1:70b`, `mistral:7b`, `phi3:mini`, `nomic-embed-text` |
| **Vertex Provider** | Enterprise: Gemini, Claude via Model Garden |
| **Tiered Fallback Chain** | Gemini 2.5 Pro → Gemini 2.5 Flash (429/timeout) → Local Ollama (network outage) |
| **Token Metering & Quotas**| Per-tenant Redis sliding-window token metering + `/api/ai/usage` |

### 2.3 Multimodal Document Intelligence & DLP (Commit 3)

| Feature | Spec |
|---------|------|
| **Upload Endpoint** | `POST /api/ai/documents/upload` — multipart, 15MB limit, streaming parser, Redis rate limit (10/min) |
| **DLP Sanitizer** | `src/lib/ai/guardrails/dlp-sanitizer.ts` — PII redaction (national IDs, phone numbers) before cloud LLM dispatch |
| **Local-First PII Routing** | Medical certificates and sensitive student logs default to local on-premise models (Ollama/Tesseract) |
| **Image & PDF Processor** | Native Gemini `responseSchema` with JSON grammar constraint (fee receipt, medical cert, ID card, CCTV) |
| **Confidence Scoring** | Deterministic: $0.4 \times \text{ZodCompleteness} + 0.3 \times \text{RuleConsistency} + 0.3 \times \text{OCRClarity}$ |
| **HITL Confirmation** | `POST /api/ai/documents/:id/confirm` → persist verified data to target domain tables |

### 2.4 Voice Copilot & Audio Streaming (Commit 4)

| Component | Spec |
|-----------|------|
| **WebSocket Endpoint** | `WS /api/ai/copilot/voice/ws/:sessionId` — Linear PCM / Opus binary frames with 5s heartbeat & 60s silence timeout |
| **STT Engine** | Web Speech API (Web) / Native STT (Flutter) → fallback to Whisper.cpp |
| **Intent Classification** | Few-shot classifier mapping spoken requests to typed tool executions |
| **TTS Engine** | ElevenLabs (Web) / Native `flutter_tts` (Mobile) with user-selected voices |
| **Audio Session Mgmt** | Mobile audio ducking, interruption recovery (calls/alarms), background cleanup |
| **Session Persistence** | Sliding-window context in `ai_copilot_sessions.context_json` |

### 2.5 Structure-Aware RAG + Policy Engine (Commit 5)

| Component | Spec |
|-----------|------|
| **Ingestion Pipeline** | Table-aware markdown chunking (256-token small chunks with 1024-token parent context) |
| **Dual-Dialect Storage** | PG: `vector("embedding", { dimensions: 1536 })` with HNSW; SQLite: serialized JSON string |
| **Hybrid Search & RRF** | Cosine distance + PostgreSQL full-text search combined via Reciprocal Rank Fusion (RRF) |
| **Reranking & Citations** | Lightweight cross-encoder reranking + groundedness citation verification |
| **Access Control** | Strict tenant partitioning (`WHERE institution_id = :id`) and role-based visibility |

### 2.6 Autonomous Remediation Runtime & Merkle Audit (Commit 6)

| Component | Spec |
|-----------|------|
| **Workflow DSL** | Strongly typed tool contracts (banning raw SQL execution); auto-injected session tenant context |
| **HITL Gates** | Integrated with `agent_approval_gates` → Accept/Reject/Modify with diff view |
| **Step-Up Freshness (D12)**| Biometric / WebAuthn challenge ($\le 300\text{s}$) for high-risk financial and student record operations |
| **Merkle Audit Ledger** | Enqueue every step invocation into `MerkleAuditLedger` (`src/lib/agents/guardrails/merkle-ledger.ts`) |
| **Compensating Sagas** | Reverse-order execution of compensating tools on step failure or rejection |

### 2.7 Web UI Integration (Commit 7)

| Feature | Location |
|---------|----------|
| **Voice Copilot Trigger** | CommandPalette (`Cmd+K`) mic button with live audio visualizer |
| **Document Upload** | ActionCenter drawer → "Upload Document" with live OCR extraction preview |
| **RAG Policy Search** | CommandPalette → "Ask Policy" streaming answer with clickable citation tags |
| **HITL Modal** | Chat drawer / ActionCenter → Approval modal with side-by-side diff |
| **Merkle Audit Viewer** | Admin Portal → `/admin/ai/audit` Merkle tree proof validator |

### 2.8 Mobile Flutter Integration (Commit 8)

| Feature | Spec |
|---------|------|
| **Dependencies** | Add `flutter_tts: ^4.2.0` and `audio_session: ^0.1.21` to `pubspec.yaml` |
| **Voice Copilot** | `ChatScreen` mic trigger with native `speech_to_text`, audio session ducking, and `flutter_tts` |
| **Step 4 Sync Drain** | Add Step 4 `aiDocumentDrainProvider.notifier.drain()` in `SyncCoordinator` |
| **Document Outbox** | Hive box `ai_document_outbox` with background isolate image compression (2048px @ 80% JPEG) |
| **HITL Approval Routing** | GoRouter path `/copilot/approvals/:id` + vertical diff card with inline field editing |

### 2.9 E2E Verification & Release (Commit 9)

| Feature | Spec |
|---------|------|
| **Quality Gates** | All 16 verification gates passed (Typecheck, ESLint, Jest, Flutter, Security Scanners, Build) |
| **Accessibility** | WCAG 2.1 AA audit on all new Copilot and Approval dialogs |
| **Release Notes** | Version `v3.37.0` in `CHANGELOG.md` |

---

## 3. Verification Gates (All 16 Must Pass)

| # | Gate | Command | Target |
|---|------|---------|--------|
| 1 | TypeScript | `pnpm typecheck` | 0 errors |
| 2 | ESLint | `pnpm lint` | 0 errors |
| 3 | Unit & Integration Tests | `pnpm test` | 100% pass |
| 4 | RBAC Audit | `pnpm security:rbac` | 100% mapped |
| 5 | RequireAuth Audit | `pnpm security:requireauth` | 0 naked handlers |
| 6 | Tenant Isolation | `pnpm security:tenants` | 0 leaks (1,646+ files) |
| 7 | Schema Parity & Drift | `pnpm test packages/db/__tests__/schema-drift.test.ts` | 0 drift |
| 8 | Flutter Analyze | `flutter analyze` | 0 errors / 0 warnings |
| 9 | Flutter Tests | `flutter test` | 100% pass |
| 10 | Next.js Build | `pnpm build` | Clean standalone build |
| 11 | LLM Provider Suites | `pnpm test src/lib/ai/__tests__/` | 100% pass |
| 12 | Document Pipeline | `pnpm test src/lib/ai/document/__tests__/` | 4 doc types pass |
| 13 | Voice Audio Streaming | `pnpm test src/lib/voice/__tests__/` | STT/TTS latency verified |
| 14 | RAG & Groundedness | `pnpm test src/lib/ai/rag/__tests__/` | Citations verified |
| 15 | Remediation & Merkle | `pnpm test src/lib/ai/remediation/__tests__/` | HITL + Saga rollback verified |
| 16 | Accessibility | `pnpm a11y:audit` | WCAG 2.1 AA compliance |

---

## 4. Execution Waves (Commit Sequence)

1. **Commit 1**: Database schema (`ai_documents`, `ai_copilot_sessions`, `ai_rag_corpus`, `ai_token_budgets`), migrations & RBAC matrix
2. **Commit 2**: Segregated LLM Provider abstraction (`IChatProvider`, `IEmbeddingProvider`, `ISTTProvider`, `ITTSProvider`) + Gemini/Ollama/Vertex implementations
3. **Commit 3**: Multimodal document upload & extraction pipeline with DLP PII sanitization and confidence scoring
4. **Commit 4**: Voice Copilot WebSocket streaming + STT/TTS + intent classification
5. **Commit 5**: Structure-aware RAG pipeline, pgvector/SQLite hybrid search & RRF reranking
6. **Commit 6**: Remediation DSL runtime with typed tools, Sprint-100 Merkle ledger integration & D12 Step-Up auth
7. **Commit 7**: Web UI (CommandPalette voice, ActionCenter upload, RAG search, HITL modal)
8. **Commit 8**: Flutter Mobile UI (Voice Copilot, Camera OCR, Step 4 `SyncCoordinator` drain, HITL diff viewer)
9. **Commit 9**: E2E test suites, accessibility audit & `CHANGELOG.md` (v3.37.0)

---
*Draft v2 finalized and ready for Wave 1 implementation.*