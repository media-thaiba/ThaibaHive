# migration-standards.md — Database Migration & Evolution Standards

> **Specification Tier**: Physical Architecture Blueprint (AIOS 5.0)  
> **Source of Truth**: `.ai/migrations/migration-standards.md`

---

## 1. Zero-Downtime Deployment Protocol
1. **Phase 1 (Additive Change)**: Apply SQL migrations adding new tables or optional/default-valued columns.
2. **Phase 2 (Dual Write Deployment)**: Deploy application code that reads from old columns and dual-writes to both old and new structures.
3. **Phase 3 (Backfill)**: Run background migration script populating historical values.
4. **Phase 4 (Final Code Release)**: Update application code to read exclusively from new structure.
5. **Phase 5 (Cleanup)**: Drop deprecated columns in subsequent release.

---

# performance-standards.md — Latency, Throughput & QPS Specifications

> **Specification Tier**: Physical Architecture Blueprint (AIOS 5.0)  
> **Source of Truth**: `.ai/performance/performance-standards.md`

---

## 1. Target Performance Latency Metrics

| Operation Type | Target p95 Latency | Target p99 Latency | Max SLA Bounds |
| :--- | :---: | :---: | :---: |
| **Authentication & Token Verify** | < 15 ms | < 30 ms | 50 ms |
| **Workspace Dashboard Stats** | < 40 ms | < 80 ms | 150 ms |
| **Single Entity CRUD (GET/POST)** | < 25 ms | < 50 ms | 100 ms |
| **Bulk Attendance Register Submit**| < 80 ms | < 150 ms | 300 ms |
| **Universal Search (Cmd+K)** | < 35 ms | < 70 ms | 120 ms |

---

# database-security.md — Database Security & Encryption Standards

> **Specification Tier**: Physical Architecture Blueprint (AIOS 5.0)  
> **Source of Truth**: `.ai/security/database-security.md`

---

## 1. Sensitive PII & Biometric Protection
* **Facial Vectors**: Encrypted via AES-256-GCM (`iv:authTag:ciphertext`) using `APP_MASTER_SECRET`.
* **Password Hashes**: Hashed using `bcryptjs` with work factor salt (10 rounds).
* **JWT Signing Keys**: Rotated regularly, stored securely in environment environment variables (`JWT_SECRET`).
* **Connection Encryption**: TLS 1.3 required for all production database connections.
