# Stage 3 Task Specification: Tamper-Evident Cryptographic Audit Logging, Merkle Hash-Chaining & Integrity Verification (`stage3-crypto-audit-chaining-task.md`)

## 1. Objective & Scope
Stage 1 and Stage 2 wired transactional audit calls (`cryptoAuditWriter.log(..., tx)`) into session termination and multi-tenant RBAC mutations. **Stage 3** upgrades the audit subsystem into a mathematically verifiable, append-only cryptographic ledger featuring **Sequential SHA-256 Hash-Chaining, HKDF Domain-Separated HMAC-SHA256 Signatures, RFC 6962 Domain-Separated Merkle Inclusion Proofs, Append-Only Database Triggers, and Multi-Tenant Forensic Verification Endpoints** across both LibSQL/SQLite and PostgreSQL (`wrapPgDb` / `PGlite`).

---

## 2. Core Cryptographic & Architectural Invariants

### Invariant A: Deterministic Canonicalization & Hash-Chain Formula
1. **Recursive Key-Sorted Canonical JSON (`canonicalizePayload`)**:
   - Standard `JSON.stringify()` is non-deterministic across key insertion orders and JSONB round-trips in PostgreSQL.
   - Before hashing or storing, `payload` MUST be serialized via a deterministic recursive key-sorting canonicalizer (keys sorted lexicographically at every object depth, `undefined` properties stripped, arrays preserving element order).
2. **HKDF Audit Signing Key Derivation (`packages/auth/config.ts`)**:
   - Extend `JwtSecretPurpose` with `"audit-hmac"`.
   - Derive a dedicated 256-bit key via `crypto.hkdfSync("sha256", masterSecret, "thaibahive:jwt:salt:v1", "thaibahive:purpose:audit-hmac:v1", 32)` so session/step-up keys can never forge audit signatures.
3. **Contiguous Sequence & Genesis Record**:
   - Each tenant chain (or global chain partitioned by `tenantId`) starts at `sequenceNumber = 1` with `previousHash = "0".repeat(64)`.
   - Subsequent records in the chain MUST satisfy `record[n].sequenceNumber === record[n-1].sequenceNumber + 1` and `record[n].previousHash === record[n-1].currentHash`.
4. **Canonical Preimage & HMAC Signature**:
   - Preimage string (delimited cleanly to prevent field-concatenation collisions):
     `v1|${sequenceNumber}|${previousHash}|${tenantId}|${userId || "anonymous"}|${action}|${entityType}|${entityId}|${canonicalPayloadJSON}|${timestamp}`
   - `currentHash = SHA-256(preimage)` (64-char lowercase hex).
   - `signature = HMAC-SHA256(auditHmacKey, currentHash)` (64-char lowercase hex), verified using `crypto.timingSafeEqual`.

---

### Invariant B: Concurrency Serialization & Dual-Dialect Append-Only Immutability
1. **Chain Fork Prevention**:
   - Enforce a `UNIQUE(tenant_id, sequence_number)` (or global `UNIQUE(sequence_number)`) database constraint AND a `UNIQUE(tenant_id, current_hash)` constraint.
   - When `cryptoAuditWriter.log(entry, tx?)` executes inside a transaction, acquire the latest sequence head deterministically (and handle concurrent serialization retries or row/advisory locks cleanly so concurrent writes never produce duplicate sequence numbers or forked chains).
2. **Database-Level Append-Only Enforcement (No UPDATE / No DELETE)**:
   - The audit ledger is strictly append-only.
   - Install database triggers (or dialect-equivalent enforcement on SQLite and PostgreSQL/PGlite) on the cryptographic audit table that `RAISE(ABORT, 'Audit ledger is immutable: UPDATE/DELETE prohibited')` (SQLite) / `RAISE EXCEPTION 'Audit ledger is immutable: UPDATE/DELETE prohibited'` (PostgreSQL) whenever an `UPDATE` or `DELETE` statement is executed against existing audit rows.
   - *(Note: If physical tamper tests in C3.4/C3.5 need to simulate a compromised DBA mutating a row on disk, provide a dedicated test-only trigger bypass or test how the trigger itself blocks standard SQL tampering AND how `verifyAuditChainIntegrity` catches raw state corruption).*

---

### Invariant C: RFC 6962 Domain-Separated Merkle Tree & Inclusion Proofs
To prevent Merkle tree second-preimage attacks (where an attacker substitutes an internal node for a leaf node):
1. **Leaf Hash**: `H_leaf(currentHash) = SHA-256(Buffer.concat([Buffer.from([0x00]), Buffer.from(currentHash, "hex")]))`.
2. **Internal Node Hash**: `H_node(left, right) = SHA-256(Buffer.concat([Buffer.from([0x01]), Buffer.from(left, "hex"), Buffer.from(right, "hex")]))`.
3. **Odd-Leaf Promotion**: If a tree level has an odd number of nodes, promote the final unpaired node to the next level (or duplicate deterministically, documented and matched identically between `generateMerkleProof` and `verifyMerkleProof`).
4. **Functions to Expose (`src/lib/audit/merkle.ts`)**:
   - `computeMerkleRoot(hashes: string[]): string`
   - `generateMerkleProof(targetRecordId: string, windowRecords: AuditRecord[]): MerkleProof`
   - `verifyMerkleProof(proof: MerkleProof): boolean` (stateless mathematical verification using `crypto.timingSafeEqual`).

---

### Invariant D: Multi-Tenant Forensic Audit Endpoints & Step-Up Guards
1. **Tenant Isolation & RBAC**:
   - All `/api/admin/audit/*` routes require `hasPermission(session.role, "system:audit:read")` or `"system:audit:verify"`.
   - Enforce Stage 2 tenant scoping (`resolveScopedInstitutionId`):
     - `super_admin`: may inspect any `tenantId` or global chains.
     - `regional_admin`: restricted to their assigned regional cluster `tenantId`s.
     - `principal`: restricted strictly to `session.institutionId`.
     - Lower roles (`admin`, `hod`, `staff`) without audit permissions receive `403 Forbidden`.
2. **Endpoints**:
   - `GET /api/admin/audit/ledger`: Paginated/windowed ledger query filtered by `tenantId`, `fromSeq`, `toSeq`, `action`, with on-the-fly or batch integrity status.
   - `POST /api/admin/audit/verify-chain`: Runs `verifyAuditChainIntegrity(tenantId, fromSeq?, toSeq?)`. Returns `{ valid: boolean, checkedCount: number, merkleRoot: string, firstCorruptedSequence?: number, errorReason?: "HASH_MISMATCH" | "PREVIOUS_HASH_BROKEN" | "SIGNATURE_INVALID" | "SEQUENCE_GAP" }`.
   - `POST /api/admin/audit/export`: Requires a valid **Step-Up Token** (`action: "audit:export"` or `"audit:verify"`, consumed atomically via `consumeStepUpTokenInTx` with `isStepUpReplayError` protection). Returns a signed export bundle containing the canonical records, individual Merkle proofs or batch Merkle root, and a bundle-level HMAC signature.

---

## 3. Verification Matrix (C3.1 – C3.10)

All tests must be implemented in `packages/auth/__tests__/stage3-crypto-audit-chaining.test.ts` and `packages/auth/__tests__/stage3-postgres-pglite.test.ts` (`stage3-pglite-runner.ts`):

- **C3.1 (Genesis & Contiguous Chain Construction)**: First record in a tenant creates `sequenceNumber = 1` with `previousHash = "0".repeat(64)`. Subsequent records (`2..N`) link `previousHash === record[N-1].currentHash` with contiguous sequence numbers.
- **C3.2 (Canonical JSON Determinism)**: Identical payloads with differently ordered object keys (and nested objects) produce the exact same `canonicalPayloadJSON`, `currentHash`, and `signature`.
- **C3.3 (HKDF Domain Separation & HMAC Signature Verification)**: `verifyAuditChainIntegrity` detects a forged `signature` (e.g., signed with the `session` or `action-step-up` secret instead of `audit-hmac`, or a 1-bit flip in `signature`) and reports `errorReason: "SIGNATURE_INVALID"` at the exact `firstCorruptedSequence`.
- **C3.4 (Payload Tamper Detection — `HASH_MISMATCH` & `PREVIOUS_HASH_BROKEN`)**: If record `#3` in a 5-record chain has its stored `payload` or `action` mutated (even if its own `currentHash` is recomputed by an attacker without the HMAC key, or if `currentHash` is left stale), `verifyAuditChainIntegrity` pinpoints sequence `#3` (or `#4` if `#3` hash was rewritten) as compromised.
- **C3.5 (Sequence Gap / Deleted Record Detection — `SEQUENCE_GAP`)**: If record `#3` in a 5-record chain is missing/omitted from storage, `verifyAuditChainIntegrity` detects the sequence jump (`2 -> 4`) and broken `previousHash` link at sequence `#4`.
- **C3.6 (Database-Level Append-Only Immutability Enforcement)**: Executing a direct `db.update(cryptoAuditLog)` or `db.delete(cryptoAuditLog)` throws an immutability error across both SQLite/LibSQL and PostgreSQL (`PGlite`).
- **C3.7 (RFC 6962 Merkle Tree & Inclusion Proof Verification)**: `generateMerkleProof` produces a valid inclusion proof for any record in a batch (`N = 1, 4, 7` testing odd/even leaf counts); `verifyMerkleProof` returns `true` for valid proofs and `false` if leaf hash, sibling path, or root is tampered with, or if an internal node is substituted for a leaf (`0x00` vs `0x01` domain prefix).
- **C3.8 (Multi-Tenant Isolation on Forensic Routes)**: A `principal` in `inst_A` can verify/read `inst_A`'s audit chain, but receives `403 Forbidden` when querying or verifying `inst_B`'s audit chain; `regional_admin` is bounded to their cluster; `staff` receives `403`.
- **C3.9 (Step-Up Authentication & Replay Protection on Audit Export)**: `POST /api/admin/audit/export` rejects requests without a valid step-up token (`401`/`403`), enforces `payload.sid === session.sid`, consumes the JTI atomically, and rejects a replayed step-up token with `403`.
- **C3.10 (PostgreSQL / PGlite Dual-Dialect Parity & Transactional Atomicity)**: If a business transaction (e.g., role mutation + `cryptoAuditWriter.log(..., tx)`) rolls back due to an error, the audit record rolls back cleanly without leaving a sequence gap; full chain creation, immutability triggers, and verification pass 100% on PostgreSQL (`PGlite` via `wrapPgDb`).
