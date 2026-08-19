# PRODUCT_STRATEGY.md — Enterprise Product Strategy & Market Positioning

> **Specification Tier**: Strategic Governance Framework (AIOS 7.0)  
> **Source of Truth**: `.ai/governance/PRODUCT_STRATEGY.md`  
> **Target Horizon**: 2026–2035 Global Campus Operating System Expansion

---

## 1. Executive Product Vision & Mission

* **Product Vision**: To establish **ThaibaHive Institution OS** as the world's leading human-centered Campus Operating System—rendering traditional administrative ERPs obsolete by replacing table-driven menus with intent-focused Workspaces, Task Wizards, and Ambient AI Intelligence.
* **Product Mission**: To empower schools, universities, hostels, care homes, orphanages, NGOs, and skill centers with zero-friction digital infrastructure, unified identity, transparent financial control, and proactive administrative automation.

---

## 2. Competitive Differentiation Matrix

| Traditional Institutional ERP (SAP / Oracle / Legacy) | ThaibaHive Institution OS (AIOS 7.0) |
| :--- | :--- |
| **Data Model**: Organized around raw SQL tables & accounting ledgers. | **Experience Layer**: Organized around role-based Workspaces & intent-driven Wizards. |
| **Navigation**: Complex 60+ item menu trees causing user fatigue. | **Unified Navigation**: 7 App Hubs, global search (`Cmd+K`), and personalized feeds. |
| **Multi-Tenancy**: Require separate app deployments or custom code rewrites per institution. | **Universal Multi-Tenancy**: Dynamic entity model supporting 7+ campus typologies out of the box. |
| **AI Integration**: Gimmicky chatbot popups overlaid on complex forms. | **Ambient AI Engine**: Background event monitors drafting tasks, predicting inventory, and scheduling reminders. |
| **Biometrics & Security**: Fragmented third-party add-ons. | **Native Biometric Vault**: AES-256-GCM encrypted face vectors, NFC card bindings, and httpOnly JWTs. |

---

# PRODUCT_ROADMAP.md — Multi-Year Capability Roadmap

> **Specification Tier**: Strategic Governance Framework (AIOS 7.0)  
> **Source of Truth**: `.ai/governance/PRODUCT_ROADMAP.md`

---

## 1. Roadmap Phase Horizon

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   PHASE 1: NOW   │   │  PHASE 2: NEXT  │   │ PHASE 3: NEAR   │   │ PHASE 4: MID    │   │  PHASE 5: LONG  │
│  (2026 Q3-Q4)   │──►│  (2027 Q1-Q2)   │──►│ (2027 Q3-2028)  │──►│   (2028-2030)   │──►│   (2030-2035)   │
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## 2. Capability Mapping by Roadmap Phase

### Phase 1: NOW (Core Platform Polish & Wave 1 Finance)
* Operationalizing AIOS 3.0–6.0 foundation across pnpm workspace monorepo.
* Hardening core Auth, Staff, Attendance, Tasks, Leaves, and Supabase Storage integrations.
* Executing Wave 1 ERP: Double-entry Financial Ledgers, Fee Invoice Collections, and Cashier Workspaces.

### Phase 2: NEXT (Wave 2 Academics & Examinations)
* Rollout of Class Roster Batch Promotions Engine and Exam Tabulation Registers.
* Hall Ticket QR issuance with automated fee-clearance locks.
* Parent App Report Card publishing via encrypted PDF delivery.

### Phase 3: NEAR FUTURE (Wave 3 Campus Operations & Wave 4 Portals)
* Deployment of Residential Hostel Bed Allocations and Digital Outpass OTP approvals.
* Fleet Transport GPS tracking, passenger seat allocations, and route management.
* Library NFC circulation desk integration.
* Launch of Admissions Intake Wizards and Parent Multi-Child Experience Hubs.

### Phase 4: MID TERM (Wave 5 Automation & Distributed Cloud Scale)
* Full execution of 100 Cross-Domain Automation Recipes.
* Migration of SSE Realtime Hub and Rate Limiting to Redis Pub/Sub cluster.
* Introduction of National ID / DigiLocker OAuth document verifications.

### Phase 5: LONG TERM (Vision 2035 Autonomous Campus OS)
* Autonomous AI agents handling 80% of routine class substitutions, procurement orders, and fee reminders.
* Multi-region database sharding by `institution_id`.
* Open API Partner Marketplace for third-party ed-tech app extensions.
