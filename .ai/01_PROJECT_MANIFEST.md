# 01_PROJECT_MANIFEST.md — ThaibaHive Institution OS Manifest

> **Classification**: Core Vision & Governance  
> **Source of Truth**: `.ai/01_PROJECT_MANIFEST.md`

---

## 1. Project Philosophy

Traditional Institutional ERP systems are fundamentally flawed. They are designed around database tables, accounting ledgers, and rigid administrative forms. They treat human beings—teachers, students, parents, cashiers, wardens—as data entry clerks serving the database.

**ThaibaHive Institution OS** flips this model entirely:
* The system serves the human user, not the database.
* Work is structured around **intents and workflows**, not module menus.
* Complexity is encapsulated inside an **Intelligence & Automation Layer**.
* The software operates as an **Operating System for Campuses**, providing identity, security, financial, and operational services to diverse institution types.

---

## 2. Long-Term Vision

To become the single, universally adopted campus operating system for educational, residential, charitable, and moral institutions worldwide. 

Whether an institution is a K-12 school in Kathmandu, a residential university in Pokhara, an orphanage care home, an NGO skill center, or a specialized moral academy—ThaibaHive OS provides instant, out-of-the-box digital infrastructure without custom code rewrites.

---

## 3. Core Goals & Non-Goals

### Goals
1. **Universal Multi-Tenant Institution Architecture**: Single code platform serving multiple institution types via dynamic configuration.
2. **Intent-Driven Workspaces**: Replacing 60+ menu items with role-tailored workspaces (e.g., Principal Workspace, Cashier Workspace, Teacher Workspace).
3. **Task-Driven Wizards**: Replacing multi-field forms with step-by-step interactive wizards (e.g., Admission Wizard, Staff Onboarding Wizard).
4. **Proactive AI Intelligence**: Background event monitors that detect anomalies, generate reports, and draft actions automatically.
5. **Universal Entity Timelines**: Complete, searchable, audit-ready lifecycle history for every student, staff member, asset, vehicle, and financial ledger item.
6. **Zero-Trust Security & Biometrics**: Cryptographically secure identity verification using AES-256-GCM encrypted face embeddings, NFC tag matching, and httpOnly JWT sessions.

### Non-Goals
1. **Generic Business ERP**: We do NOT build generic corporate software (e.g., retail POS, software agency billing, manufacturing ERP).
2. **Siloed App Fragmentation**: We do NOT create separate codebases for schools vs. hostels vs. orphanages.
3. **Public Social Network**: We do NOT build open social feeds; all communications are strictly institution-scoped and role-gated.

---

## 4. Fundamental Design & Architecture Principles

### 1. The Experience Layer Principle
Users MUST interact with intent-focused Workspaces and Task Wizards. Direct CRUD table access is strictly prohibited for standard operational workflows.

### 2. The Shared Identity Principle
An individual in the system possesses a single Master Identity (`staff`, `students`, or `guardians`). Extended capabilities (e.g., being a Hostel Boarder, a Bus Passenger, or a Library Borrower) are attached via 1:1 extension records.

### 3. Strict Row-Level Institution Isolation
Every database query, API route, and real-time broadcast MUST enforce `institutionId` isolation. Cross-institution leakage is a critical security violation.

### 4. Zero Data Duplication
Financial ledgers, asset items, user identities, and audit records MUST have a single canonical source of truth. No shadow duplicate tables are permitted.

### 5. Proactive Event-Driven Automation
System state changes MUST emit events. The AI and Workflow engines consume these events asynchronously to automate reminders, escalations, and risk alerts.

---

## 5. Institution Typology Support Model

```
                               ┌────────────────────────────────────────┐
                               │       THAIBAHIVE INSTITUTION OS        │
                               └───────────────────┬────────────────────┘
                                                   │
         ┌───────────────────┬─────────────────────┼─────────────────────┬───────────────────┐
         ▼                   ▼                     ▼                     ▼                   ▼
┌─────────────────┐ ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐ ┌─────────────────┐
│ Schools & K-12  │ │ Universities    │   │ Residential &   │   │ Care Homes &    │ │ NGOs & Skill    │
│                 │ │ & Colleges      │   │ Hostels         │   │ Orphanages      │ │ Centers         │
├─────────────────┤ ├─────────────────┤   ├─────────────────┤   ├─────────────────┤ ├─────────────────┤
│ Class rosters,  │ │ Credit hours,   │   │ Room allocations│ │ Beneficiary care│ │ Batch schedules,│
│ CBSE/State marks│ │ Dept hierarchy, │   │ Mess headcount, │   │ Donor tracking, │ │ Modular fees,   │
│ Parent app      │ │ Placement cell  │   │ Night outpass   │   │ Welfare logs    │ │ Certifications  │
└─────────────────┘ └─────────────────┘   └─────────────────┘   └─────────────────┘ └─────────────────┘
```

---

## 6. Definition of Project Success

1. **User Efficiency**: A teacher marks attendance in < 15 seconds; a cashier processes a fee payment in < 20 seconds.
2. **Zero Manual Reconciliation**: Financial ledgers, asset counts, and student counts reconcile automatically across all 23+ group campuses.
3. **Zero Security Breaches**: Biometric embeddings remain AES-256-GCM encrypted; no raw identity data leakage occurs.
4. **Architectural Permanence**: The platform expands into 17+ business domains without breaking existing schemas or requiring structural rewrites.
