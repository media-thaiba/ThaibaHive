# Internal PKI & mTLS Certificate Rotation Runbook
**Sprint-041 Operational Runbook | AIOS PKI Mesh**

---

## 1. Automated Lifecycle & Zero-Downtime Rotation
Every microservice in the ThaibaHive mesh is provisioned with an RFC 5280 X.509 certificate signed by the internal Root CA.

- **Standard Certificate TTL:** 60 days
- **Rotation Threshold:** 30 days before expiration
- **Dual-Certificate Grace Period:** Both old and new certificates remain valid during the 30-day overlap window to guarantee zero packet drop across rolling deployments.

---

## 2. Triggering Manual Certificate Rotation
Administrators can trigger immediate zero-downtime rotation via REST API or UI Radar:

```bash
curl -X POST https://thaibahive.internal/api/admin/security/zero-trust/certificates/academic-records-service/rotate \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "DPoP: <DPOP_PROOF>"
```

### Rotation Flow:
1. `CertRotationManager` generates new keypair & CSR.
2. `CaEngine` issues new X.509 certificate with incremented serial number.
3. `CertMeshSync` broadcasts `CERT_ROTATED` via Redis PubSub channel `thaiba:zasm:pki`.
4. Mesh proxies reload certificates dynamically without process restart.
5. Merkle audit log record `ZASM_CERT_ISSUED` is cryptographically appended.

---

## 3. Emergency Certificate Revocation (CRL)
If a service private key is compromised:

```bash
curl -X POST https://thaibahive.internal/api/admin/security/zero-trust/certificates \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"serialNumber": "SN-COMPROMISED-HEX", "reason": "KEY_COMPROMISE"}'
```

The serial number is immediately appended to the Certificate Revocation List (CRL) and synchronized across all nodes in $< 1000$ms.
