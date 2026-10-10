# Phase 8 SPEC: AI Copilot V2 — Multimodal LLM & Autonomous Remediation

## Ambiguity Score: 3/10 (Low — builds on Phase 6 messaging mesh + Phase 7 infra)

---

## What This Phase Delivers (User-Visible)

### Staff / Teacher Experience
- **Voice Copilot**: Hands-free "Hey Thaiba, draft a circular to Grade 10 parents about exam schedule" → audio → text → structured draft → preview → send
- **Document Intelligence**: Upload fee receipt photo / medical certificate / ID card → OCR + schema extraction → auto-populate forms (fee reconciliation, leave approval, student onboarding)
- **CCTV Anomaly Triage**: "Show me all slip-fall incidents in Block A yesterday" → Vision Shield frames → LLM summary with timestamps, severity, recommended actions
- **Autonomous Remediation Loop**: "Reconcile all fee discrepancies for batch 2026" → multi-agent execution (fetch → analyze → propose → HITL approve → execute)

### Parent / Student Experience
- **Voice Query**: "What's my child's fee balance?" → spoken response with breakdown
- **Document Upload**: Snap photo of payment receipt → auto-match to fee ledger → instant confirmation

### Admin Experience
- **Policy RAG**: "What's the leave policy for contractual staff?" → grounded answer with citations
- **Bulk Operations**: "Generate report cards for all Grade 12 sections" → multi-agent pipeline with progress stream

---

## What This Phase Does NOT Deliver (Explicit Exclusions)

| Excluded | Reason |
|----------|--------|
| Custom model fine-tuning | Use RAG + prompt engineering; fine-tune = separate ML platform track |
| Real-time video calling | WebRTC = Track 3C (hardware) |
| Autonomous financial transactions > ₹10,000 | Always HITL; limit configurable per role |
| Agent-to-agent marketplace | v3.38+ feature |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
                              CLIENT LAYER
├──────────────────┬──────────────────┬──────────────────────────────────────┤
│   Web (Next.js)  │  Mobile (Flutter) │  Admin Portal                       │
│  - Voice SDK     │  - Voice SDK      │  - RAG Search                       │
│  - File Upload   │  - Camera OCR     │  - HITL Modals                      │
└────────┬─────────┴────────┬──────────┴────────────┬────────────────────────┘
         │                  │                        │
         ▼                  ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
                            API GATEWAY (Next.js)
│  /api/ai/copilot/query     /api/ai/copilot/voice      /api/ai/documents      │
│  /api/ai/remediation/run   /api/ai/rag/search         /api/ai/approvals      │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  LLM Providers   │ │  Vector Store    │ │  Agent Runtime   │
│  - Gemini 2.5    │ │  - pgvector      │ │  - Workflow DSL  │
│  - Local Ollama  │ │  - Hybrid Search │ │  - Merkle Audit  │
│  - Vertex AI     │ │  - Reranker      │ │  - HITL Gates    │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## Core Modules

### 1. Multimodal Document Intelligence (`/api/ai/documents`)

**Input Types**:
- Images (JPEG/PNG/HEIC) — fee receipts, medical certs, ID cards, CCTV frames
- PDFs — circulars, policies, reports
- Audio — voice notes, dictation

**Processing Pipeline**:
```
Upload → Virus Scan → MIME Detect → 
  ├─ Image: Gemini Vision / Local OCR (Tesseract + LayoutLM) → Structured JSON
  ├─ PDF: pdf-parse + Vision for scanned pages → Text + Tables
  └─ Audio: Whisper (local) / Gemini Audio → Transcript → Intent Parse
→ Schema Validation (Zod) → Confidence Score → HITL if < 0.85
```

**Output Schemas** (Zod):
```typescript
// Fee Receipt
{ studentId, amount, date, method, transactionId, confidence }

// Medical Certificate
{ studentId, diagnosis, startDate, endDate, doctorName, hospital, confidence }

// ID Card
{ studentId, name, dob, bloodGroup, emergencyContact, confidence }

// CCTV Frame
{ timestamp, location, anomalyType, severity, personsDetected, confidence }
```

### 2. Voice Copilot (`/api/ai/copilot/voice`)

**Web**: Web Speech API (STT) → WebSocket → LLM → TTS (ElevenLabs / browser SpeechSynthesis)
**Mobile**: Native STT → REST → TTS

**Conversation Flow**:
```
User Speech → STT → Intent Classification → 
  ├─ Query: RAG Search → Answer
  ├─ Action: Workflow DSL → HITL Modal → Execute
  └─ Clarify: Follow-up Question
→ Response → TTS → Playback
```

**Supported Intents**:
- `fee.balance`, `fee.pay`, `fee.history`
- `leave.apply`, `leave.balance`, `leave.status`
- `attendance.today`, `attendance.report`
- `circular.create`, `circular.send`
- `student.lookup`, `student.profile`
- `report.generate`, `report.schedule`
- `remediation.run`, `remediation.status`

### 3. RAG + Policy Engine (`/api/ai/rag`)

**Corpus Sources**:
- Institutional policies (PDF/Markdown) — `documents` table with `type: 'policy'`
- Circulars & announcements — `circulars` table
- Academic calendar & exam schedules
- HR policies, leave rules, fee structures

**Pipeline**:
```
Ingest → Chunk (512 tokens, 50 overlap) → Embed (text-embedding-3-large / nomic-embed-text) 
→ Store in pgvector (HNSW index) → Query: Hybrid (vector + keyword) → Rerank (Cohere / bge-reranker)
→ Grounded Answer with Citations
```

**Access Control**: Tenant-scoped corpus; role-based document visibility

### 4. Autonomous Remediation Runtime (`/api/ai/remediation`)

**Workflow DSL** (extends Phase 6 `agenticWorkflows`):
```yaml
id: reconcile-fee-discrepancies
version: 2
trigger: manual | schedule | webhook
steps:
  - id: fetch-discrepancies
    tool: sql.query
    params: { query: "SELECT * FROM fee_ledger WHERE status = 'discrepancy'" }
  - id: analyze-each
    forEach: fetch-discrepancies.rows
    steps:
      - id: analyze
        tool: llm.analyze
        params: { prompt: "Analyze fee discrepancy for student {{item.studentId}}", schema: DiscrepancyAnalysis }
      - id: propose
        tool: notification.send
        params: { channel: "copilot-approvals", payload: { discrepancyId: "{{item.id}}", analysis: "{{analyze.output}}" } }
  - id: execute-approved
    filter: steps.propose.approved == true
    tool: fee.reconcile
    params: { discrepancyId: "{{item.id}}", resolution: "{{analyze.output.resolution}}" }
  - id: audit-log
    tool: merkle.log
    params: { workflowId: "{{runId}}", steps: ["*"] }
```

**HITL Gates**:
- `approval.required: true` → Modal in Web/Mobile with Accept/Reject/Modify
- `merkle.proof` → Immutable audit trail in `audit_logs` table
- `step-up.auth` → DPoP + biometric for sensitive ops

---

## API Contract (OpenAPI 3.1)

### Documents
- `POST /api/ai/documents/upload` — Multipart upload → `202 Accepted` + `documentId`
- `GET /api/ai/documents/:id` — Status + extracted JSON
- `POST /api/ai/documents/:id/confirm` — HITL confirm → persist to target table

### Voice Copilot
- `POST /api/ai/copilot/voice/start` — Returns `sessionId` + WebSocket URL
- `WS /api/ai/copilot/voice/ws/:sessionId` — Bidirectional audio frames
- `POST /api/ai/copilot/voice/end` — Close session

### RAG
- `POST /api/ai/rag/query` — `{ query, filters?, topK? }` → `{ answer, citations[] }`
- `POST /api/ai/rag/ingest` — Admin: ingest policy documents

### Remediation
- `POST /api/ai/remediation/run` — `{ workflowId, params }` → `runId`
- `GET /api/ai/remediation/runs/:id` — Status + step outputs + HITL pending
- `POST /api/ai/remediation/runs/:id/approve` — `{ stepId, decision, modifications? }`

### Approvals (HITL)
- `GET /api/ai/approvals/pending` — List pending for current user
- `POST /api/ai/approvals/:id/decide` — `{ decision, comment? }`

---

## Permission Matrix (Additive to v3.36.1)

| Permission | super_admin | admin | principal | hod | staff | accounts | purchase |
|------------|-------------|-------|-----------|-----|-------|----------|----------|
| `ai:copilot:query` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ai:copilot:voice` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ai:documents:upload` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ai:documents:confirm` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ai:rag:query` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ai:rag:ingest` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `ai:remediation:run` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `ai:remediation:approve` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `ai:approvals:decide` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `ai:admin:configure` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Data Model (Additive)

```sql
-- ai_documents
id              UUID PK
institution_id  UUID NOT NULL REFERENCES institutions(id)
uploaded_by     UUID NOT NULL REFERENCES staff(id)
mime_type       TEXT NOT NULL
original_name   TEXT
size_bytes      BIGINT
status          TEXT NOT NULL DEFAULT 'processing' CHECK IN ('processing','ready','confirmed','failed')
extracted_json  JSONB
confidence      REAL
confirmed_by    UUID REFERENCES staff(id)
confirmed_at    TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT now()

-- ai_copilot_sessions
id              UUID PK
institution_id  UUID NOT NULL
staff_id        UUID NOT NULL REFERENCES staff(id)
mode            TEXT NOT NULL CHECK IN ('voice','text')
status          TEXT NOT NULL DEFAULT 'active' CHECK IN ('active','ended')
context_json    JSONB
created_at      TIMESTAMPTZ DEFAULT now()
ended_at        TIMESTAMPTZ

-- ai_rag_corpus
id              UUID PK
institution_id  UUID NOT NULL
source_type     TEXT NOT NULL CHECK IN ('policy','circular','academic','hr')
source_id       TEXT NOT NULL
title           TEXT
content_hash    TEXT NOT NULL
chunk_index     INT NOT NULL
content         TEXT NOT NULL
embedding       VECTOR(1536)
metadata        JSONB
created_at      TIMESTAMPTZ DEFAULT now()
UNIQUE (institution_id, source_type, source_id, chunk_index)

-- ai_remediation_runs
id              UUID PK
institution_id  UUID NOT NULL
workflow_id     TEXT NOT NULL
triggered_by    UUID NOT NULL REFERENCES staff(id)
params          JSONB
status          TEXT NOT NULL DEFAULT 'pending' CHECK IN ('pending','running','paused','completed','failed')
current_step    TEXT
merkle_root     TEXT
started_at      TIMESTAMPTZ DEFAULT now()
completed_at    TIMESTAMPTZ

-- ai_remediation_steps
id              UUID PK
run_id          UUID NOT NULL REFERENCES ai_remediation_runs(id)
step_id         TEXT NOT NULL
status          TEXT NOT NULL DEFAULT 'pending' CHECK IN ('pending','running','waiting_approval','completed','failed')
input_json      JSONB
output_json     JSONB
merkle_leaf     TEXT
started_at      TIMESTAMPTZ
completed_at    TIMESTAMPTZ

-- ai_approvals
id              UUID PK
institution_id  UUID NOT NULL
run_id          UUID REFERENCES ai_remediation_runs(id)
step_id         UUID REFERENCES ai_remediation_steps(id)
requested_to    UUID NOT NULL REFERENCES staff(id)
payload         JSONB NOT NULL
decision        TEXT CHECK IN ('approved','rejected','modified')
comment         TEXT
decided_at      TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT now()
```

---

## LLM Provider Abstraction

```typescript
interface LLMProvider {
  chat(messages: Message[], tools?: Tool[]): Promise<ChatCompletion>;
  embed(texts: string[]): Promise<number[][]>;
  transcribe(audio: Buffer, format: 'wav'|'mp3'|'webm'): Promise<string>;
  synthesize(text: string, voice?: string): Promise<Buffer>;
  vision(image: Buffer, prompt: string): Promise<VisionResponse>;
}

// Implementations:
// - GeminiProvider (gemini-2.5-pro, gemini-2.5-flash)
// - OllamaProvider (llama3.1, mistral, phi3)
// - VertexProvider (gemini, claude via model garden)
```

**Routing**: `featureFlag('ai_provider')` → `gemini` | `ollama` | `vertex`

---

## Acceptance Criteria (Per Commit)

| Commit | Criteria |
|--------|----------|
| 1 Schema | `pnpm db:generate` → dual-dialect migrations; `pnpm security:rbac` passes |
| 2 LLM Abstraction | All providers implement interface; unit tests mock each |
| 3 Document Pipeline | Upload → Extract → Validate → HITL flow works for 4 doc types |
| 4 Voice Copilot | WebSocket STT → LLM → TTS round-trip < 2s p95 |
| 5 RAG Engine | Ingest 1000 chunks → query p95 < 500ms; citations accurate |
| 5 Remediation Runtime | DSL executes 5-step workflow with HITL + Merkle audit |
| 6 Web UI | Voice button in CommandPalette; Document upload in ActionCenter |
| 7 Mobile UI | Voice button in ChatScreen; Camera OCR in leave/fee flows |
| 8 Polish | All gates pass; a11y; release notes v3.37.0 |

---

## Open Questions (Resolve in discuss-phase)

1. **Local vs Cloud LLM default**: Ollama for dev, Gemini for prod? Cost/latency tradeoff.
2. **Voice privacy**: On-device STT (Whisper.cpp) vs cloud? Compliance requirement.
3. **Remediation rollback**: Sagas with compensating transactions — design now or v3.38?
4. **RAG freshness**: Incremental embedding updates vs full rebuild? Trigger on doc change.
5. **Rate limiting**: Per-user (30 req/min) vs per-institution (500 req/min)?

---

*Spec Version: 1.0*
*Reviewers: Qwen, opencode, Claude Code*
*Status: PENDING REVIEW*