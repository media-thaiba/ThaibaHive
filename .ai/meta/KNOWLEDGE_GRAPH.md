# KNOWLEDGE_GRAPH.md — Semantic Relationship Matrix

> **Specification Tier**: Meta-Architecture System Layer (AIOS X.0)  
> **Source of Truth**: `.ai/meta/KNOWLEDGE_GRAPH.md`

---

## 1. Domain to Database & API Entity Mapping

```
Domain 07: Fee Management
  ├── Master Tables: students, fee_invoices, fee_receipts, financial_transactions
  ├── Shared APIs: /api/erp/fees/invoices, /api/erp/fees/collect
  ├── Permissions: fees:collect, fees:assign, fees:concession:apply
  ├── Events Produced: FeePaid, FeeOverdue
  ├── Workflows: fee-collection.md
  └── Automation Recipes: Recipe 21-40 (.ai/automation/recipes.md)
```

---

# KNOWLEDGE_LIFECYCLE.md — Knowledge Lifecycle & Version State Machine

```
[ Proposed / Draft ] ──► [ ARB Review ] ──► [ Approved Canonical ]
                                                   │
                                                   ├─(Supersede via ADR)─► [ Superseded ]
                                                   │
                                                   └─(Deprecate)─────────► [ Archived ]
```

---

# KNOWLEDGE_INDEX.md — Master Document Index

| Path | Version Layer | Purpose | Authority Level |
| :--- | :--- | :--- | :---: |
| `.ai/00_START_HERE.md` | AIOS 3.0 | System Vision & AI Startup Checklist | Level 1 (High) |
| `.ai/05_AI_RULES.md` | AIOS 3.0 | 100 Non-Negotiable Architectural Rules | Level 1 (High) |
| `.ai/08_DECISION_LOG.md` | AIOS 3.0 | Architectural Decision Records (ADRs) | Level 2 (High) |
| `.ai/domains/*.md` | AIOS 4.0 | 30 Enterprise Business Domain Specs | Level 3 (Medium) |
| `.ai/database/*.md` | AIOS 5.0 | Physical Schemas, Indexing & Tenancy | Level 3 (Medium) |
| `.ai/apis/*.md` | AIOS 5.0 | 19 REST API Specifications & Contracts | Level 3 (Medium) |
| `.ai/implementation/*.md`| AIOS 6.0 | Monorepo Structure & Shared Services | Level 4 (Medium) |
| `.ai/governance/*.md` | AIOS 7.0 | Strategy, Roadmap, Risk & Governance | Level 4 (Medium) |
| `.ai/engineering/*.md` | AIOS 8.0 | Engineering Handbook & Definition of Done| Level 4 (Medium) |
| `.ai/quality/*.md` | AIOS 9.0 | Certification Scorecards & Quality Gates| Level 5 (Operational)|
| `.ai/meta/*.md` | AIOS X.0 | Meta-Architecture & AI Reasoning System| Level 1 (High) |
