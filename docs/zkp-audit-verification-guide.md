# Zero-Knowledge Proof (ZKP) Audit Verification Guide

## Purpose

Provides cryptographic mathematical proof of audit trail inclusion and compliance verification without disclosing private tenant data or internal operational parameters.

## Circuit Architecture

- **Proving System**: Groth16 zk-SNARK over the BN128 elliptic curve.
- **R1CS Constraints**: $\le 10,000$ constraints for sub-50ms verification latency.
- **Public Inputs**:
  - `merkle_root`: The 32-byte SHA-256 Merkle root commitment.
  - `leaf_hash`: The SHA-256 hash of the audit entry.
- **Private Witness**:
  - `preimage`: Raw audit payload and salt.
  - `merkle_path`: Merkle branch sibling hashes.

## Verification Workflow

```
[Auditor / Regulator]
        |
        | 1. POST /api/v1/compliance/attestation/verify
        |    { proofId: "zkp-..." }
        v
[ZkAttestationService]
        |
        | 2. Groth16 Pairing Check e(A, B) = e(alpha, beta) * e(x, gamma) * e(C, delta)
        v
[Cryptographic Verdict]
        |
        | 3. Issue signed attestation receipt with SHA-256 commitment
        v
[Auditor Receives Valid SOC2 / HIPAA / GDPR Verification Receipt]
```
