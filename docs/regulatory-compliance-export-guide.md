# Regulatory Audit Evidence Preparation & Export Guide

## Overview

ThaibaHive Institution OS generates standardized, digitally signed compliance evidence dossiers for external auditors, compliance officers, and institutional accreditation bodies.

---

## Supported Regulatory Frameworks

1. **SOC 2 Type II:**
   - **CC6.1:** Logical Access Controls & Role Separation
   - **CC6.6:** Cryptographic Tamper-Proof Audit Logging (SHA-256 Merkle tree verification)
   - **CC7.2:** Real-Time Anomaly & Security Monitoring
   - **CC8.1:** Forensic State Reconstruction & Change Integrity

2. **ISO/IEC 27001:2022:**
   - **A.9.2:** User Access Management & Periodic Review
   - **A.12.4:** Logging, Event Monitoring & Cryptographic Verification
   - **A.12.1:** Operational Procedures & Threat Detection
   - **A.17.1:** Information Security Continuity & Snapshot Archival

3. **EU GDPR:**
   - **Article 30:** Records of Processing Activities
   - **Article 32:** Security of Processing & Encryption
   - **Article 33:** Breach Notification Readiness

4. **HIPAA Security Rule:**
   - **164.312(b):** Audit Controls & Cryptographic Chaining
   - **164.312(c):** Integrity Controls & Non-Repudiation
   - **164.308(a)(1):** Security Management & Threat Telemetry

---

## Generating Evidence Dossiers

### Web UI
1. Navigate to `/admin/compliance`.
2. Click **Export Dossier**.
3. Select the regulatory framework (SOC 2, ISO 27001, GDPR, HIPAA).
4. Click **Generate Signed Dossier** and download the resulting JSON / PDF pack.

### REST API
```http
POST /api/system/compliance/export
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "standard": "SOC2",
  "tenantId": "default",
  "format": "json"
}
```

---

## Auditor Verification Steps

External auditors can mathematically verify the exported evidence dossier without trusting application state:
1. Extract `checksumSha256` and `digitalSignature` from the export envelope.
2. Verify the RSA-SHA256 signature using the institution's public certificate:
   ```bash
   openssl dgst -sha256 -verify public.pem -signature export.sig export.json
   ```
3. Run the independent audit chain verification CLI against the database:
   ```bash
   pnpm compliance:verify --tenant=all
   ```
