# ThaibaHive EngageOS — GDPR & FERPA Consent Compliance Guide

## 1. Regulatory Governance Principles

EngageOS enforces global educational data privacy standards including the EU/UK GDPR, US FERPA, and Indian DPDP Act:

- **Lawful Basis Management**:
  - Essential institutional notifications are authorized under GDPR Art. 6(1)(e) (Educational Public Task).
  - Optional engagement communications strictly require explicit, recorded opt-in (GDPR Art. 6(1)(a)).
- **One-Click Unsubscribe Tokens**: HMAC-SHA256 authenticated links in all emails allowing instant self-service revocation.
- **Right to Access (DSAR)**: Rapid export of communication history and consent audit chains for any stakeholder.

---

## 2. Cryptographic Consent Merkle Audit Trail

Every preference toggle and consent grant/revocation event is hashed and chained into the cryptographic audit log:

$$\text{BlockHash}_n = \text{SHA-256}(\text{BlockHash}_{n-1} \parallel \text{PayloadHash}_n \parallel \text{Timestamp}_n)$$

- Persisted into `auditLogs` and `auditMerkleRoots` via `cryptoAuditWriter`.
- Verifiable using `pnpm compliance:verify`.
