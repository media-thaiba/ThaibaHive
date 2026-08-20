# ThaibaHive EngageOS — GDPR & FERPA Compliance & Consent Architecture

## 1. Regulatory Compliance Framework

EngageOS complies with the General Data Protection Regulation (GDPR) and the Family Educational Rights and Privacy Act (FERPA):

- **Lawful Basis (GDPR Art. 6)**:
  - Art. 6(1)(e) *Educational Public Task*: Essential academic status, grades, campus safety broadcasts.
  - Art. 6(1)(a) *Explicit Consent*: Marketing newsletters, optional surveys, extracurricular club alerts.
- **Data Minimization & FERPA Directory Information**: Personally Identifiable Information (PII) is encrypted at rest using AES-256-GCM.
- **One-Click Unsubscribe (GDPR Art. 7(3))**: HMAC-SHA256 authenticated unsubscribe tokens embedded in email headers and SMS footers.

---

## 2. Cryptographic Merkle Audit Trail

Every consent grant, revocation, and preference modification creates a cryptographically chained audit block linked to previous blocks via SHA-256 hashes:

$$\text{BlockHash}_i = \text{SHA-256}(\text{BlockHash}_{i-1} \parallel \text{PayloadHash}_i \parallel \text{Timestamp}_i)$$

- Persisted into the central compliance audit vault (`auditLogs` and `auditMerkleRoots` tables).
- Verifiable via `pnpm compliance:verify` and exportable as GDPR Article 15 Data Subject Access Request (DSAR) packages.
