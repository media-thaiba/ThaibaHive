# Engineering Contract — Sprint-054

**Sprint ID:** SPRINT-054  
**Sprint Name:** Autonomous Institutional Procurement, Vendor Contracts & Supply Chain Intelligence (SUPPLY-HIVE / ProcurementOS)  
**Target Release Version:** v3.38.0  
**Contract Date:** 2026-08-21  
**Contract Status:** APPROVED — Ready for Implementation  
**Contract Author:** Implementation Engineer (Antigravity)  
**Source Recommendation:** `.ai/Sprint-054-Recommendation.md`  
**Review Status:** ✅ Reviewed and Aligned with AIOS Engineering Guide, Architecture Lead & Procurement Governance Standards  

---

## 1. Executive Summary

This engineering contract formalizes the implementation scope, system architecture, task decomposition, acceptance criteria, risk register, rollback procedures, and definition of done for **Sprint-054**. It governs all execution work by the Implementation Engineer until formal handoff to the Verification Engineer.

Following the successful deployment of 14 core subsystems and achieving 98% production hardening across the platform (most recently delivering high-performance research compute orchestration in NEURO-CLUSTER v3.37.0), ThaibaHive completes the final vital business integration layer: **Autonomous Institutional Procurement & Supply Chain Intelligence**:

$$\text{Autonomous Institution OS} = \underbrace{\text{Campus Operations Quad}}_{\text{TWIN-OPS} \times \text{ECO-MESH} \times \text{VISION-SHIELD} \times \text{FACILITY-MIND}} \times \underbrace{\text{Academic Triad}}_{\text{CORE} \times \text{KM-COPILOT} \times \text{ADVISE-MESH}} \times \underbrace{\text{NEURO-CLUSTER}}_{\text{HPC Compute}} \times \underbrace{\text{SUPPLY-HIVE (ProcurementOS)}}_{\text{Sprint-054 Supply Chain Backbone}}$$

Sprint-054 establishes **SUPPLY-HIVE / ProcurementOS** — an autonomous multi-tenant procurement lifecycle engine, vendor risk and ESG scoring system, automated 3-way invoice matching engine, dynamic contract milestone tracker, and double-entry budget encumbrance accounting ledger. It delivers:

1. **Autonomous Purchase Requisition & Multi-Stage Approval Routing Engine**: Intelligent requisition routing connecting departmental needs, predictive inventory triggers (FACILITY-MIND spare parts, NEURO-CLUSTER hardware components, administrative consumables), configurable multi-tiered approval chains, delegation authority, and automated spend thresholds.
2. **Multi-Tier Vendor Risk Screening & Global Sanctions Interceptor**: Automated screening against international sanctions registries (OFAC, UN, EU), PEP lists, business credit registries, and continuous adverse media intelligence with automated risk scoring ($0-100$) and vendor onboarding gating.
3. **ESG Sustainability Scoring & Ethical Supply Chain Engine**: Multi-dimensional vendor sustainability evaluations (Scope 3 carbon emissions, labor compliance, ethical sourcing, circular economy certifications) integrated with ECO-MESH to support institutional carbon neutrality targets.
4. **Intelligent 3-Way Invoice Matching Engine**: Automated line-item reconciliation matching Purchase Orders (PO), Goods Receipts (GRN), and Vendor Invoices with configurable tolerance bands ($\pm 2\%$ price, $\pm 0\%$ quantity), automated voucher generation for clean matches, and exception routing workflows for variances.
5. **Contract Milestone Lifecycle & Autonomous Renewal Engine**: Dynamic Master Service Agreement (MSA) and Statement of Work (SOW) tracking, deliverable milestone verification, automated penalty/rebate calculation, and early renewal alerts (90/60/30 days).
6. **Budget Encumbrance & Double-Entry Financial Ledger Integration**: Real-time pre-commitment fund reservations (`DEBIT: Encumbrance Expense`, `CREDIT: Encumbrance Reserve`), automated liquidation on invoice clearance, and double-entry integration with the platform finance ledger.
7. **Real-Time Supply Chain Telemetry Streaming & Prometheus OpenMetrics**: Authenticated Server-Sent Events (SSE) streaming live order lifecycle events, delivery milestones, spend gauges, and 10 standardized Prometheus OpenMetrics series.
8. **Admin Procurement Command Cockpit (`/admin/operations/procurement`)**: 5-tab administrative command studio: (1) Requisition & Order Flow Radar, (2) Vendor Directory & ESG Risk Matrix, (3) 3-Way Matching & Invoice Voucher Studio, (4) Contract Milestones & SLA Tracker, and (5) Spend Analytics & Budget Encumbrance Ledger.
9. **Vendor Self-Service Portal (`/portal/vendors`)**: Dedicated external vendor portal for digital onboarding, RFP/bid submissions, PO acknowledgments, advance shipping notices (ASN), invoice submissions, and compliance document renewals.
10. **TWIN-OPS 3D Warehouse & Receiving Bay Overlay**: Spatial integration rendering campus central warehouse storage bays, loading dock occupancy, and shipment receipt markers in the 3D digital twin.
11. **Flutter Mobile Procurement Approver & Receiving Companion**: Mobile-first application for department approvers and receiving dock managers with Riverpod state management: 1-tap PO approvals, barcode/QR receipt scanning, and urgent delivery alerts.
12. **End-to-End Simulation CLI Harness (`pnpm supply:simulate`)**: 8-stage automated simulation runner verifying requisition creation, multi-tier approval routing, vendor risk/ESG scoring, PO encumbrance, goods receiving, 3-way matching with discrepancy resolution, contract milestone settlement, and Merkle audit verification.
13. **Operational Documentation & Runbooks**: 5 comprehensive engineering guides and standard operating runbooks in `docs/operations/`.

---

## 2. Scope

### In Scope

| # | Domain | Detailed Description |
|---|---|---|
| 1 | **Dual-Store Procurement Schema** | 12 new Drizzle ORM entities with 100% schema parity across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`): `supply_vendors`, `supply_vendor_certifications`, `supply_vendor_risk_assessments`, `supply_vendor_esg_scores`, `supply_purchase_requisitions`, `supply_purchase_orders`, `supply_po_line_items`, `supply_goods_receipts`, `supply_vendor_invoices`, `supply_three_way_matches`, `supply_contracts`, `supply_contract_milestones`, `supply_budget_encumbrances`, and `supply_audit_logs`. |
| 2 | **Requisition & Approval Workflow Engine** | Multi-tier approval routing based on spend thresholds ($< \$1,000$ auto, $\$1,000 - \$10,000$ HOD, $\$10,000 - \$50,000$ Principal/Dean, $> \$50,000$ CFO/Board), delegate authority, SLA expiration timers, and escalation pathways. |
| 3 | **Predictive Inventory & Autonomous Parts Reordering** | Integration with FACILITY-MIND (work orders, spare parts) and NEURO-CLUSTER (hardware components) with dynamic economic order quantity (EOQ) and lead-time safety stock calculations. |
| 4 | **Vendor Risk Screening & Sanctions Interceptor** | Automated screening against international sanctions registries (OFAC, UN), PEP checks, business credit scores, adverse media sentiment, and automated onboarding gating. |
| 5 | **ESG Sustainability & Ethical Sourcing Engine** | Environmental, Social, and Governance scoring algorithms evaluating Scope 3 carbon footprint, labor standards, and circular recycling certifications, integrated with ECO-MESH. |
| 6 | **Intelligent 3-Way Invoice Matching Engine** | Automated line-item matching between Purchase Orders, Goods Receipts, and Vendor Invoices with configurable tolerance thresholds ($\pm 2\%$ price variance, $\pm 0\%$ quantity), automated voucher generation, and discrepancy resolution routing. |
| 7 | **Contract Milestone Lifecycle & Renewal Engine** | Dynamic contract tracking for Master Service Agreements, Statement of Work milestones, deliverable verification, SLA compliance metrics, and automated renewal triggers. |
| 8 | **Budget Encumbrance & Double-Entry Accounting** | Real-time GL account fund reservation upon PO issuance (`DEBIT: Encumbrance Expense`, `CREDIT: Encumbrance Reserve`), automated liquidation upon invoice match, and double-entry integration with the core Finance ledger. |
| 9 | **Real-Time Telemetry & Prometheus OpenMetrics** | Authenticated SSE stream for live order tracking and 10 Prometheus OpenMetrics series (`supply_po_created_total`, `supply_invoices_matched_total`, `supply_spend_encumbered_usd`, `supply_vendor_risk_score_avg`, `supply_esg_rating_avg`, `supply_discrepancies_flagged_total`, etc.). |
| 10 | **RBAC Protected REST API Gateway Suite** | Granular RBAC-shielded endpoints (`requireAuth`) for requisitions, orders, vendors, receipts, invoices, 3-way matching, contracts, and real-time streams with strict Zod validation. |
| 11 | **Admin Procurement Command Cockpit (`/admin/operations/procurement`)** | 5-tab Next.js command studio: Requisition & Order Flow Radar, Vendor Directory & ESG Risk Matrix, 3-Way Matching & Invoice Voucher Studio, Contract Milestones & SLA Tracker, and Spend Analytics & Budget Encumbrance Ledger. |
| 12 | **Vendor Self-Service Portal (`/portal/vendors`)** | External vendor onboarding, RFP / bid submission wizard, PO acknowledgment, digital shipping notices, invoice uploads, and compliance document renewal manager. |
| 13 | **TWIN-OPS 3D Warehouse & Receiving Bay Overlay** | Integration with TWIN-OPS 3D spatial viewer to render campus warehouse storage zones, loading dock occupancy status, and pending shipment receipt markers. |
| 14 | **Flutter Mobile Procurement Approver & Receiving Companion** | Mobile module (`mobile/lib/features/procurement/`) with Riverpod state management: 1-tap PO approvals, barcode/QR receipt scanning, and urgent delivery push alerts. |
| 15 | **End-to-End Simulation CLI Harness (`pnpm supply:simulate`)** | 8-stage automated CLI test harness executing realistic requisition creation, approval routing, risk/ESG screening, PO generation, goods receiving, 3-way matching, milestone payment, and Merkle audit verification. |
| 16 | **Operational Documentation & Runbooks** | 5 comprehensive engineering guides and standard operating runbooks in `docs/operations/`. |

---

### Out of Scope

| Area | Justification |
|---|---|
| Direct Banking Wire/SWIFT Payment Execution | ThaibaHive generates matched payment vouchers and journal entries; actual banking disbursement is handled via banking API connectors or treasury personnel. |
| Physical Barcode Printer Hardware Driver Development | Barcode and QR code assets are generated as standardized SVG/PDF formats; physical thermal printer spoolers operate via OS-level printer drivers. |
| Legal Jurisdiction Litigatory Arbitration | Contract milestone disputes and breach-of-contract arbitration are escalated to institutional general counsel; the platform maintains the immutable audit trail. |
| Customs Brokerage & Import Duty Clearance Processing | International customs clearance and tariff filings are managed by external licensed freight forwarders; the platform tracks estimated landed costs. |
| Physical Warehouse Robotics Control Systems | Automated Guided Vehicles (AGVs) and warehouse robotics are commanded via standard warehouse management system (WMS) webhooks outside direct core OS actuation. |

---

## 3. Technical Architecture & Component Interactions

```mermaid
flowchart TD
    subgraph Client Presentation Layer
        ADMIN_COCKPIT[Admin Procurement Cockpit\n/admin/operations/procurement]
        VENDOR_PORTAL[Vendor Self-Service Portal\n/portal/vendors]
        TWIN_3D_WH[TWIN-OPS 3D Warehouse\nReceiving Dock & Inventory Overlay]
        MOBILE_APP[Flutter Mobile Procurement Hub\n1-Tap Approval & QR Receipt Scanner]
    end

    subgraph API Gateway & Authentication
        API_GATEWAY[Secure RBAC API Gateway\nrequireAuth + Zod Validation]
        SSE_STREAM[Real-Time SSE Stream Manager\nOrder Lifecycle & Spend Telemetry]
    end

    ADMIN_COCKPIT <--> API_GATEWAY
    VENDOR_PORTAL <--> API_GATEWAY
    MOBILE_APP <--> API_GATEWAY
    API_GATEWAY --> SSE_STREAM
    SSE_STREAM --> ADMIN_COCKPIT
    SSE_STREAM --> VENDOR_PORTAL
    SSE_STREAM --> MOBILE_APP

    subgraph Core Orchestration Engine (SUPPLY-HIVE)
        REQ_ENGINE[Requisition & Workflow Router\nMulti-Stage Approval Chains]
        INVENTORY_REORDER[Predictive Inventory Engine\nEOQ & Safety Stock Thresholds]
        RISK_SCREENER[Vendor Risk & Sanctions Engine\nOFAC / PEP / Credit Scoring]
        ESG_ENGINE[ESG Sustainability Evaluator\nScope 3 & Circular Sourcing]
        MATCHING_ENGINE[3-Way Matching Engine\nPO vs. Receipt vs. Invoice]
        CONTRACT_MGR[Contract Milestone & SLA Manager\nDeliverable Tracking & Renewals]
        ENCUMBRANCE_ENGINE[Budget Encumbrance Ledger\nDouble-Entry GL Fund Lock]
    end

    API_GATEWAY <--> REQ_ENGINE
    REQ_ENGINE <--> INVENTORY_REORDER
    API_GATEWAY <--> RISK_SCREENER
    RISK_SCREENER <--> ESG_ENGINE
    API_GATEWAY <--> MATCHING_ENGINE
    MATCHING_ENGINE <--> CONTRACT_MGR
    REQ_ENGINE --> ENCUMBRANCE_ENGINE
    MATCHING_ENGINE --> ENCUMBRANCE_ENGINE

    subgraph Cross-Subsystem Mesh Integration
        FACILITY_MIND[FACILITY-MIND SmartCampus\nWork Order Spare Parts Reorder] <--> INVENTORY_REORDER
        NEURO_CLUSTER[NEURO-CLUSTER ResearchCompute\nGPU Hardware & Consumables] <--> INVENTORY_REORDER
        ECO_MESH[ECO-MESH NetZeroOS\nScope 3 Carbon Tracking] <--> ESG_ENGINE
        FINANCE_MODULE[Finance & Fee Ledger\nGeneral Ledger Journal Posting] <--> ENCUMBRANCE_ENGINE
        TWIN_OPS[TWIN-OPS Spatial Twin\nWarehouse Bay GIS Coordinates] <--> TWIN_3D_WH
    end

    subgraph Persistence & Audit Layer
        STORE[Supply Store Data Access Layer]
        DB[(Dual-Store Database\nSQLite Dev / PostgreSQL Prod)]
        MERKLE[Merkle Audit Trail Anchor\npnpm compliance:verify]
        OPENMETRICS[Prometheus OpenMetrics Exporter\n10 Standard Telemetry Series]
    end

    REQ_ENGINE --> STORE
    MATCHING_ENGINE --> STORE
    CONTRACT_MGR --> STORE
    ENCUMBRANCE_ENGINE --> STORE
    STORE <--> DB
    STORE --> MERKLE
    STORE --> OPENMETRICS
```

---

## 4. Implementation Task Breakdown

Tasks are decomposed into 10 logical implementation phases in strict dependency order. Foundational database schemas, store data access layer, and core workflow engines MUST be implemented and verified before developing UI dashboards, mobile features, and simulation runners.

---

### Phase 1 — Dual-Store Procurement Persistence Layer

#### SUPPLY-001 — Dual-Store Drizzle ORM Schemas for Procurement & Supply Chain
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-001 |
| **Phase** | Phase 1 — Dual-Store Procurement Persistence Layer |
| **Description** | Define 12 new Drizzle ORM entities with 100% schema parity across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`): `supply_vendors`, `supply_vendor_certifications`, `supply_vendor_risk_assessments`, `supply_vendor_esg_scores`, `supply_purchase_requisitions`, `supply_purchase_orders`, `supply_po_line_items`, `supply_goods_receipts`, `supply_vendor_invoices`, `supply_three_way_matches`, `supply_contracts`, `supply_contract_milestones`, `supply_budget_encumbrances`, and `supply_audit_logs`. |
| **Files** | `packages/db/schema.ts` [MODIFY] · `packages/db/schema.pg.ts` [MODIFY] · `src/lib/__tests__/db/supply-schema-parity.test.ts` [NEW] |
| **Dependencies** | None (Foundational Persistence Layer) |
| **Acceptance Criteria** | 1. All 12 tables declared with complete column parity, foreign keys, and indexes across SQLite and PostgreSQL.<br>2. Full support for vendor catalog records, multi-dimensional risk scores, ESG ratings, requisition items, PO lifecycle states, line-item pricing/tax, goods receiving batches, 3-way matching variance records, contract milestone deliverables, and budget encumbrances.<br>3. Parity test validates matching column names, nullability, data types, and index constraints with 100% pass rate. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/db/supply-schema-parity.test.ts`. |
| **Estimated Complexity** | Medium |

#### SUPPLY-002 — Procurement Store Data Access Layer & Multi-Tenant Isolation
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-002 |
| **Phase** | Phase 1 — Dual-Store Procurement Persistence Layer |
| **Description** | Implement `src/lib/db/supply-store.ts` and `src/lib/operations/supply/supply-types.ts`. Implement transactional CRUD helper methods for vendors, requisitions, purchase orders, line items, goods receipts, invoices, 3-way matches, contracts, milestones, and encumbrances with strict multi-tenant isolation. |
| **Files** | `src/lib/operations/supply/supply-types.ts` [NEW] · `src/lib/db/supply-store.ts` [NEW] · `src/lib/__tests__/db/supply-store.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001 |
| **Acceptance Criteria** | 1. Provides strongly typed CRUD operations for all 12 procurement entities with mandatory `institutionId` scoping.<br>2. Supports atomic multi-table transactions (e.g. PO creation + line items + budget encumbrance hold).<br>3. Implements pagination, status filtering, departmental spend querying, and relation preloading.<br>4. Comprehensive unit test suite confirms 100% transaction integrity and multi-tenant isolation. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/db/supply-store.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 2 — Autonomous Requisition Routing & Approval Workflow Engine

#### SUPPLY-003 — Multi-Stage Purchase Requisition & Approval Workflow Router
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-003 |
| **Phase** | Phase 2 — Autonomous Requisition Routing & Approval Workflow Engine |
| **Description** | Implement `src/lib/operations/supply/workflow/requisition-routing-engine.ts` and `src/lib/operations/supply/workflow/approval-chain-manager.ts`. Evaluates requisition monetary values against institutional spend policies, determines required approval tiers ($< \$1,000$ Auto-Approve, $\$1,000 - \$10,000$ HOD, $\$10,000 - \$50,000$ Principal/Dean, $> \$50,000$ Board/CFO), manages approval delegation, SLA timers, and automatic escalation. |
| **Files** | `src/lib/operations/supply/workflow/requisition-routing-engine.ts` [NEW] · `src/lib/operations/supply/workflow/approval-chain-manager.ts` [NEW] · `src/lib/operations/supply/workflow/workflow-types.ts` [NEW] · `src/lib/__tests__/operations/supply/requisition-routing-engine.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002 |
| **Acceptance Criteria** | 1. Routes requisitions through sequential and parallel approval steps based on configurable rules.<br>2. Handles delegation when approver is on leave and triggers escalation when SLA timer expires (e.g. 48 hours).<br>3. Enforces segregation of duties (requester cannot approve own requisition).<br>4. Executes approval routing evaluation in $< 10$ms. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/supply/requisition-routing-engine.test.ts`. |
| **Estimated Complexity** | High |

#### SUPPLY-004 — Predictive Inventory Thresholds & Autonomous Parts Reordering Engine
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-004 |
| **Phase** | Phase 2 — Autonomous Requisition Routing & Approval Workflow Engine |
| **Description** | Implement `src/lib/operations/supply/inventory/predictive-reorder-engine.ts` and `src/lib/operations/supply/inventory/eoq-calculator.ts`. Connects to FACILITY-MIND (HVAC filters, plumbing spares) and NEURO-CLUSTER (GPU thermal paste, cables, storage drives) to calculate Economic Order Quantity (EOQ), reorder points ($ROP = d \times L + SS$), and autonomously generate draft requisitions when stock dips below safety thresholds. |
| **Files** | `src/lib/operations/supply/inventory/predictive-reorder-engine.ts` [NEW] · `src/lib/operations/supply/inventory/eoq-calculator.ts` [NEW] · `src/lib/__tests__/operations/supply/predictive-reorder-engine.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002, SUPPLY-003 |
| **Acceptance Criteria** | 1. Computes optimal order quantities based on carrying costs, ordering costs, and historical consumption rates.<br>2. Automatically bundles recurring consumable demands to achieve vendor volume discount tiers.<br>3. Intercepts maintenance work order parts requests and generates linked purchase requisitions.<br>4. Prevents duplicate automated reorders while active POs are in transit. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/supply/predictive-reorder-engine.test.ts`. |
| **Estimated Complexity** | High |

---

### Phase 3 — Vendor Risk Screening, Sanctions & ESG Sustainability

#### SUPPLY-005 — Multi-Tier Vendor Risk Screening & Sanctions Interceptor
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-005 |
| **Phase** | Phase 3 — Vendor Risk Screening, Sanctions & ESG Sustainability |
| **Description** | Implement `src/lib/operations/supply/risk/vendor-risk-screening-engine.ts` and `src/lib/operations/supply/risk/sanctions-checker.ts`. Integrates simulated/live sanctions screening (OFAC, UN, EU), Politically Exposed Persons (PEP) matching, business credit risk rating, and fraud index calculation ($0-100$). Blocks high-risk vendors from receiving purchase orders. |
| **Files** | `src/lib/operations/supply/risk/vendor-risk-screening-engine.ts` [NEW] · `src/lib/operations/supply/risk/sanctions-checker.ts` [NEW] · `src/lib/operations/supply/risk/risk-types.ts` [NEW] · `src/lib/__tests__/operations/supply/vendor-risk-screening-engine.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002 |
| **Acceptance Criteria** | 1. Performs fuzzy string matching (Jaro-Winkler / Levenshtein $\ge 0.85$) against sanctions registries.<br>2. Calculates composite risk score based on credit rating, compliance certifications, and operational history.<br>3. Automatically flags or halts onboarding for any vendor with critical sanctions matches.<br>4. Generates tamper-evident risk screening certificates with timestamp and hash. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/supply/vendor-risk-screening-engine.test.ts`. |
| **Estimated Complexity** | High |

#### SUPPLY-006 — ESG Sustainability Scoring & Ethical Supply Chain Engine
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-006 |
| **Phase** | Phase 3 — Vendor Risk Screening, Sanctions & ESG Sustainability |
| **Description** | Implement `src/lib/operations/supply/esg/esg-scoring-engine.ts` and `src/lib/operations/supply/esg/carbon-supply-chain-tracker.ts`. Evaluates vendor ESG performance across Environmental (Scope 3 carbon intensity per dollar spend), Social (fair labor certifications, diversity vendor status), and Governance (anti-bribery policies, transparency). Integrates with ECO-MESH for net-zero reporting. |
| **Files** | `src/lib/operations/supply/esg/esg-scoring-engine.ts` [NEW] · `src/lib/operations/supply/esg/carbon-supply-chain-tracker.ts` [NEW] · `src/lib/__tests__/operations/supply/esg-scoring-engine.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002, SUPPLY-005 |
| **Acceptance Criteria** | 1. Assigns ESG letter ratings (AAA to CCC) and numeric scores ($0-100$) based on certified vendor documentation.<br>2. Tracks estimated Scope 3 supply chain carbon emissions ($\text{kg CO}_2\text{e}$) per purchase order.<br>3. Highlights sustainable vendor alternatives during requisition creation.<br>4. Generates institutional ESG procurement compliance reports. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/supply/esg-scoring-engine.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 4 — Intelligent 3-Way Matching Engine & Discrepancy Resolution

#### SUPPLY-007 — Intelligent 3-Way Invoice Matching Engine
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-007 |
| **Phase** | Phase 4 — Intelligent 3-Way Matching Engine & Discrepancy Resolution |
| **Description** | Implement `src/lib/operations/supply/matching/three-way-matching-engine.ts` and `src/lib/operations/supply/matching/matching-types.ts`. Reconciles Purchase Orders, Goods Receipt Notes (GRN), and Vendor Invoices at the line-item level. Evaluates unit prices, billed quantities vs. received quantities, and tax calculations against tolerance rules ($\pm 2\%$ price, $\pm 0\%$ quantity). |
| **Files** | `src/lib/operations/supply/matching/three-way-matching-engine.ts` [NEW] · `src/lib/operations/supply/matching/matching-types.ts` [NEW] · `src/lib/__tests__/operations/supply/three-way-matching-engine.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002 |
| **Acceptance Criteria** | 1. Performs automated 3-way matching across PO, Receipt, and Invoice with line-item granularity.<br>2. Automatically marks clean matches as `approved_for_payment` and creates payment voucher records.<br>3. Flags price variances exceeding $\pm 2\%$ or quantity overbillings as `discrepancy_flagged`.<br>4. Achieves $\ge 95\%$ accuracy on multi-line item invoice reconciliation. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/supply/three-way-matching-engine.test.ts`. |
| **Estimated Complexity** | High |

#### SUPPLY-008 — Discrepancy Resolution & Exception Routing Engine
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-008 |
| **Phase** | Phase 4 — Intelligent 3-Way Matching Engine & Discrepancy Resolution |
| **Description** | Implement `src/lib/operations/supply/matching/discrepancy-resolver.ts` and `src/lib/operations/supply/matching/debit-memo-generator.ts`. Automates exception management for failed 3-way matches: generates discrepancy tickets, routes variance approval requests to buyer/department head, generates automated vendor debit memos for damaged or short-shipped items, and manages partial payment releases. |
| **Files** | `src/lib/operations/supply/matching/discrepancy-resolver.ts` [NEW] · `src/lib/operations/supply/matching/debit-memo-generator.ts` [NEW] · `src/lib/__tests__/operations/supply/discrepancy-resolver.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002, SUPPLY-007 |
| **Acceptance Criteria** | 1. Routes discrepancy tickets to appropriate departmental buyer based on variance root cause (price vs. quantity).<br>2. Generates formal PDF/JSON vendor debit memos for short shipments or unapproved price hikes.<br>3. Allows authorized finance managers to approve legitimate minor variances with mandatory justification log.<br>4. Supports partial invoice liquidation for uncontested line items. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/supply/discrepancy-resolver.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 5 — Contract Milestone Lifecycle & Double-Entry Budget Encumbrance

#### SUPPLY-009 — Contract Milestone Lifecycle & Autonomous Renewal Engine
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-009 |
| **Phase** | Phase 5 — Contract Milestone Lifecycle & Double-Entry Budget Encumbrance |
| **Description** | Implement `src/lib/operations/supply/contracts/contract-lifecycle-manager.ts` and `src/lib/operations/supply/contracts/milestone-tracker.ts`. Tracks Master Service Agreements (MSA), Statement of Work (SOW) deliverables, milestone verification sign-offs, SLA uptime compliance, penalty/rebate calculations, and automated renewal/expiry notifications (90, 60, 30 days). |
| **Files** | `src/lib/operations/supply/contracts/contract-lifecycle-manager.ts` [NEW] · `src/lib/operations/supply/contracts/milestone-tracker.ts` [NEW] · `src/lib/operations/supply/contracts/contract-types.ts` [NEW] · `src/lib/__tests__/operations/supply/contract-lifecycle-manager.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002 |
| **Acceptance Criteria** | 1. Manages contract lifecycles from drafting through active execution, milestone releases, and renewal/termination.<br>2. Verifies deliverable attachments and manager approvals before releasing milestone payments.<br>3. Calculates SLA penalty deductions automatically based on service outage logs.<br>4. Emits proactive renewal warning alerts at 90, 60, and 30-day thresholds. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/supply/contract-lifecycle-manager.test.ts`. |
| **Estimated Complexity** | High |

#### SUPPLY-010 — Budget Encumbrance Control & Double-Entry Financial Ledger Integration
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-010 |
| **Phase** | Phase 5 — Contract Milestone Lifecycle & Double-Entry Budget Encumbrance |
| **Description** | Implement `src/lib/operations/supply/finance/budget-encumbrance-engine.ts` and `src/lib/operations/supply/finance/procurement-ledger-poster.ts`. Manages pre-commitment fund reservations upon PO approval (`DEBIT: Encumbrance Expense`, `CREDIT: Encumbrance Reserve`), validates real-time budget availability, prevents departmental budget overruns, and posts liquidating entries (`DEBIT: Encumbrance Reserve`, `CREDIT: Encumbrance Expense` + `DEBIT: Actual Expense`, `CREDIT: Accounts Payable`) upon invoice 3-way match. |
| **Files** | `src/lib/operations/supply/finance/budget-encumbrance-engine.ts` [NEW] · `src/lib/operations/supply/finance/procurement-ledger-poster.ts` [NEW] · `src/lib/operations/supply/finance/finance-types.ts` [NEW] · `src/lib/__tests__/operations/supply/budget-encumbrance-engine.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002, SUPPLY-003, SUPPLY-007 |
| **Acceptance Criteria** | 1. Locks budget funds in real time upon PO authorization, preventing over-commitment.<br>2. Liquidates encumbrances accurately upon invoice match and accounts payable recognition.<br>3. Maintains balanced double-entry journal postings for all procurement stages.<br>4. Reconciles seamlessly with platform Finance ledger (Sprint-005). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/supply/budget-encumbrance-engine.test.ts`. |
| **Estimated Complexity** | High |

---

### Phase 6 — Real-Time Telemetry Streaming, Metrics & Cryptographic Merkle Audit

#### SUPPLY-011 — Real-Time Supply Chain Telemetry Stream Manager
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-011 |
| **Phase** | Phase 6 — Real-Time Telemetry Streaming, Metrics & Cryptographic Merkle Audit |
| **Description** | Implement `src/lib/operations/supply/streaming/supply-stream-manager.ts`. Manages authenticated Server-Sent Events (SSE) and WebSocket channels broadcasting live procurement updates: PO state transitions, receiving dock check-ins, 3-way match completions, variance alerts, and spend limit warnings to admin and vendor portals. |
| **Files** | `src/lib/operations/supply/streaming/supply-stream-manager.ts` [NEW] · `src/lib/__tests__/operations/supply/supply-stream-manager.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002, SUPPLY-003 |
| **Acceptance Criteria** | 1. Broadcasts order lifecycle and receiving events with $< 50$ms latency.<br>2. Manages connection heartbeats, client auto-reconnection, and strict multi-tenant isolation by `institutionId`.<br>3. Supports topic filtering (e.g. `orders:status`, `receiving:dock`, `matching:variance`).<br>4. Buffers recent timeline events for newly connected client sessions. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/supply/supply-stream-manager.test.ts`. |
| **Estimated Complexity** | Medium |

#### SUPPLY-012 — Prometheus OpenMetrics Supply Chain Exporter
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-012 |
| **Phase** | Phase 6 — Real-Time Telemetry Streaming, Metrics & Cryptographic Merkle Audit |
| **Description** | Implement `src/lib/operations/supply/telemetry/supply-metrics.ts`. Exports 10 standardized Prometheus OpenMetrics series: `supply_po_created_total`, `supply_po_value_usd_total`, `supply_invoices_matched_total`, `supply_discrepancies_flagged_total`, `supply_spend_encumbered_usd`, `supply_vendor_risk_score_avg`, `supply_esg_rating_avg`, `supply_reorder_triggers_total`, `supply_contract_milestones_due_total`, and `supply_savings_achieved_usd`. |
| **Files** | `src/lib/operations/supply/telemetry/supply-metrics.ts` [NEW] · `src/lib/__tests__/operations/supply/supply-metrics.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002 |
| **Acceptance Criteria** | 1. Exposes all 10 metric series conforming to Prometheus OpenMetrics 1.0 standard.<br>2. Tags metrics with `institution_id`, `department_id`, `category`, and `status` labels.<br>3. Accurately calculates real-time encumbrance totals and procurement savings gauges.<br>4. Unit tests verify metric incrementing, gauge updates, and scrape text formatting. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/supply/supply-metrics.test.ts`. |
| **Estimated Complexity** | Low |

#### SUPPLY-013 — Cryptographic Merkle Audit Anchor for Procurement & Sourcing
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-013 |
| **Phase** | Phase 6 — Real-Time Telemetry Streaming, Metrics & Cryptographic Merkle Audit |
| **Description** | Implement `src/lib/operations/supply/security/supply-merkle-anchor.ts` and `src/lib/operations/supply/security/procurement-audit-verifier.ts`. Constructs a cryptographic SHA-256 Merkle tree anchoring every purchase requisition, approval signature, PO issuance, receiving inspection, 3-way match voucher, and contract amendment (`pnpm compliance:verify`). |
| **Files** | `src/lib/operations/supply/security/supply-merkle-anchor.ts` [NEW] · `src/lib/operations/supply/security/procurement-audit-verifier.ts` [NEW] · `src/lib/__tests__/operations/supply/supply-merkle-anchor.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002 |
| **Acceptance Criteria** | 1. Anchors all procurement mutations into an immutable SHA-256 hash chain.<br>2. Generates cryptographic inclusion proofs for external financial and compliance audits.<br>3. Detects unauthorized retroactive invoice alterations or approval bypasses with immediate mismatch alerts.<br>4. Integrates seamlessly with global platform compliance runner (`pnpm compliance:verify`). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/supply/supply-merkle-anchor.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 7 — Secure RBAC REST API Gateway Suite

#### SUPPLY-014 — REST API Handlers for Requisitions & Purchase Orders
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-014 |
| **Phase** | Phase 7 — Secure RBAC REST API Gateway Suite |
| **Description** | Implement API route handlers at `src/app/api/supply/requisitions/route.ts`, `src/app/api/supply/orders/route.ts`, `src/app/api/supply/orders/[id]/route.ts`, and `src/app/api/supply/orders/[id]/approve/route.ts`. All endpoints wrapped in `requireAuth` with Zod input validation schemas. Handles requisition submission, approval actions, PO dispatch, and status cancellation. |
| **Files** | `src/app/api/supply/requisitions/route.ts` [NEW] · `src/app/api/supply/orders/route.ts` [NEW] · `src/app/api/supply/orders/[id]/route.ts` [NEW] · `src/app/api/supply/orders/[id]/approve/route.ts` [NEW] · `src/lib/validation/supply-schemas.ts` [NEW] · `src/lib/__tests__/api/supply-order-routes.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002, SUPPLY-003, SUPPLY-010 |
| **Acceptance Criteria** | 1. Complete CRUD and state machine endpoints for requisitions and purchase orders.<br>2. Approval endpoint enforces RBAC permissions (`supply:orders:approve`) and validates approver authority thresholds.<br>3. Atomic encumbrance creation and budget validation on PO dispatch.<br>4. Gateway AST route scanner confirms 100% route shielding. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/api/supply-order-routes.test.ts` and `pnpm gateway:scan`. |
| **Estimated Complexity** | High |

#### SUPPLY-015 — REST API Handlers for Vendors, Risk & ESG Scoring
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-015 |
| **Phase** | Phase 7 — Secure RBAC REST API Gateway Suite |
| **Description** | Implement API route handlers at `src/app/api/supply/vendors/route.ts`, `src/app/api/supply/vendors/[id]/route.ts`, `src/app/api/supply/vendors/[id]/risk/route.ts`, and `src/app/api/supply/vendors/[id]/esg/route.ts`. Manages vendor catalog registration, tax ID validation, sanctions check execution, risk rating updates, and ESG document uploads. |
| **Files** | `src/app/api/supply/vendors/route.ts` [NEW] · `src/app/api/supply/vendors/[id]/route.ts` [NEW] · `src/app/api/supply/vendors/[id]/risk/route.ts` [NEW] · `src/app/api/supply/vendors/[id]/esg/route.ts` [NEW] · `src/lib/__tests__/api/supply-vendor-routes.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002, SUPPLY-005, SUPPLY-006 |
| **Acceptance Criteria** | 1. Supports vendor onboarding, directory queries, category filtering, and status updates.<br>2. Risk endpoint triggers automated sanctions scan and returns composite risk score.<br>3. ESG endpoint calculates and stores verified sustainability ratings.<br>4. RBAC checks enforce `supply:vendors:view` and `supply:vendors:manage` permissions. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/api/supply-vendor-routes.test.ts` and `pnpm gateway:scan`. |
| **Estimated Complexity** | High |

#### SUPPLY-016 — REST API Handlers for Goods Receipts, Invoices, 3-Way Matching, Contracts & Stream
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-016 |
| **Phase** | Phase 7 — Secure RBAC REST API Gateway Suite |
| **Description** | Implement API route handlers at `src/app/api/supply/receipts/route.ts`, `src/app/api/supply/invoices/route.ts`, `src/app/api/supply/invoices/match/route.ts`, `src/app/api/supply/contracts/route.ts`, `src/app/api/supply/contracts/[id]/milestones/route.ts`, and `src/app/api/supply/stream/route.ts`. All endpoints wrapped in `requireAuth` with Zod validation. |
| **Files** | `src/app/api/supply/receipts/route.ts` [NEW] · `src/app/api/supply/invoices/route.ts` [NEW] · `src/app/api/supply/invoices/match/route.ts` [NEW] · `src/app/api/supply/contracts/route.ts` [NEW] · `src/app/api/supply/contracts/[id]/milestones/route.ts` [NEW] · `src/app/api/supply/stream/route.ts` [NEW] · `src/lib/__tests__/api/supply-receipt-invoice-routes.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-007, SUPPLY-008, SUPPLY-009, SUPPLY-011 |
| **Acceptance Criteria** | 1. Goods receipt endpoint records received quantities, condition notes, and warehouse dock tags.<br>2. Invoice match endpoint executes 3-way reconciliation, returning match status or discrepancy details.<br>3. Contract endpoint manages agreements, milestones, and deliverable sign-offs.<br>4. Stream endpoint provides authenticated SSE telemetry feed. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/api/supply-receipt-invoice-routes.test.ts` and `pnpm gateway:scan`. |
| **Estimated Complexity** | High |

---

### Phase 8 — UI Cockpits, Vendor Portal & 3D Warehouse Digital Twin

#### SUPPLY-017 — Admin Procurement Command Cockpit (`/admin/operations/procurement`)
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-017 |
| **Phase** | Phase 8 — UI Cockpits, Vendor Portal & 3D Warehouse Digital Twin |
| **Description** | Build the 5-tab administrative command studio at `src/app/(shell)/admin/operations/procurement/page.tsx` and components in `src/components/operations/supply/admin/`: (1) Requisition & Order Flow Radar, (2) Vendor Directory & ESG Risk Matrix, (3) 3-Way Matching & Invoice Voucher Studio, (4) Contract Milestones & SLA Tracker, and (5) Spend Analytics & Budget Encumbrance Ledger. Built with standard UI primitives (`Card`, `Badge`, `Skeleton`, `Dialog`, `Alert`, `Tabs`). |
| **Files** | `src/app/(shell)/admin/operations/procurement/page.tsx` [NEW] · `src/components/operations/supply/admin/requisition-radar-tab.tsx` [NEW] · `src/components/operations/supply/admin/vendor-risk-matrix-tab.tsx` [NEW] · `src/components/operations/supply/admin/matching-voucher-tab.tsx` [NEW] · `src/components/operations/supply/admin/contract-milestones-tab.tsx` [NEW] · `src/components/operations/supply/admin/spend-encumbrance-tab.tsx` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-014, SUPPLY-015, SUPPLY-016 |
| **Acceptance Criteria** | 1. 5-tab dashboard renders smoothly with sub-3-second load times and zero stuck loading spinners.<br>2. Displays live order pipeline with visual stage progression (Draft $\to$ Approved $\to$ Dispatched $\to$ Received $\to$ Matched $\to$ Paid).<br>3. Interactive vendor risk & ESG matrix with color-coded risk tiers.<br>4. Conforms strictly to UI rules: no raw HTML inputs/buttons, proper `<Badge>` variants, `<Skeleton>` loaders. |
| **Verification Method** | Run Next.js build (`pnpm build`) and verify rendering via component unit tests. |
| **Estimated Complexity** | High |

#### SUPPLY-018 — Vendor Self-Service Portal (`/portal/vendors`)
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-018 |
| **Phase** | Phase 8 — UI Cockpits, Vendor Portal & 3D Warehouse Digital Twin |
| **Description** | Build the external vendor self-service portal at `src/app/(shell)/portal/vendors/page.tsx` and components in `src/components/operations/supply/vendor-portal/`: (1) Vendor profile and compliance certification manager, (2) Active Purchase Orders list with digital acknowledgment, (3) Advance Shipping Notice (ASN) submission modal, (4) Invoice upload and line-item submitter, and (5) RFQ / competitive bid submission wizard. |
| **Files** | `src/app/(shell)/portal/vendors/page.tsx` [NEW] · `src/components/operations/supply/vendor-portal/vendor-profile-card.tsx` [NEW] · `src/components/operations/supply/vendor-portal/vendor-orders-table.tsx` [NEW] · `src/components/operations/supply/vendor-portal/shipping-notice-modal.tsx` [NEW] · `src/components/operations/supply/vendor-portal/invoice-submission-card.tsx` [NEW] · `src/components/operations/supply/vendor-portal/bid-submission-modal.tsx` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-014, SUPPLY-015, SUPPLY-016 |
| **Acceptance Criteria** | 1. External vendors can securely log in, review assigned purchase orders, and confirm delivery ETAs.<br>2. Supports uploading digital invoices and submitting shipping tracking numbers.<br>3. Certification renewal wizard prompts for updated ISO/ESG documents before expiration.<br>4. Implements accessible, responsive layout conforming to design system standards. |
| **Verification Method** | Run Next.js build (`pnpm build`) and verify component unit tests. |
| **Estimated Complexity** | High |

#### SUPPLY-019 — Interactive 3-Way Matching & Discrepancy Studio Visualizer
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-019 |
| **Phase** | Phase 8 — UI Cockpits, Vendor Portal & 3D Warehouse Digital Twin |
| **Description** | Implement `src/components/operations/supply/matching/three-way-match-inspector.tsx` and `src/components/operations/supply/matching/discrepancy-resolution-dialog.tsx`. Visualizes side-by-side line-item comparison across PO, Goods Receipt, and Invoice. Highlights unit price variance, quantity differences, and allows 1-click debit memo generation or authorized managerial variance override. |
| **Files** | `src/components/operations/supply/matching/three-way-match-inspector.tsx` [NEW] · `src/components/operations/supply/matching/discrepancy-resolution-dialog.tsx` [NEW] · `src/components/operations/supply/matching/variance-heatmap.tsx` [NEW] |
| **Dependencies** | SUPPLY-007, SUPPLY-008, SUPPLY-016 |
| **Acceptance Criteria** | 1. Side-by-side 3-column table comparing PO lines, Receipt lines, and Invoice lines with diff highlighting.<br>2. Visual indicators for exact match (green), price variance (amber), and missing receipt / overbilling (red).<br>3. Modal permits authorized manager override with required audit justification input.<br>4. 1-click action triggers debit memo PDF/JSON generation for short-shipped items. |
| **Verification Method** | Run component unit test suite and verify visualizer rendering. |
| **Estimated Complexity** | Medium |

#### SUPPLY-020 — TWIN-OPS 3D Warehouse & Receiving Bay Spatial Overlay
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-020 |
| **Phase** | Phase 8 — UI Cockpits, Vendor Portal & 3D Warehouse Digital Twin |
| **Description** | Implement `src/components/operations/supply/twin/twin-warehouse-overlay.tsx` and `src/components/operations/supply/twin/receiving-dock-marker.tsx`. Integrates with the TWIN-OPS 3D campus viewer to render campus central warehouse storage aisles, loading dock status (occupied, available, inbound truck scheduled), and pending shipment delivery markers in the 3D scene. |
| **Files** | `src/components/operations/supply/twin/twin-warehouse-overlay.tsx` [NEW] · `src/components/operations/supply/twin/receiving-dock-marker.tsx` [NEW] · `src/components/operations/supply/twin/supply-twin-types.ts` [NEW] |
| **Dependencies** | SUPPLY-001, SUPPLY-002, SUPPLY-017 |
| **Acceptance Criteria** | 1. Renders 3D central warehouse storage bays at accurate campus GIS coordinates.<br>2. Displays real-time loading dock occupancy indicators and pending shipment arrival badges.<br>3. Clicking a dock marker displays shipment details, vendor name, and carrier tracking info.<br>4. Maintains $> 45$ FPS rendering in 3D digital twin scene. |
| **Verification Method** | Run component test suite and verify 3D overlay event hooks. |
| **Estimated Complexity** | High |

---

### Phase 9 — Mobile Integration (Flutter)

#### SUPPLY-021 — Flutter Mobile Procurement Approver & Receiving Companion
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-021 |
| **Phase** | Phase 9 — Mobile Integration (Flutter) |
| **Description** | Implement the mobile procurement companion in Flutter (`mobile/lib/features/procurement/`) using Riverpod state management: `ProcurementApprovalScreen` (manager 1-tap PO approval/rejection with budget preview), `DockReceivingScannerScreen` (barcode/QR scanning of arriving shipment packages to generate Goods Receipts), `VendorDirectoryScreen` (vendor contacts and risk badge), and `OrderTrackingDetailScreen` (delivery milestone timeline). |
| **Files** | `mobile/lib/features/procurement/application/supply_providers.dart` [NEW] · `mobile/lib/features/procurement/data/supply_api_service.dart` [NEW] · `mobile/lib/features/procurement/presentation/procurement_approval_screen.dart` [NEW] · `mobile/lib/features/procurement/presentation/dock_receiving_scanner_screen.dart` [NEW] · `mobile/lib/features/procurement/presentation/vendor_directory_screen.dart` [NEW] · `mobile/lib/features/procurement/presentation/order_tracking_detail_screen.dart` [NEW] · `mobile/lib/app/router.dart` [MODIFY] |
| **Dependencies** | SUPPLY-014, SUPPLY-015, SUPPLY-016 |
| **Acceptance Criteria** | 1. Riverpod providers manage real-time pending approvals, receiving batches, and order timelines.<br>2. Approver screen supports 1-tap approval/rejection with comment entry and budget impact gauge.<br>3. Dock screen integrates barcode/QR camera scanning to match package tracking number to active PO.<br>4. Routes registered under `lib/app/router.dart` with `_authGuard` protection; passes `flutter analyze`. |
| **Verification Method** | Run `flutter analyze` in `mobile/` directory. |
| **Estimated Complexity** | High |

---

### Phase 10 — End-to-End Simulation CLI Harness & Governance

#### SUPPLY-022 — End-to-End Procurement Simulation CLI Harness (`pnpm supply:simulate`)
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-022 |
| **Phase** | Phase 10 — End-to-End Simulation CLI Harness & Governance |
| **Description** | Implement `scripts/operations/supply-simulation-runner.ts` and add package script `pnpm supply:simulate`. Executes 8 comprehensive automated simulation stages: (1) Vendor Registration & Onboarding, (2) Global Sanctions Screening & ESG Sustainability Scoring, (3) Predictive Inventory Trigger & Requisition Creation, (4) Multi-Stage Approval Routing & Budget Encumbrance Lock, (5) Purchase Order Dispatch & Advance Shipping Notice, (6) Goods Receiving & QR Dock Inspection, (7) Intelligent 3-Way Invoice Matching with Price Variance Discrepancy Resolution, and (8) Contract Milestone Payment Settlement & Merkle Compliance Proof Generation. |
| **Files** | `scripts/operations/supply-simulation-runner.ts` [NEW] · `package.json` [MODIFY] · `src/lib/__tests__/simulation/supply-simulate.test.ts` [NEW] |
| **Dependencies** | SUPPLY-001 through SUPPLY-020 |
| **Acceptance Criteria** | 1. Simulation runner executes all 8 stages sequentially with colored terminal logging and exit code 0.<br>2. Verifies requisition routing, risk interceptor, encumbrance hold, goods receiving, 3-way matching, variance resolution, and Merkle audit trail.<br>3. Supports standalone flags: `--stage=workflow`, `--stage=risk`, `--stage=matching`, `--stage=encumbrance`.<br>4. Clean test execution incorporated into CI/CD regression verification. |
| **Verification Method** | Run `pnpm supply:simulate` and `pnpm test src/lib/__tests__/simulation/supply-simulate.test.ts`. |
| **Estimated Complexity** | High |

#### SUPPLY-023 — Cross-Subsystem Procurement Automation Synergies (FACILITY-MIND & NEURO-CLUSTER)
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-023 |
| **Phase** | Phase 10 — End-to-End Simulation CLI Harness & Governance |
| **Description** | Implement integration bridges in `src/lib/operations/supply/synergies/facility-parts-bridge.ts` and `src/lib/operations/supply/synergies/compute-hardware-bridge.ts`. Automatically bridges FACILITY-MIND work orders requiring out-of-stock spare parts directly into expedited purchase requisitions, and bridges NEURO-CLUSTER hardware expansion requests (GPU nodes, InfiniBand switches) into formal RFQ / tender workflows. |
| **Files** | `src/lib/operations/supply/synergies/facility-parts-bridge.ts` [NEW] · `src/lib/operations/supply/synergies/compute-hardware-bridge.ts` [NEW] · `src/lib/__tests__/operations/supply/supply-synergies.test.ts` [NEW] |
| **Dependencies** | SUPPLY-003, SUPPLY-004, SUPPLY-010 |
| **Acceptance Criteria** | 1. Work order parts request in FACILITY-MIND automatically triggers draft requisition linked to work order ID.<br>2. Compute hardware procurement in NEURO-CLUSTER links grant billing accounts to PO encumbrance.<br>3. Status updates on PO delivery automatically update work order part availability in FACILITY-MIND.<br>4. Comprehensive integration tests verify seamless cross-subsystem event triggers. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/supply/supply-synergies.test.ts`. |
| **Estimated Complexity** | Medium |

#### SUPPLY-024 — Procurement Architecture Guides & Standard Operating Runbooks
| Field | Specification Details |
|---|---|
| **Task ID** | SUPPLY-024 |
| **Phase** | Phase 10 — End-to-End Simulation CLI Harness & Governance |
| **Description** | Author 5 comprehensive operational runbooks and engineering reference guides in `docs/operations/`: (1) `procurement-os-architecture-guide.md` (subsystem architecture & approval workflows), (2) `vendor-risk-and-esg-standard.md` (sanctions screening, risk algorithms & ESG scoring), (3) `three-way-matching-and-exception-runbook.md` (reconciliation logic, variance thresholds & debit memos), (4) `budget-encumbrance-and-ledger-guide.md` (pre-commitment accounting & financial integration), and (5) `vendor-portal-integration-guide.md` (supplier onboarding, ASN, electronic invoicing & bid workflows). |
| **Files** | `docs/operations/procurement-os-architecture-guide.md` [NEW] · `docs/operations/vendor-risk-and-esg-standard.md` [NEW] · `docs/operations/three-way-matching-and-exception-runbook.md` [NEW] · `docs/operations/budget-encumbrance-and-ledger-guide.md` [NEW] · `docs/operations/vendor-portal-integration-guide.md` [NEW] |
| **Dependencies** | SUPPLY-001 through SUPPLY-023 |
| **Acceptance Criteria** | 1. All 5 guides authored with complete mathematical formulas, JSON configuration examples, and ASCII diagrams.<br>2. Covers workflow customization, risk thresholds, 3-way matching tuning, and audit readiness.<br>3. Formatted with clickable links and cross-references conforming to AIOS standards. |
| **Verification Method** | Verify markdown structure and documentation link integrity. |
| **Estimated Complexity** | Low |

---

## 5. Complete Repository File Structure Impact

```
packages/db/
├── schema.ts                                      [SUPPLY-001]
└── schema.pg.ts                                   [SUPPLY-001]

src/lib/
├── db/
│   └── supply-store.ts                            [SUPPLY-002]
├── operations/
│   └── supply/
│       ├── supply-types.ts                        [SUPPLY-002]
│       ├── workflow/
│       │   ├── workflow-types.ts                  [SUPPLY-003]
│       │   ├── requisition-routing-engine.ts      [SUPPLY-003]
│       │   └── approval-chain-manager.ts          [SUPPLY-003]
│       ├── inventory/
│       │   ├── predictive-reorder-engine.ts       [SUPPLY-004]
│       │   └── eoq-calculator.ts                  [SUPPLY-004]
│       ├── risk/
│       │   ├── risk-types.ts                      [SUPPLY-005]
│       │   ├── vendor-risk-screening-engine.ts    [SUPPLY-005]
│       │   └── sanctions-checker.ts               [SUPPLY-005]
│       ├── esg/
│       │   ├── esg-scoring-engine.ts              [SUPPLY-006]
│       │   └── carbon-supply-chain-tracker.ts     [SUPPLY-006]
│       ├── matching/
│       │   ├── matching-types.ts                  [SUPPLY-007]
│       │   ├── three-way-matching-engine.ts       [SUPPLY-007]
│       │   ├── discrepancy-resolver.ts            [SUPPLY-008]
│       │   └── debit-memo-generator.ts            [SUPPLY-008]
│       ├── contracts/
│       │   ├── contract-types.ts                  [SUPPLY-009]
│       │   ├── contract-lifecycle-manager.ts      [SUPPLY-009]
│       │   └── milestone-tracker.ts               [SUPPLY-009]
│       ├── finance/
│       │   ├── finance-types.ts                   [SUPPLY-010]
│       │   ├── budget-encumbrance-engine.ts       [SUPPLY-010]
│       │   └── procurement-ledger-poster.ts       [SUPPLY-010]
│       ├── streaming/
│       │   └── supply-stream-manager.ts           [SUPPLY-011]
│       ├── telemetry/
│       │   └── supply-metrics.ts                  [SUPPLY-012]
│       ├── security/
│       │   ├── supply-merkle-anchor.ts            [SUPPLY-013]
│       │   └── procurement-audit-verifier.ts      [SUPPLY-013]
│       └── synergies/
│           ├── facility-parts-bridge.ts           [SUPPLY-023]
│           └── compute-hardware-bridge.ts         [SUPPLY-023]
└── validation/
    └── supply-schemas.ts                          [SUPPLY-014]

src/app/api/supply/
├── requisitions/route.ts                          [SUPPLY-014]
├── orders/
│   ├── route.ts                                   [SUPPLY-014]
│   └── [id]/
│       ├── route.ts                               [SUPPLY-014]
│       └── approve/route.ts                       [SUPPLY-014]
├── vendors/
│   ├── route.ts                                   [SUPPLY-015]
│   └── [id]/
│       ├── route.ts                               [SUPPLY-015]
│       ├── risk/route.ts                          [SUPPLY-015]
│       └── esg/route.ts                           [SUPPLY-015]
├── receipts/route.ts                              [SUPPLY-016]
├── invoices/
│   ├── route.ts                                   [SUPPLY-016]
│   └── match/route.ts                             [SUPPLY-016]
├── contracts/
│   ├── route.ts                                   [SUPPLY-016]
│   └── [id]/
│       └── milestones/route.ts                    [SUPPLY-016]
└── stream/route.ts                                [SUPPLY-016]

src/app/(shell)/
├── admin/operations/procurement/page.tsx          [SUPPLY-017]
└── portal/vendors/page.tsx                        [SUPPLY-018]

src/components/operations/supply/
├── admin/
│   ├── requisition-radar-tab.tsx                  [SUPPLY-017]
│   ├── vendor-risk-matrix-tab.tsx                 [SUPPLY-017]
│   ├── matching-voucher-tab.tsx                   [SUPPLY-017]
│   ├── contract-milestones-tab.tsx                [SUPPLY-017]
│   └── spend-encumbrance-tab.tsx                  [SUPPLY-017]
├── vendor-portal/
│   ├── vendor-profile-card.tsx                    [SUPPLY-018]
│   ├── vendor-orders-table.tsx                    [SUPPLY-018]
│   ├── shipping-notice-modal.tsx                  [SUPPLY-018]
│   ├── invoice-submission-card.tsx                [SUPPLY-018]
│   └── bid-submission-modal.tsx                   [SUPPLY-018]
├── matching/
│   ├── three-way-match-inspector.tsx              [SUPPLY-019]
│   ├── discrepancy-resolution-dialog.tsx          [SUPPLY-019]
│   └── variance-heatmap.tsx                       [SUPPLY-019]
└── twin/
    ├── supply-twin-types.ts                       [SUPPLY-020]
    ├── twin-warehouse-overlay.tsx                 [SUPPLY-020]
    └── receiving-dock-marker.tsx                  [SUPPLY-020]

mobile/lib/features/procurement/
├── application/supply_providers.dart              [SUPPLY-021]
├── data/supply_api_service.dart                   [SUPPLY-021]
└── presentation/
    ├── procurement_approval_screen.dart           [SUPPLY-021]
    ├── dock_receiving_scanner_screen.dart         [SUPPLY-021]
    ├── vendor_directory_screen.dart               [SUPPLY-021]
    └── order_tracking_detail_screen.dart          [SUPPLY-021]

scripts/operations/
└── supply-simulation-runner.ts                    [SUPPLY-022]

docs/operations/
├── procurement-os-architecture-guide.md           [SUPPLY-024]
├── vendor-risk-and-esg-standard.md                [SUPPLY-024]
├── three-way-matching-and-exception-runbook.md    [SUPPLY-024]
├── budget-encumbrance-and-ledger-guide.md         [SUPPLY-024]
└── vendor-portal-integration-guide.md             [SUPPLY-024]
```

---

## 6. Security, RBAC & Compliance Framework

### RBAC Permissions Matrix

| Permission String | Role Access | Description |
|---|---|---|
| `supply:requisitions:view` | `super_admin`, `admin`, `principal`, `hod`, `staff` | View departmental purchase requisitions and approval tracking status. |
| `supply:requisitions:create` | `super_admin`, `admin`, `principal`, `hod`, `staff` | Submit new purchase requisitions with budget code and item line specifications. |
| `supply:orders:view` | `super_admin`, `admin`, `principal`, `hod`, `staff` | View purchase orders, shipping tracking details, and fulfillment statuses. |
| `supply:orders:approve` | `super_admin`, `admin`, `principal`, `hod` | Authorize purchase orders up to designated approval authority threshold. |
| `supply:orders:manage` | `super_admin`, `admin` | Create, dispatch, modify, or cancel purchase orders and encumbrances. |
| `supply:vendors:view` | `super_admin`, `admin`, `principal`, `hod`, `staff` | Browse approved vendor directory, catalog pricing, and ESG ratings. |
| `supply:vendors:manage` | `super_admin`, `admin` | Onboard vendors, manage tax compliance, configure payment terms, and trigger risk scans. |
| `supply:receipts:record` | `super_admin`, `admin`, `staff` (Receiving Dock) | Record physical goods receiving batches, item counts, condition, and dock tags. |
| `supply:invoices:match` | `super_admin`, `admin` (Finance Manager) | Execute 3-way invoice matching, approve variances, and release payment vouchers. |
| `supply:contracts:manage` | `super_admin`, `admin`, `principal` | Draft, execute, and sign MSAs, SOW milestones, and renewal agreements. |
| `supply:encumbrance:view` | `super_admin`, `admin`, `principal`, `hod` | View departmental budget encumbrance reserves, available balance, and GL transactions. |

### Compliance & Cryptographic Controls
- **Double-Entry Encumbrance Accounting:** Pre-commitment fund reservations ensure departmental budgets cannot be overspent before formal invoices arrive.
- **SHA-256 Merkle Chain Integrity:** Every requisition approval, PO dispatch, receiving receipt, 3-way match voucher, and payment release is cryptographically linked to the platform compliance Merkle tree (`pnpm compliance:verify`).
- **Strict Multi-Tenant & Departmental Isolation:** All vendor catalogs, purchase orders, invoices, and budget encumbrances are strictly partitioned by `institutionId` and departmental boundaries.
- **DPoP Cryptographic Proof of Possession:** High-value purchase order approvals ($> \$10,000$), contract sign-offs, and discrepancy overrides require DPoP token verification.

---

## 7. Risk Register & Mitigation Strategy

| Risk ID | Category | Risk Description | Severity | Probability | Mitigation Strategy |
|---|---|---|---|---|---|
| **R-054-1** | 3-Way Matching Variance Ambiguity | Complex vendor invoices with non-standard line descriptions or rounding differences causing high exception rates. | High | Medium | Implement configurable matching tolerance ($\pm 2\%$ price, $\pm 0\%$ quantity), automated line-item fuzzy matching, and rapid exception routing to buyers. |
| **R-054-2** | Budget Encumbrance Stale Locks | Abandoned or delayed purchase requisitions locking departmental budget allocations indefinitely. | Medium | Medium | Implement automated encumbrance expiration timers (e.g. 30-day auto-release if unapproved) and periodic encumbrance cleanup jobs. |
| **R-054-3** | External Sanctions API Downtime | Sanctions screening API outages blocking urgent vendor onboarding and emergency purchase orders. | High | Low | Implement cached offline sanctions snapshots with automatic failover to local watchlist databases and asynchronous verification queue. |
| **R-054-4** | Duplicate Invoicing Risk | Vendors submitting invoices via multiple channels (email, portal, paper) leading to potential double payments. | High | Low | Enforce strict uniqueness constraints on `(institution_id, vendor_id, invoice_number)` and automated hash fingerprinting of invoice payloads. |
| **R-054-5** | Vendor Portal Adoption Resistance | External suppliers resisting portal adoption and sending unstructured email attachments. | Medium | Medium | Provide seamless email-to-portal ingestion with automated OCR parsing and clean fallback manual entry forms for procurement staff. |
| **R-054-6** | Cross-Subsystem Stockout Risk | Predictive reorder engine triggering excessive automated orders during sudden demand spikes. | Medium | Low | Implement maximum reorder velocity clamps and require human buyer approval for high-frequency automated batch triggers. |

---

## 8. Rollback Plan

### Rollback Trigger Criteria
- 3-Way matching engine creates erroneous payment vouchers or miscalculates invoice line items.
- Budget encumbrance engine incorrectly locks general ledger accounts or causes double-entry journal unbalance.
- Requisition routing engine enters infinite escalation loops or blocks critical emergency purchases.
- Vendor risk interceptor mistakenly halts campus-wide procurement operations.

### Rollback Execution Steps

```bash
# Step 1: Disable SUPPLY-HIVE Subsystem via Environment Feature Flags (< 30 seconds)
SUPPLY_HIVE_ENABLED=false
SUPPLY_AUTOREORDER_ENABLED=false
SUPPLY_MATCHING_AUTOVOUCHER_ENABLED=false
SUPPLY_ENCUMBRANCE_AUTOPOST_ENABLED=false
SUPPLY_TWIN_WAREHOUSE_ENABLED=false

# Step 2: Enable Fallback Manual Procurement Mode (< 30 seconds)
SUPPLY_MANUAL_APPROVAL_FALLBACK=true

# Step 3: Revert Source Code & Migrations (if necessary) (< 5 minutes)
git revert --no-edit HEAD
pnpm build

# Step 4: Verification of Restored Baseline
pnpm typecheck
pnpm test
pnpm compliance:verify
```

---

## 9. Definition of Done

A Sprint-054 task is considered **COMPLETE** when all of the following quality gates are satisfied:

### Code Quality & Standards
- [ ] `pnpm typecheck` (`pnpm tsc --noEmit`) passes with 0 TypeScript errors across `src/`, `packages/auth`, and `packages/db`.
- [ ] `pnpm lint` passes with 0 errors and 0 new warnings.
- [ ] `flutter analyze` passes with 0 errors and 0 warnings in `mobile/`.
- [ ] Zero `console.log` statements in production source code (`src/`, `packages/`, `mobile/`).
- [ ] No hardcoded vendor API keys, sanctions credentials, secrets, or bypassed authorization checks.
- [ ] Complete TypeScript interfaces and JSDoc documentation on all exported types, functions, and classes.

### Testing & Verification
- [ ] Unit tests authored for every new module with $\ge 90\%$ code coverage.
- [ ] Full test suite passes: `pnpm test` $\to$ 100% pass rate across all test suites (including 20+ new SUPPLY-HIVE test suites).
- [ ] `pnpm gateway:scan --strict --json` $\to$ 100% route coverage verified with 0 unshielded endpoints.
- [ ] `pnpm compliance:scan` $\to$ 100% compliance audit coverage across all mutation routes.
- [ ] `pnpm compliance:verify` $\to$ Cryptographic Merkle audit chain verified intact.
- [ ] `pnpm security:tenants` $\to$ 0 cross-tenant isolation leaks across all files.
- [ ] `supply-schema-parity.test.ts` $\to$ 100% schema parity confirmed between SQLite and PostgreSQL.
- [ ] `pnpm supply:simulate` $\to$ All 8 simulation scenarios pass with 100% success.
- [ ] 3-Way matching reconciles $> 100$ line items in $< 50$ms with $< \pm 2\%$ variance detection.

### Security & RBAC
- [ ] All new SUPPLY-HIVE API routes protected with `requireAuth` and granular permissions.
- [ ] DPoP cryptographic proof of possession validated on high-value approvals, contract sign-offs, and discrepancy overrides.
- [ ] Strict row-level institution isolation verified across all queries.
- [ ] Sensitive vendor tax IDs, banking details, and pricing contracts strictly restricted to authorized personnel.

### Documentation & Governance
- [ ] 5 operational runbooks created in `docs/operations/`.
- [ ] `.ai/FEATURES.md` updated with Sprint-054 features.
- [ ] `.ai/CHANGELOG.md` updated with v3.38.0 release notes.
- [ ] `.ai/PROJECT_STATUS.md` updated with Sprint-054 deliverables.
- [ ] `.ai/execution/Sprint-054-Execution-Log.md` initialized with all 24 tasks.

---

## 10. Sprint Metadata & Lifecycle

| Metadata Field | Value |
|---|---|
| **Sprint ID** | SPRINT-054 |
| **Sprint Name** | Autonomous Institutional Procurement, Vendor Contracts & Supply Chain Intelligence (SUPPLY-HIVE / ProcurementOS) |
| **Target Release Version** | v3.38.0 |
| **Total Implementation Tasks** | 24 (SUPPLY-001 through SUPPLY-024) |
| **Estimated Sprint Duration** | 16–18 engineering days |
| **Estimated Complexity** | Large |
| **Predecessor Sprint** | SPRINT-053 (v3.37.0 — Autonomous Research Computing & High-Performance AI Cluster Orchestrator — NEURO-CLUSTER / ResearchCompute OS) |
| **Successor Artifact** | `.ai/execution/Sprint-054-Execution-Log.md` |
| **Release Certificate Artifact** | `.ai/releases/Release-Certificate-Sprint-054.md` |

---

*Engineering Contract authored by: Implementation Engineer (Antigravity)*  
*Date: 2026-08-21*  
*ThaibaHive Institution OS — Sprint-054 v3.38.0 Engineering Lifecycle*
