# SafeCampus OS: FERPA & GDPR Privacy Architecture & Compliance (RUNBOOK-05)

## 1. Regulatory Mandates
- **FERPA (Family Educational Rights and Privacy Act)**: Protects student education records and biometric personally identifiable information (PII).
- **GDPR Article 9 (Special Category Data)**: Enforces strict limitations on processing biometric surveillance data.

## 2. Privacy-by-Design Technical Architecture
1. **On-Device Edge Blurring**:
   - 100% of human faces and vehicle license plates are irreversibly pixelated at the edge camera processor prior to frame metadata streaming.
2. **$(\epsilon, \delta)$-Differential Privacy**:
   - Crowd headcount and spatial occupancy analytics inject Laplace noise ($\epsilon = 1.0$), ensuring individual presence cannot be inferred by adversarial reconstruction attacks.
3. **7-Day Rolling Metadata Purging**:
   - Non-incident frame metadata and bounding box logs are permanently purged every 7 days. Purge verification is cryptographically anchored via SHA-256 Merkle root proofs in `vision_privacy_audit_logs`.
4. **Dual-Authorization Subpoena De-Anonymization**:
   - Access to unredacted emergency footage requires 2-of-2 multisig cryptographic approval from both the **Chief Information Security Officer** (CISO) and **University General Counsel**.
