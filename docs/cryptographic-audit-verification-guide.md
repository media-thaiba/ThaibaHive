# Cryptographic Audit Trail & Merkle Tree Verification Guide

## Overview

ThaibaHive Institution OS implements an enterprise cryptographic audit logging engine based on sequential SHA-256 block hash chaining and binary Merkle trees. Every administrative and financial mutation produces a tamper-evident cryptographic receipt guaranteeing non-repudiation.

---

## Cryptographic Architecture

### 1. Sequential Block Hash Chaining
Each audit log entry $E_i$ incorporates the cryptographic hash of the preceding entry $H_{i-1}$:
$$H_i = \text{SHA-256}(H_{i-1} \parallel \text{Timestamp} \parallel \text{TenantId} \parallel \text{UserId} \parallel \text{Action} \parallel \text{EntityType} \parallel \text{EntityId} \parallel \text{PayloadHash} \parallel \text{Nonce})$$

The genesis block for any tenant begins with a 64-character zero-string `0000000000000000000000000000000000000000000000000000000000000000`.

### 2. Binary Merkle Tree Batching
Micro-batches of audit entries (up to 100 entries or 50ms window) are aggregated into a binary Merkle tree. The Merkle root $R_k$ is computed deterministically:
$$R_{\text{parent}} = \text{SHA-256}(H_{\text{left}} \parallel H_{\text{right}})$$

Each individual audit record stores its Merkle inclusion proof:
```json
[
  { "position": "right", "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" }
]
```

---

## Running Verification

### Verification via CLI
To verify audit chain integrity for all tenants:
```bash
pnpm compliance:verify
```

To verify a specific tenant with custom batch limit:
```bash
pnpm compliance:verify --tenant=campus-alpha --limit=50000
```

JSON output format:
```bash
pnpm compliance:verify --tenant=all --json
```

### Verification via REST API
```http
POST /api/system/compliance/verify
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "tenantId": "campus-alpha",
  "limit": 10000
}
```

Response:
```json
{
  "valid": true,
  "status": "VALID",
  "totalVerified": 10000,
  "merkleRootsVerified": 142,
  "durationMs": 34,
  "timestamp": "2026-08-19T10:00:00.000Z"
}
```

---

## Incident Response: Corrupted Audit Chain
If the verification CLI or API returns `"status": "CORRUPTED"`, follow this standard operating procedure:

1. **Isolate Audit Record ID:** Inspect `corruptedAuditId` and `brokenIndex` reported by the verifier.
2. **Retrieve Forensic Snapshot:** Identify the most recent signed forensic state snapshot captured prior to the corruption timestamp.
3. **Run Diff Analysis:** Execute `scripts/compliance/snapshot-reconstruct.ts` to identify the tampered database fields.
4. **Append Cryptographic Correction Block:** Do not directly update SQL rows. Append a corrective mutation log signed by the Super Admin keystore referencing the incident ticket ID.
