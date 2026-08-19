# COMPATIBILITY_POLICY.md — Backward & Forward Compatibility Policy

> **Specification Tier**: Strategic Governance Framework (AIOS 7.0)  
> **Source of Truth**: `.ai/governance/COMPATIBILITY_POLICY.md`

1. **Database Schema Compatibility**: SQLite and PostgreSQL schemas MUST maintain structural parity (`schema.ts` and `schema.pg.ts`).
2. **API Backward Compatibility**: REST endpoints MUST retain backward compatibility for at least 2 minor versions.

---

# LIFECYCLE_POLICY.md — Feature & API Lifecycle Policy

* **Experimental**: Feature flags enabled in dev environments only.
* **Preview**: Opt-in testing for selected institutions.
* **Stable**: Production-ready, fully covered by SLA.
* **Deprecated**: Scheduled for retirement; sunset notice issued.
* **Retired**: Removed from codebase.

---

# TECHNICAL_DEBT_POLICY.md — Technical Debt Management Policy

* **Tech Debt Budget**: 15% of sprint engineering capacity allocated strictly to refactoring, performance optimization, and dependency updates.
* **Tracking**: Non-blocking lint warnings and deprecations tracked in `TODO.md` and resolved during tech debt sprints.

---

# RISK_REGISTER.md — Enterprise Risk Matrix & Mitigation Strategy

| Risk Category | Risk Scenario | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :---: | :---: | :--- |
| **Security** | Biometric Vector Data Leakage | Low | High | Encrypt face vectors using AES-256-GCM (`APP_MASTER_SECRET`). |
| **Scalability** | In-Memory SSE Scaling Bottleneck | Medium | Medium | Migrate SSE connection registry to Redis Pub/Sub in Phase 4. |
| **Compliance** | Missing Biometric Consent | Low | High | Enforce consent check in `student_biometric_consents` before matching. |
| **Data Integrity**| Multi-Campus Data Leakage | Low | Critical| Enforce row-level `institution_id` checks on every query via `requireAuth`. |

---

# VISION_2035.md — Long-Term Architectural & Global Evolution (2026–2035)

> **Specification Tier**: Strategic Vision Framework (AIOS 7.0)  
> **Source of Truth**: `.ai/governance/VISION_2035.md`

---

## 1. The Decade Horizon: 2026 to 2035

Over the next decade, **ThaibaHive Institution OS** will transition from a multi-campus operating system to the **global standard for autonomous institutional intelligence**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              VISION 2035 EVOLUTION HORIZON                             │
├──────────────────────────┬───────────────────────────┬─────────────────────────────────┤
│ 2026 - 2028              │ 2028 - 2031               │ 2031 - 2035                     │
│ Hybrid Monolith OS       │ Autonomous AI OS          │ Global Interconnected Network   │
│ - Unified Workspaces     │ - 80% Automated Workflows │ - Decentralized Identity (DID)  │
│ - Multi-Campus ERP       │ - Predictive Inventory/Fee│ - Cross-Institutional Credit    │
│ - Redis Cloud Cluster    │ - Voice & Spatial UI      │ - Global Beneficiary Passports  │
└──────────────────────────┴───────────────────────────┴─────────────────────────────────┘
```

---

## 2. Long-Term Architectural Transformations

### 2.1 Autonomous AI Administration
By 2031, the Ambient AI engine will autonomously resolve 80% of routine administrative workload—calculating complex class substitutions, executing predictive procurement, managing micro-fee installment plans, and flagging student welfare risks before human intervention is required.

### 2.2 Decentralized & Portable Academic Identity (DID)
Student academic records, biometric consent proofs, and certificates will transition toward W3C Decentralized Identifiers (DIDs) and Verifiable Credentials. Students moving between educational institutions globally can instantly transfer verified academic and medical histories without manual paper processing.

### 2.3 Global Interconnected Institutional Ecosystem
ThaibaHive OS will enable secure, opt-in cross-institutional collaboration. Universities, orphanages, NGOs, and research academies across different countries will share anonymized impact research, joint course registries, and resource-sharing networks seamlessly through the Open API Strategy.
