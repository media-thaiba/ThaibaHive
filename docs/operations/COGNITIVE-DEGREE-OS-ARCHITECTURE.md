# CognitiveDegree OS System Architecture

## 1. Domain Agent Dispatch Topology
```
Student Prompt / Event
        │
        ▼
Intent Classifier & Router
        │
  ┌─────┼─────────────────────────┬──────────────────────┐
  ▼     ▼                         ▼                      ▼
Degree  Career Alignment  Transfer Articulation  Academic Recovery / Aid
Planner     (AI/Cloud)         (OCR Matrix)          (Probation Triage)
  │     │                         │                      │
  └─────┴───────────┬─────────────┴──────────────────────┘
                    ▼
          Policy & Catalog RAG
                    │
                    ▼
          SSE Event Telemetry
```

## 2. Cryptographic Merkle Audit Trail
All advisor overrides, degree plan approvals, prerequisite waivers, and course substitutions are anchored in an immutable Merkle tree.
- **Leaf Formula**: `H(auditId || actionType || targetStudentId || planId || userId || role || timestamp || justification)`
- **Verification**: Provided via `advisingMerkleAnchor.verifyProof(leafHash, proof)` and `AuditTrailVerifier`.

## 3. Real-Time Telemetry Stream
- SSE endpoint: `GET /api/curriculum/stream?sessionId=<id>`
- Events: `token_chunk`, `domain_handoff`, `roadmap_updated`, `audit_completed`, `retention_alert_created`.
