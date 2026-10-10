# AI/ML Systems Architecture Review: Phase 8 (AI Copilot V2)

**Status**: Completed  
**Review Target**: `.planning/phases/phase-8-ai-copilot-v2/PLAN.md` & `SPEC.md`  
**Reviewer**: AI/ML Systems Architecture Specialist  
**Classification**: 5 Critical AI/ML Enhancements Addressed in Draft v2

---

## Key Findings & Resolutions

### 1. Provider Interface Segregation & Streaming
- **Finding**: Monolithic `LLMProvider` combined Chat, Embedding, STT, and TTS into one interface, breaking Interface Segregation and blocking streaming.
- **Resolution**:
  - Segregate into domain capability interfaces: `IChatProvider`, `IEmbeddingProvider`, `ISpeechToTextProvider`, `ITextToSpeechProvider`.
  - Add `chatStream(request): AsyncIterable<ChatStreamChunk>` for sub-200ms TTFT (Time to First Token).
  - Implement Tiered Fallback Chain: Primary Gemini 2.5 Pro → Secondary Gemini 2.5 Flash → Tertiary Local Ollama (Llama 3.1 / Mistral 7B).

### 2. Embedding Dimension Alignment (1536 Standard)
- **Finding**: Dimension conflict between `SPEC.md` (`VECTOR(1536)`), `text-embedding-3-large` (3072 dims), and `nomic-embed-text` (768 dims).
- **Resolution**:
  - Fix standard dimension to **1536** across the platform (using `text-embedding-3-small` or `text-embedding-3-large` with `dimensions: 1536` Matryoshka truncation).
  - Use `text("embedding")` with serialized JSON float array in SQLite development and `vector("embedding", { dimensions: 1536 })` in PostgreSQL.

### 3. Structure-Aware RAG & Reciprocal Rank Fusion (RRF)
- **Finding**: Fixed 512-token chunking broke tabular policy circulars, fee breakdowns, and academic schedules; lack of hybrid ranking.
- **Resolution**:
  - Implement Markdown & Table-Aware Chunking preserving headers and table contexts.
  - Implement Small-to-Big retrieval (embed 256-token chunk, return 1024-token parent document context).
  - Hybrid Search scoring via Reciprocal Rank Fusion (RRF):
    $$\text{RRF Score}(d) = \frac{1}{60 + \text{rank}_{\text{vector}}(d)} + \frac{1}{60 + \text{rank}_{\text{BM25}}(d)}$$
  - Groundedness citation check comparing generated claims against source chunks.

### 4. Deterministic Multi-Factor Confidence Scoring
- **Finding**: LLM self-reported confidence (`confidence: 0.95`) is uncalibrated and prone to false negatives/positives.
- **Resolution**:
  - Compute deterministic score:
    $$\text{Confidence} = 0.4 \times \text{ZodFieldCompleteness} + 0.3 \times \text{RuleConsistency} + 0.3 \times \text{OCRClarity}$$
  - Enforce native Gemini `responseSchema` with `responseMimeType: "application/json"` and Ollama JSON grammar to eliminate extraction syntax errors.

### 5. Indirect Prompt Injection & Tool Execution Isolation
- **Finding**: OCR text from uploaded documents could contain prompt injection payloads targeting backend tool execution.
- **Resolution**:
  - Wrap all extracted document text in isolated XML boundary tags: `<untrusted_extracted_document>...</untrusted_extracted_document>`.
  - Document extraction prompts run in a zero-tool sandbox without access to system mutations or SQL execution.
