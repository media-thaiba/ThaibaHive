# Security & Backend Architecture Review: Phase 8 (AI Copilot V2)

**Status**: Completed  
**Review Target**: `.planning/phases/phase-8-ai-copilot-v2/PLAN.md` & `SPEC.md`  
**Reviewer**: Security & Backend Architecture Reviewer  
**Classification**: 5 Critical / High Findings Addressed in Draft v2

---

## Key Findings & Resolutions

### 1. Multi-Tenant Scoping & Dual-Dialect Vector Storage
- **Finding**: `ai_remediation_steps` lacked explicit `institution_id`, creating a risk of tenant leakage during step queries. Vector data types (`VECTOR(1536)`) break SQLite in-memory development environments.
- **Resolution**:
  - Enforce explicit `institution_id` with `REFERENCES institutions(id) ON DELETE CASCADE` on all `ai_*` tables and child step records.
  - Implement dual-dialect vector parity: SQLite uses `text("embedding")` (Float32 JSON serialized string with in-memory cosine fallback), while PostgreSQL uses `vector("embedding", { dimensions: 1536 })` with HNSW cosine distance indexing (`<=>`).
  - Add composite tenant indexes on `(institution_id, status)` and `(institution_id, created_at)`.

### 2. Elimination of Raw SQL Query Execution in Workflow DSL
- **Finding**: Proposed `tool: sql.query` allowed arbitrary SQL strings in YAML DSL, posing severe SQL injection and cross-tenant boundary breach risks upon indirect prompt injection.
- **Resolution**:
  - Ban generic `sql.query`. Replace with strongly typed, registered TypeScript executor tools (e.g. `tool: "finance.getFeeDiscrepancies"`, `tool: "leave.getPendingRequests"`).
  - All tools strictly inject `institutionId` and `staffId` from the authenticated session context.

### 3. Consolidation with Sprint-100 (AIGENT-OS) Architecture
- **Finding**: Proposing standalone `ai_remediation_runs`, `ai_remediation_steps`, and `ai_approvals` duplicated existing battle-tested tables from Sprint-100 (`agentic_workflow_runs`, `agentic_workflow_steps`, `agent_approval_gates`) and fragmented the Merkle audit chain.
- **Resolution**:
  - Re-use `agentic_workflow_runs` with `triggerType: 'copilot'`.
  - Re-use `agent_approval_gates` for HITL approvals.
  - Integrate all Copilot actions into `MerkleAuditLedger` (`src/lib/agents/guardrails/merkle-ledger.ts`) to maintain an unbroken sequential SHA-256 hash chain.

### 4. PII, FERPA & Health Data DLP Sanitization Layer
- **Finding**: Sending raw medical certificates, student disciplinary logs, or national ID numbers to external cloud APIs violates FERPA/HIPAA/DPDP Act.
- **Resolution**:
  - Add `src/lib/ai/guardrails/dlp-sanitizer.ts`:
    1. Mask sensitive identifiers (national IDs, phone numbers, SSNs) before cloud LLM dispatch.
    2. Enforce local-first routing: Medical certificates and sensitive student behavioral logs default to local on-premise models (Local Ollama / Tesseract / Whisper.cpp).

### 5. Multi-Tenant Token Budgeting & DoS Defense
- **Finding**: Global API keys allowed noisy-neighbor quota exhaustion and DoS via large file uploads.
- **Resolution**:
  - Add `aiTokenBudgets` table tracking monthly input/output token usage per institution.
  - Rate limiting via Redis sliding window: max 10 document uploads/min per user, max 50 audio frames/sec per voice WebSocket, and 60s silence timeout.
  - Enforce D12 Step-Up auth freshness ($\le 300\text{s}$) for high-risk financial and student record approvals.
