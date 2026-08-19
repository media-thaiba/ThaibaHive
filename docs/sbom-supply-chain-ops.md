# Software Bill of Materials (SBOM) & Supply Chain Security Operations
**Sprint-041 Operational Runbook | AIOS Supply Chain Architecture**

---

## 1. SBOM Generation Standard
ThaibaHive automatically inspects all production dependencies and generates standards-compliant SBOM artifacts:
- **CycloneDX v1.5 JSON:** `urn:uuid:...`, components with Package URLs (`pkg:npm/...`), and SHA-256 integrity hashes.
- **SPDX v2.3 JSON:** `SPDX-2.3`, package definitions, licensing expressions, and checksums.

---

## 2. On-Demand Supply Chain Vulnerability Scan
Operators can trigger an audit of all active modules and dependencies via CLI or API:

```bash
curl -X POST https://thaibahive.internal/api/admin/security/zero-trust/sbom/scan \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### Response Schema:
```json
{
  "success": true,
  "scanResult": {
    "scanId": "scan-1787154900-1234",
    "totalPackagesScanned": 142,
    "vulnerablePackageCount": 0,
    "criticalCount": 0,
    "highCount": 0,
    "licenseAudit": {
      "totalAudited": 142,
      "compliantCount": 142,
      "nonCompliantCount": 0
    }
  }
}
```

---

## 3. License Compliance Policy
ThaibaHive enforces strict IP and open-source licensing governance:
- **Permitted Licenses:** MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, CC0-1.0.
- **Restricted / Copyleft Licenses:** AGPL-3.0, GPL-2.0, GPL-3.0, SSPL, LGPL-3.0.
- Any dependency introducing copyleft restrictions triggers an automated security alert and blocks pipeline promotion.
