# Engineering Contract — Sprint-057

**Sprint ID:** SPRINT-057  
**Sprint Name:** Centralized Fee Collection, Online Payment Gateway & Financial Reconciliation Mesh (FEE-HIVE / FinanceOS)  
**Target Release Version:** v3.41.0  
**Contract Date:** 2026-08-27  
**Contract Status:** APPROVED — Ready for Implementation  
**Contract Author:** Implementation Engineer (Antigravity)  
**Source Recommendation:** `.ai/Sprint-057-Recommendation.md`  
**Review Status:** ✅ Reviewed and Aligned with AIOS Engineering Guide, Architecture Lead & Financial Governance Standards  

---

## 1. Executive Summary

This engineering contract formalizes the implementation scope, system architecture, task decomposition, acceptance criteria, risk register, rollback procedures, and definition of done for **Sprint-057**. It governs all execution work by the Implementation Engineer until formal handoff to the Verification Engineer.

Following the successful delivery of Sprint-056 (DOC-GEN / ExportHub) and achieving 96% overall platform maturity across academic, examination, spatial, facility, supply chain, and security operations, ThaibaHive executes the single highest-value operational subsystem: **FEE-HIVE / FinanceOS** — a multi-campus, autonomous student fee collection, multi-gateway online payment processing, double-entry general ledger posting, instant cryptographic receipt generation, and financial reconciliation engine.

$$\text{Autonomous Institution OS} = \underbrace{\text{Academic Core}}_{\text{CORE} \times \text{TIMETABLE} \times \text{DOC-GEN}} \times \underbrace{\text{Campus Quad}}_{\text{TWIN-OPS} \times \text{ECO-MESH} \times \text{VISION} \times \text{FACILITY}} \times \underbrace{\text{Operations Mesh}}_{\text{SUPPLY-HIVE} \times \text{ENGAGE-OS}} \times \underbrace{\text{FEE-HIVE / FinanceOS}}_{\text{Sprint-057 Financial Backbone}}$$

Sprint-057 establishes **FEE-HIVE / FinanceOS** across all 23+ institutions of Thaiba Garden. It delivers:

1. **Dual-Store Fee Management Persistence Layer (12 Tables)**: 100% schema parity across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`) for structures, installments, student allocations, payments, transactions, receipts, scholarships, concessions, counter registers, defaulters, and reconciliation logs.
2. **Dynamic Fee Structure & Installment Matrix Engine**: Multi-tiered fee structures supporting tuition, boarding, transportation, examination, lab, library, and extracurricular components with dynamic installment schedules, prorated allocations, and automated late fine calculation policies.
3. **Multi-Gateway Payment Processing Abstraction Layer**: Unified payment gateway architecture with modular adapters for Razorpay, Stripe, UPI (Intent/QR), and Net Banking, featuring automatic failover routing, PCI-DSS tokenization, and strict HMAC-SHA256 signature verification.
4. **Idempotent Webhook Reconciliation Engine & Dead-Letter Queue (DLQ)**: Resilient, non-blocking webhook processing pipeline with exponential backoff retries, transactional idempotency keys, and automated dead-letter queue recovery to guarantee 100% payment capture without duplicates.
5. **Automated Double-Entry General Ledger (GL) Posting Mesh**: Real-time integration with institutional double-entry accounting emitting balanced debit/credit transactions to `GL:FEE_RECEIVABLE`, `GL:FEE_REVENUE`, `GL:BANK_CASH`, `GL:SCHOLARSHIP_EXPENSE`, `GL:FINE_INCOME`, and `GL:UNALLOCATED_SUSPENSE`.
6. **Dynamic Cryptographic PDF Fee Receipt Generator**: DOC-GEN integration generating tamper-proof, downloadable PDF receipts with institutional crests, line-item fee breakdowns, payment mode tokens, Merkle proof hashes, and public verification QR codes.
7. **Cash Counter Register & Supervisor Handover Reconciliation**: In-person cash and POS card collection register with shift open/close controls, physical voucher printing, cash-in-drawer tallying, and supervisor handover reconciliation.
8. **Scholarship, Concession & Financial Aid Approval Engine**: Multi-tier approval workflows for merit, need-based, orphan, and sibling concessions with automated ledger adjustments and audit logging.
9. **Aging Accounts Receivable (30/60/90 Days) & Defaulter Recovery Mesh**: Automated aging analysis with risk categorization, automated WhatsApp/SMS/Email payment reminders via EngageOS, and collection workflow triggers.
10. **Automated Bank Statement Settlement & Discrepancy Matching**: Automated bank statement parsing (CSV/MT940/CAMT.053) and gateway payout settlement reconciliation with automated discrepancy detection.
11. **Admin Finance Command Cockpit (`/admin/finance/fee-hub`)**: 5-tab administrative studio: (1) Fee Structure & Schedule Designer, (2) Collection & Transaction Ledger, (3) Counter Cash Register & Shifts, (4) Aging & Defaulter Management, and (5) Gateway Health & Reconciliation Studio.
12. **Student & Parent Self-Service Fee Portal (`/portal/fees`)**: Frictionless web payment interface featuring one-click checkout, installment selection, partial payment options, instant PDF receipt downloads, and scholarship status tracking.
13. **Flutter Mobile Fee Payment Hub (Riverpod)**: Native mobile module (`mobile/lib/features/fee_payment/`) with Riverpod state management, UPI deep linking, offline payment queue, and biometric receipt vault.
14. **End-to-End Simulation CLI Harness (`pnpm fee:simulate`)**: 8-stage automated simulation runner verifying structure configuration, multi-gateway checkout, webhook idempotency, GL journal balancing, receipt generation, aging escalation, cash shift handover, and statement reconciliation.
15. **Operational Documentation & Standard Runbooks**: 5 comprehensive engineering runbooks in `docs/operations/`.

---

## 2. Scope

### In Scope

| # | Domain | Detailed Description |
|---|---|---|
| 1 | **Dual-Store Persistence Layer (12 Tables)** | 12 new Drizzle ORM entities with 100% schema parity across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`): `fee_structures`, `fee_structure_components`, `fee_student_allocations`, `fee_installments`, `fee_payments`, `fee_payment_transactions`, `fee_receipts`, `fee_scholarships`, `fee_concessions`, `fee_counter_registers`, `fee_defaulter_logs`, `fee_reconciliation_batches`, and `fee_audit_logs`. |
| 2 | **Dynamic Fee Structure & Installment Engine** | Configurable fee schedules by campus, program, academic year, term, quota, and boarding status; dynamic installment generators, prorated calculations, grace period logic, and configurable late fine calculation rules (flat / daily compound / percentage). |
| 3 | **Multi-Gateway Payment Abstraction Layer** | Pluggable gateway adapter framework supporting Razorpay, Stripe, UPI (Deep Link / Dynamic QR), and Net Banking with standardized order creation, signature verification, refund initiation, and gateway health failover. |
| 4 | **Idempotent Webhook Consumer & DLQ Engine** | High-throughput, distributed webhook ingress pipeline with cryptographic signature validation, SHA-256 idempotency key deduplication, atomic transaction state transitions, dead-letter queue (DLQ) buffering, and automated replay. |
| 5 | **Double-Entry General Ledger (GL) Posting Engine** | Automated generation of balanced double-entry accounting journals for every payment, concession, refund, write-off, and fine charge, ensuring strict parity between subsidiary fee ledgers and institutional chart of accounts. |
| 6 | **Dynamic Cryptographic PDF Receipt Generation** | Integration with DOC-GEN (Sprint-056) to compile high-fidelity PDF payment receipts featuring institutional branding, itemized component tax tables, transaction reference numbers, HMAC-SHA256 signatures, and scannable verification QR vectors. |
| 7 | **Cash Counter Register & Shift Reconciliation** | In-person cashier module supporting cash, physical POS card swipes, cheques, and demand drafts with drawer opening floats, cash-drop logging, end-of-shift reconciliation, and supervisor blind-close approvals. |
| 8 | **Scholarship & Financial Aid Approval Engine** | Multi-tier approval workflows for merit scholarships, sibling discounts, staff concessions, and economic aid with automatic schedule recalculation, budget ceiling validation, and audit tracking. |
| 9 | **Aging Accounts Receivable & Defaulter Mesh** | Real-time aging bucket categorization (Current, 1–30 Days, 31–60 Days, 61–90 Days, 90+ Days) with automated severity scoring, restriction enforcement (exam hall ticket hold), and automated EngageOS reminder dispatch (WhatsApp / SMS / Email). |
| 10 | **Bank Statement & Payout Reconciliation Mesh** | Ingestion and reconciliation engine for bank statement files and gateway settlement batch reports, executing automated matching on reference IDs, amounts, and dates with flagged discrepancy workflows. |
| 11 | **RBAC-Protected REST API Gateway Suite** | 10 new RBAC-shielded endpoints (`requireAuth`) with strict Zod validation schemas covering fee configuration, student allocation, online checkout, payment webhook ingress, receipt fetching, counter transactions, and reconciliation. |
| 12 | **Real-Time Financial Telemetry & OpenMetrics** | Server-Sent Events (SSE) telemetry stream for real-time payment notifications and counter activities, coupled with 8 new Prometheus OpenMetrics series. |
| 13 | **Admin Finance Command Cockpit (`/admin/finance/fee-hub`)** | 5-tab Next.js 16 administrative studio: Fee Structure Designer, Collection & Transactions, Cash Counter & Shifts, Aging & Defaulters, and Reconciliation & Gateways. |
| 14 | **Student & Parent Self-Service Fee Portal (`/portal/fees`)** | Responsive parent/student web portal for viewing dues, selecting installment plans, applying concessions, executing online payments across gateways, and downloading receipts. |
| 15 | **Flutter Mobile Fee Payment Hub (Riverpod)** | Native mobile module (`mobile/lib/features/fee_payment/`) with Riverpod state management, native UPI intent launcher, offline payment receipt caching, and push reminder integration. |
| 16 | **End-to-End Simulation CLI Harness (`pnpm fee:simulate`)** | 8-stage automated simulation script testing full-lifecycle fee allocation, multi-gateway payments, webhook idempotency, GL ledger balancing, receipt generation, aging escalation, cash shift handover, and settlement reconciliation. |
| 17 | **Operational Documentation & Runbooks** | 5 comprehensive engineering guides and operating runbooks in `docs/operations/`. |

---

### Out of Scope

| Area | Justification |
|---|---|
| Direct Core Banking System (CBS) Host-to-Host (H2H) Protocol Daemon | Integration with commercial banks operates via standard API webhooks and SFTP/CSV statement ingestion; ISO 8583/AS2 direct financial switch connections require dedicated banking telecommunications infrastructure. |
| Physical Cash Dispensing / Cash Counting Machine Serial Driver Integration | Cash register tracks drawer float and manual cashier counts; hardware serial/USB cash counting machine optical scanners operate via third-party OS vendor drivers. |
| Cryptocurrency / Decentralized Blockchain Payment Gateways | Institutional policy mandates fiat currency transactions via regulated payment aggregators (RBI/SEBI/Central Bank compliance); crypto rails are strictly out of scope. |
| Direct Legal Recovery Court Proceedings Document Filing | Defaulter management manages aging buckets, communications, and administrative restrictions; formal external legal court proceedings are handled outside the operational software. |
| Point-of-Sale (POS) Pin-Pad EMV Chip Firmware SDK Embedding | In-person card payments record terminal transaction reference numbers; physical EMV kernel level 2 encryption is managed directly by certified bank POS hardware. |

---

## 3. Technical Architecture & Component Interactions

```mermaid
flowchart TD
    subgraph Client Presentation Layer
        ADMIN_COCKPIT[Admin Finance Cockpit\n/admin/finance/fee-hub]
        PARENT_PORTAL[Student/Parent Fee Portal\n/portal/fees]
        CASHIER_POS[Cash Counter & Register\nShift Float & Receipt Printer]
        MOBILE_APP[Flutter Mobile Payment Hub\nRiverpod + UPI Intent + Offline Cache]
    end

    subgraph API Gateway & Security Layer
        API_GATEWAY[Secure RBAC API Gateway\nrequireAuth + Zod Validation]
        WEBHOOK_INGRESS[Idempotent Webhook Ingress\nHMAC Signature + Nonce Verification]
        SSE_FINANCE[Real-Time Financial SSE Stream\nPayment Alerts & Counter Telemetry]
    end

    ADMIN_COCKPIT <--> API_GATEWAY
    PARENT_PORTAL <--> API_GATEWAY
    CASHIER_POS <--> API_GATEWAY
    MOBILE_APP <--> API_GATEWAY
    API_GATEWAY --> SSE_FINANCE
    SSE_FINANCE --> ADMIN_COCKPIT
    SSE_FINANCE --> MOBILE_APP

    subgraph Payment Gateway Aggregators
        RAZORPAY[Razorpay Gateway\nCards, UPI, NetBanking]
        STRIPE[Stripe Gateway\nInternational & Cards]
        UPI_INTENT[UPI Direct Intent\nGPay, PhonePe, BHIM]
    end

    PARENT_PORTAL --> RAZORPAY
    PARENT_PORTAL --> STRIPE
    MOBILE_APP --> UPI_INTENT
    RAZORPAY --> WEBHOOK_INGRESS
    STRIPE --> WEBHOOK_INGRESS
    UPI_INTENT --> WEBHOOK_INGRESS

    subgraph Core Orchestration Engine (FEE-HIVE / FinanceOS)
        STRUCTURE_ENGINE[Fee Structure & Installment Engine\nProration & Late Fine Calculator]
        PAYMENT_ROUTER[Payment Orchestration & Routing Engine\nAdapter Multi-Gateway Abstraction]
        WEBHOOK_WORKER[Idempotent Webhook Consumer & DLQ\nDeduplication & Replay Engine]
        GL_POSTING[Double-Entry GL Posting Mesh\nBalanced Debit/Credit Journal Generator]
        RECON_ENGINE[Bank Statement & Settlement Reconciliation\nAuto-Matching & Discrepancy Flagging]
        AGING_ENGINE[Aging & Defaulter Analytics\n30/60/90-Day Buckets & Restriction Matrix]
        SCHOLARSHIP_MGR[Scholarship & Concession Engine\nMulti-Tier Approval & Budget Enforcement]
    end

    API_GATEWAY <--> STRUCTURE_ENGINE
    API_GATEWAY <--> PAYMENT_ROUTER
    WEBHOOK_INGRESS --> WEBHOOK_WORKER
    WEBHOOK_WORKER --> PAYMENT_ROUTER
    PAYMENT_ROUTER --> GL_POSTING
    API_GATEWAY <--> CASHIER_POS
    CASHIER_POS --> GL_POSTING
    API_GATEWAY <--> SCHOLARSHIP_MGR
    SCHOLARSHIP_MGR --> STRUCTURE_ENGINE
    AGING_ENGINE <--> STRUCTURE_ENGINE
    RECON_ENGINE <--> PAYMENT_ROUTER

    subgraph Subsystem Integrations
        DOCGEN_ENGINE[DOC-GEN Engine (Sprint-056)\nCryptographic Signed PDF Receipts]
        ENGAGE_GATEWAY[EngageOS Gateway (Sprint-046)\nWhatsApp / SMS / Email Reminders]
        ACADEMIC_CORE[Academic Hive\nStudent Enrollment & Term Quotas]
        SUPPLY_GL[Supply Chain General Ledger\nChart of Accounts & Cost Centers]
    end

    PAYMENT_ROUTER --> DOCGEN_ENGINE
    AGING_ENGINE --> ENGAGE_GATEWAY
    STRUCTURE_ENGINE <--> ACADEMIC_CORE
    GL_POSTING <--> SUPPLY_GL

    subgraph Persistence & Audit Layer
        FEE_STORE[FEE-HIVE Store Layer\nAtomic Transactions & Tenant Isolation]
        DB[(Dual-Store Database\nSQLite Dev / PostgreSQL Prod)]
        MERKLE[Merkle Audit Trail Anchor\npnpm compliance:verify]
        OPENMETRICS[Prometheus OpenMetrics Exporter\n8 Financial Telemetry Series]
    end

    STRUCTURE_ENGINE --> FEE_STORE
    PAYMENT_ROUTER --> FEE_STORE
    GL_POSTING --> FEE_STORE
    RECON_ENGINE --> FEE_STORE
    AGING_ENGINE --> FEE_STORE
    FEE_STORE <--> DB
    FEE_STORE --> MERKLE
    FEE_STORE --> OPENMETRICS
```

---

## 4. Implementation Task Breakdown

Tasks are decomposed into 12 logical implementation phases in strict dependency order. Foundational database schemas, store data access layer, and core calculation engines MUST be implemented and verified before developing payment gateways, UI cockpits, mobile integrations, and simulation runners.

---

### Phase 1 — Dual-Store Persistence & Database Schema

#### FEE-001 — Dual-Store Drizzle ORM Schemas for Fee Management Subsystem
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-001 |
| **Phase** | Phase 1 — Dual-Store Persistence & Database Schema |
| **Description** | Define 12 new Drizzle ORM entities with 100% schema parity across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`): `fee_structures`, `fee_structure_components`, `fee_student_allocations`, `fee_installments`, `fee_payments`, `fee_payment_transactions`, `fee_receipts`, `fee_scholarships`, `fee_concessions`, `fee_counter_registers`, `fee_defaulter_logs`, `fee_reconciliation_batches`, and `fee_audit_logs`. |
| **Files** | `packages/db/schema.ts` [MODIFY] · `packages/db/schema.pg.ts` [MODIFY] · `src/lib/__tests__/db/fee-schema-parity.test.ts` [NEW] |
| **Dependencies** | None (Foundational Persistence Layer) |
| **Acceptance Criteria** | 1. All 12 tables declared with complete column parity, foreign keys, and indexes across SQLite and PostgreSQL.<br>2. Full support for multi-campus isolation (`institutionId`), currency codes, decimal fee amounts, installment schedules, gateway tokens, payment statuses, GL account codes, and Merkle audit hashes.<br>3. Parity test validates matching column names, nullability, data types, and index constraints with 100% pass rate. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/db/fee-schema-parity.test.ts`. |
| **Estimated Complexity** | Medium |

#### FEE-002 — Fee Store Data Access Layer & Multi-Tenant Isolation
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-002 |
| **Phase** | Phase 1 — Dual-Store Persistence & Database Schema |
| **Description** | Implement the centralized data access store layer (`src/db/fee-store.ts`) providing strongly typed CRUD operations, tenant-scoped queries, and atomic database transaction wrappers for fee structures, allocations, payments, receipts, and reconciliations. |
| **Files** | `src/db/fee-store.ts` [NEW] · `src/lib/__tests__/db/fee-store.test.ts` [NEW] |
| **Dependencies** | FEE-001 |
| **Acceptance Criteria** | 1. Implement full typed repository functions with strict `institutionId` isolation on every query.<br>2. Support atomic transactions for payment recording (allocating transaction, updating installment balance, logging GL journal, generating receipt record).<br>3. Comprehensive unit tests covering CRUD lifecycle, filtering, pagination, and multi-tenant boundary checks. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/db/fee-store.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 2 — Fee Structure, Component & Installment Scheduling Engine

#### FEE-003 — Dynamic Fee Structure & Component Hierarchy Engine
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-003 |
| **Phase** | Phase 2 — Fee Structure, Component & Installment Scheduling Engine |
| **Description** | Build the core fee structure engine (`src/lib/operations/finance/fee-structure-engine.ts`) capable of defining and resolving complex hierarchical fee templates by academic program, grade, term, quota (Merit, Management, NRI), and residential type (Day Scholar, Boarder). |
| **Files** | `src/lib/operations/finance/fee-structure-engine.ts` [NEW] · `src/lib/operations/finance/types.ts` [NEW] · `src/lib/__tests__/finance/fee-structure-engine.test.ts` [NEW] |
| **Dependencies** | FEE-002 |
| **Acceptance Criteria** | 1. Support modular fee components: Tuition, Admission, Boarding, Transport, Laboratory, Library, Examination, and Extracurricular.<br>2. Support mandatory vs. optional component flags, tax rate inclusions (GST/VAT), and refundability rules.<br>3. Validate that student fee allocation resolves accurate fee totals based on student academic profiles with zero precision drift. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/fee-structure-engine.test.ts`. |
| **Estimated Complexity** | Medium |

#### FEE-004 — Flexible Installment Schedule & Late Fine Calculation Engine
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-004 |
| **Phase** | Phase 2 — Fee Structure, Component & Installment Scheduling Engine |
| **Description** | Implement the installment generation and fine calculator (`src/lib/operations/finance/installment-fine-engine.ts`) supporting lump-sum, semesterly, quarterly, and custom installment matrices with configurable grace periods and automated late fine calculation policies. |
| **Files** | `src/lib/operations/finance/installment-fine-engine.ts` [NEW] · `src/lib/__tests__/finance/installment-fine-engine.test.ts` [NEW] |
| **Dependencies** | FEE-003 |
| **Acceptance Criteria** | 1. Generate installment payment plans with precise due dates, percentage splits, and minimum thresholds.<br>2. Calculate dynamic late fees based on configurable rules: Daily Flat Rate, Compounding Percentage, or Stepped Slab Fines.<br>3. Support administrative fine waiver overrides with required authorization reason logging. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/installment-fine-engine.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 3 — Multi-Gateway Payment Abstraction & Security Layer

#### FEE-005 — Unified Payment Gateway Adapter Framework & Routing
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-005 |
| **Phase** | Phase 3 — Multi-Gateway Payment Abstraction & Security Layer |
| **Description** | Create the unified payment gateway abstraction layer (`src/lib/operations/finance/gateways/gateway-adapter-factory.ts`) with pluggable adapters for Razorpay, Stripe, UPI Direct (Dynamic QR / Intent), and Net Banking. |
| **Files** | `src/lib/operations/finance/gateways/gateway-adapter.ts` [NEW] · `src/lib/operations/finance/gateways/razorpay-adapter.ts` [NEW] · `src/lib/operations/finance/gateways/stripe-adapter.ts` [NEW] · `src/lib/operations/finance/gateways/upi-adapter.ts` [NEW] · `src/lib/operations/finance/gateways/gateway-adapter-factory.ts` [NEW] · `src/lib/__tests__/finance/gateway-adapters.test.ts` [NEW] |
| **Dependencies** | FEE-002, FEE-003 |
| **Acceptance Criteria** | 1. Implement standardized interface: `createOrder()`, `verifySignature()`, `fetchPayment()`, `initiateRefund()`, and `handleWebhook()`.<br>2. Implement dynamic gateway routing based on currency, payment method, transaction size, and health status with automatic failover.<br>3. Mock and verify all adapters with standard sandbox response fixtures ensuring 100% test coverage. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/gateway-adapters.test.ts`. |
| **Estimated Complexity** | High |

#### FEE-006 — Idempotent Webhook Consumer & Dead-Letter Queue (DLQ) Engine
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-006 |
| **Phase** | Phase 3 — Multi-Gateway Payment Abstraction & Security Layer |
| **Description** | Implement the resilient webhook processing pipeline (`src/lib/operations/finance/gateways/webhook-processor.ts`) featuring cryptographic signature validation, SHA-256 idempotency key deduplication, distributed lock handling, dead-letter queue (DLQ) buffering, and automated replay. |
| **Files** | `src/lib/operations/finance/gateways/webhook-processor.ts` [NEW] · `src/lib/operations/finance/gateways/dlq-manager.ts` [NEW] · `src/lib/__tests__/finance/webhook-processor.test.ts` [NEW] |
| **Dependencies** | FEE-005 |
| **Acceptance Criteria** | 1. Strict verification of webhook HMAC-SHA256 signatures for Razorpay and Stripe before payload inspection.<br>2. Idempotent execution preventing duplicate ledger postings even under high-concurrency burst webhook deliveries.<br>3. Failed/unrecognized events stored in DLQ table with automated exponential retry and manual replay command. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/webhook-processor.test.ts`. |
| **Estimated Complexity** | High |

#### FEE-007 — Payment Security, PCI-DSS Tokenization & Key Management
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-007 |
| **Phase** | Phase 3 — Multi-Gateway Payment Abstraction & Security Layer |
| **Description** | Implement the payment security and tokenization module (`src/lib/operations/finance/security/payment-crypto.ts`) ensuring zero storage of raw credit card/CVV data, secure merchant credential encryption at rest, and audit logging of all sensitive gateway interactions. |
| **Files** | `src/lib/operations/finance/security/payment-crypto.ts` [NEW] · `src/lib/__tests__/finance/payment-crypto.test.ts` [NEW] |
| **Dependencies** | FEE-005 |
| **Acceptance Criteria** | 1. Encrypt gateway client secrets and private webhook secrets using AES-256-GCM with environment-derived keys.<br>2. Verify that all client card handling utilizes tokenized client-side checkout scripts (SAQ A compliance).<br>3. Unit tests verify encryption/decryption integrity, tamper detection, and zero PII leakage. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/payment-crypto.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 4 — Automated Double-Entry General Ledger Posting & Financial Reconciliation

#### FEE-008 — Double-Entry General Ledger (GL) Posting Engine
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-008 |
| **Phase** | Phase 4 — Automated Double-Entry General Ledger Posting & Financial Reconciliation |
| **Description** | Implement the automated double-entry GL journal posting engine (`src/lib/operations/finance/gl/fee-gl-engine.ts`) mapping fee transactions, concessions, penalties, write-offs, and refunds to balanced debit/credit journal entries in the institutional chart of accounts. |
| **Files** | `src/lib/operations/finance/gl/fee-gl-engine.ts` [NEW] · `src/lib/operations/finance/gl/account-mapping.ts` [NEW] · `src/lib/__tests__/finance/fee-gl-engine.test.ts` [NEW] |
| **Dependencies** | FEE-002, FEE-004 |
| **Acceptance Criteria** | 1. Enforce mathematical invariant $\sum \text{Debits} \equiv \sum \text{Credits}$ on every generated journal entry.<br>2. Automatic mapping to standard GL accounts: `GL:1100-BANK_CASH`, `GL:1200-FEE_RECEIVABLE`, `GL:4100-TUITION_REVENUE`, `GL:4200-HOSTEL_REVENUE`, `GL:4300-TRANSPORT_REVENUE`, `GL:5100-SCHOLARSHIP_EXPENSE`, `GL:4900-LATE_FINE_INCOME`, and `GL:2300-UNALLOCATED_SUSPENSE`.<br>3. Unit tests verify journal generation across partial payments, multi-component allocations, and refund scenarios. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/fee-gl-engine.test.ts`. |
| **Estimated Complexity** | High |

#### FEE-009 — Bank Statement Settlement & Discrepancy Reconciliation Mesh
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-009 |
| **Phase** | Phase 4 — Automated Double-Entry General Ledger Posting & Financial Reconciliation |
| **Description** | Build the automated bank statement and gateway payout reconciliation engine (`src/lib/operations/finance/reconciliation/reconciliation-engine.ts`) capable of parsing bank feeds (CSV, MT940, CAMT.053) and matching transaction IDs, amounts, and settlement dates against recorded payments. |
| **Files** | `src/lib/operations/finance/reconciliation/reconciliation-engine.ts` [NEW] · `src/lib/operations/finance/reconciliation/statement-parser.ts` [NEW] · `src/lib/__tests__/finance/reconciliation-engine.test.ts` [NEW] |
| **Dependencies** | FEE-008 |
| **Acceptance Criteria** | 1. Parse standard bank statement formats and gateway settlement reports.<br>2. Execute automated 3-way matching algorithm (Payment Record $\leftrightarrow$ Gateway Payout $\leftrightarrow$ Bank Statement Credit).<br>3. Automatically flag unmatched transactions, fee deductions, chargebacks, and timing differences into a reconciliation review batch. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/reconciliation-engine.test.ts`. |
| **Estimated Complexity** | High |

---

### Phase 5 — Dynamic Fee Receipt Generation & Cash Counter Operations

#### FEE-010 — Dynamic Cryptographic PDF Fee Receipt Generator
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-010 |
| **Phase** | Phase 5 — Dynamic Fee Receipt Generation & Cash Counter Operations |
| **Description** | Build the cryptographically verified PDF fee receipt generator (`src/lib/operations/finance/receipts/receipt-generator.ts`) integrating with DOC-GEN (Sprint-056), featuring institutional branding, fee breakdown tables, payment transaction hashes, Merkle roots, and verification QR vectors. |
| **Files** | `src/lib/operations/finance/receipts/receipt-generator.ts` [NEW] · `src/lib/operations/finance/receipts/receipt-template.ts` [NEW] · `src/lib/__tests__/finance/receipt-generator.test.ts` [NEW] |
| **Dependencies** | FEE-002, FEE-008 |
| **Acceptance Criteria** | 1. Generate compliant A4/thermal printable receipt layouts with custom institutional crest, student roll number, component breakdowns, paid amount in words, and balance due.<br>2. Compute HMAC-SHA256 digital signature and embed vector SVG QR code linking to public verification endpoint `/verify/receipt/[receiptHash]`.<br>3. Generation latency $< 150$ms per receipt; verified with automated unit tests. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/receipt-generator.test.ts`. |
| **Estimated Complexity** | Medium |

#### FEE-011 — Campus Counter Cash Register & Shift Handover Reconciliation
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-011 |
| **Phase** | Phase 5 — Dynamic Fee Receipt Generation & Cash Counter Operations |
| **Description** | Implement the physical cashier counter management module (`src/lib/operations/finance/counter/counter-register-engine.ts`) providing shift opening float declaration, offline/online cash/card/cheque collection, mid-shift cash drops, and blind end-of-shift supervisor reconciliation. |
| **Files** | `src/lib/operations/finance/counter/counter-register-engine.ts` [NEW] · `src/lib/__tests__/finance/counter-register-engine.test.ts` [NEW] |
| **Dependencies** | FEE-002, FEE-008, FEE-010 |
| **Acceptance Criteria** | 1. Support cashier shift lifecycle: `OPEN_SHIFT`, `RECORD_PAYMENT`, `CASH_DROP`, `CLOSE_SHIFT`, and `SUPERVISOR_APPROVE`.<br>2. Perform automatic variance calculation between system recorded collections and physical currency denomination counts.<br>3. Enforce supervisor PIN authorization for shift variance reconciliation and cash drawer lock. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/counter-register-engine.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 6 — Scholarship, Concession & Financial Aid Approval Engine

#### FEE-012 — Scholarship Rules, Need-Based Aid & Concession Calculation
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-012 |
| **Phase** | Phase 6 — Scholarship, Concession & Financial Aid Approval Engine |
| **Description** | Build the institutional scholarship and concession calculation engine (`src/lib/operations/finance/scholarships/scholarship-engine.ts`) supporting merit scholarships, economic need grants, staff ward discounts, sibling concessions, and sports quota waivers. |
| **Files** | `src/lib/operations/finance/scholarships/scholarship-engine.ts` [NEW] · `src/lib/__tests__/finance/scholarship-engine.test.ts` [NEW] |
| **Dependencies** | FEE-003, FEE-004 |
| **Acceptance Criteria** | 1. Calculate concessions as fixed amounts or percentage discounts targeted to specific fee components (e.g. 50% tuition waiver).<br>2. Validate scholarship allocation against configured institutional budget ceilings preventing over-allocation.<br>3. Automatically recompute installment balances upon scholarship approval. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/scholarship-engine.test.ts`. |
| **Estimated Complexity** | Medium |

#### FEE-013 — Multi-Tier Financial Aid Approval Workflow & Audit Trail
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-013 |
| **Phase** | Phase 6 — Scholarship, Concession & Financial Aid Approval Engine |
| **Description** | Implement the governance approval workflow engine (`src/lib/operations/finance/scholarships/scholarship-approval-workflow.ts`) enforcing multi-tier authorization (HOD $\to$ Principal $\to$ Financial Trustee) with supporting document verification and Merkle audit tracking. |
| **Files** | `src/lib/operations/finance/scholarships/scholarship-approval-workflow.ts` [NEW] · `src/lib/__tests__/finance/scholarship-approval-workflow.test.ts` [NEW] |
| **Dependencies** | FEE-012 |
| **Acceptance Criteria** | 1. Configurable approval thresholds based on concession amount or percentage.<br>2. Role-based approval actions (`SUBMIT`, `REVIEW`, `APPROVE`, `REJECT`, `REQUEST_INFO`) with mandatory decision notes.<br>3. Immutable audit trail generated for every state transition with actor ID and cryptographic timestamp. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/scholarship-approval-workflow.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 7 — Aging Accounts Receivable & Defaulter Recovery Workflows

#### FEE-014 — Aging Accounts Receivable (30/60/90 Days) Analytics Engine
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-014 |
| **Phase** | Phase 7 — Aging Accounts Receivable & Defaulter Recovery Workflows |
| **Description** | Create the aging accounts receivable analytics engine (`src/lib/operations/finance/aging/aging-analytics-engine.ts`) computing real-time dues aging across 5 standardized buckets: Current (Not Due), 1–30 Days, 31–60 Days, 61–90 Days, and 90+ Days (Critical Default). |
| **Files** | `src/lib/operations/finance/aging/aging-analytics-engine.ts` [NEW] · `src/lib/__tests__/finance/aging-analytics-engine.test.ts` [NEW] |
| **Dependencies** | FEE-002, FEE-004 |
| **Acceptance Criteria** | 1. Calculate aggregated aging metrics across individual students, departments, programs, and campus-wide cohorts.<br>2. Compute student financial risk scores ($0–100$) based on historical payment timeliness and current overdue balance.<br>3. Support automated academic restriction flagging (e.g. blocking hall ticket download or grade transcript generation for $60+$ day defaulters). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/aging-analytics-engine.test.ts`. |
| **Estimated Complexity** | Medium |

#### FEE-015 — Multi-Channel Automated Reminder & Defaulter Outreach Engine
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-015 |
| **Phase** | Phase 7 — Aging Accounts Receivable & Defaulter Recovery Workflows |
| **Description** | Build the automated reminder and recovery outreach dispatcher (`src/lib/operations/finance/aging/defaulter-outreach-engine.ts`) integrating with EngageOS to dispatch dynamic payment links via WhatsApp, SMS, and Email according to configurable escalation schedules. |
| **Files** | `src/lib/operations/finance/aging/defaulter-outreach-engine.ts` [NEW] · `src/lib/__tests__/finance/defaulter-outreach-engine.test.ts` [NEW] |
| **Dependencies** | FEE-014 |
| **Acceptance Criteria** | 1. Configurable reminder schedules: $T-7$ days (Upcoming Due), $T-0$ (Due Today), $T+7$ (Grace Expired), $T+30$ (Warning), $T+60$ (Final Demand Notice).<br>2. Generate dynamic, one-click payment deep links embedded in WhatsApp/SMS message templates.<br>3. Log all outreach dispatches and delivery status in `fee_defaulter_logs`. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/defaulter-outreach-engine.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 8 — RBAC-Protected REST API Suite & Real-Time SSE Telemetry

#### FEE-016 — REST API Route Suite for Fee Operations & Public Verifier
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-016 |
| **Phase** | Phase 8 — RBAC-Protected REST API Suite & Real-Time SSE Telemetry |
| **Description** | Implement 10 RBAC-protected API route handlers (`src/app/api/finance/fees/*`) and public receipt verification endpoint (`/api/finance/verify/receipt/[hash]`) with strict Zod validation schemas and `requireAuth` guards. |
| **Files** | `src/app/api/finance/fees/structures/route.ts` [NEW] · `src/app/api/finance/fees/allocations/route.ts` [NEW] · `src/app/api/finance/fees/checkout/route.ts` [NEW] · `src/app/api/finance/fees/webhooks/route.ts` [NEW] · `src/app/api/finance/fees/receipts/route.ts` [NEW] · `src/app/api/finance/fees/counter/route.ts` [NEW] · `src/app/api/finance/fees/scholarships/route.ts` [NEW] · `src/app/api/finance/fees/aging/route.ts` [NEW] · `src/app/api/finance/fees/reconcile/route.ts` [NEW] · `src/app/api/finance/fees/verify/[hash]/route.ts` [NEW] · `src/lib/validation/fee-schemas.ts` [NEW] · `src/lib/__tests__/api/fee-routes.test.ts` [NEW] |
| **Dependencies** | FEE-003, FEE-005, FEE-006, FEE-008, FEE-010, FEE-011, FEE-013, FEE-014 |
| **Acceptance Criteria** | 1. All routes wrapped in `requireAuth` with granular permissions (`finance:fees:manage`, `finance:fees:collect`, `finance:fees:view`, `finance:scholarships:approve`, `finance:reconciliation:manage`).<br>2. Public verification endpoint sanitized with strict PII masking (student initials and obfuscated IDs only).<br>3. 100% route coverage verified by Gateway AST Scanner (`pnpm gateway:scan`). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/api/fee-routes.test.ts` and `pnpm gateway:scan`. |
| **Estimated Complexity** | High |

#### FEE-017 — Real-Time Financial Telemetry Stream (SSE) & Prometheus OpenMetrics
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-017 |
| **Phase** | Phase 8 — RBAC-Protected REST API Suite & Real-Time SSE Telemetry |
| **Description** | Implement the real-time financial telemetry SSE stream handler (`src/app/api/finance/fees/stream/route.ts`) and 8 Prometheus OpenMetrics telemetry series (`src/lib/operations/finance/telemetry/fee-metrics.ts`). |
| **Files** | `src/app/api/finance/fees/stream/route.ts` [NEW] · `src/lib/operations/finance/telemetry/fee-metrics.ts` [NEW] · `src/lib/__tests__/finance/fee-telemetry.test.ts` [NEW] |
| **Dependencies** | FEE-016 |
| **Acceptance Criteria** | 1. SSE stream pushes live payment events, shift status changes, and webhook alerts to connected admin clients.<br>2. Export 8 standard OpenMetrics series: `thaiba_fee_collections_total`, `thaiba_fee_amount_collected_cents`, `thaiba_fee_gateway_latency_seconds`, `thaiba_fee_webhook_success_rate`, `thaiba_fee_aging_overdue_total`, `thaiba_fee_counter_variance_cents`, `thaiba_fee_scholarship_disbursed_cents`, and `thaiba_fee_dlq_pending_events`.<br>3. Unit tests verify stream heartbeats, channel broadcasting, and metric counters. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/fee-telemetry.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 9 — Web User Interfaces — Admin Finance Cockpit & Parent Portal

#### FEE-018 — Admin Finance Command Cockpit (`/admin/finance/fee-hub`)
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-018 |
| **Phase** | Phase 9 — Web User Interfaces — Admin Finance Cockpit & Parent Portal |
| **Description** | Develop the comprehensive 5-tab Next.js 16 administrative cockpit (`src/app/(shell)/admin/finance/fee-hub/page.tsx` and subcomponents) providing full command and control over fee structures, transactions, cashier registers, aging accounts, and reconciliation. |
| **Files** | `src/app/(shell)/admin/finance/fee-hub/page.tsx` [NEW] · `src/components/operations/finance/fee-structure-tab.tsx` [NEW] · `src/components/operations/finance/collection-ledger-tab.tsx` [NEW] · `src/components/operations/finance/counter-register-tab.tsx` [NEW] · `src/components/operations/finance/aging-defaulter-tab.tsx` [NEW] · `src/components/operations/finance/reconciliation-studio-tab.tsx` [NEW] · `src/lib/hooks/use-fee-hub.ts` [NEW] |
| **Dependencies** | FEE-016, FEE-017 |
| **Acceptance Criteria** | 1. Multi-tab responsive layout matching ThaibaHive Design System standards using Radix UI primitives and Tailwind CSS.<br>2. Interactive fee schedule builder with component breakdown, installment preview, and batch student assignment.<br>3. Live telemetry widget showing today's collection volume, payment method breakdown chart, counter drawer statuses, and overdue aging summaries.<br>4. Zero unhandled promise rejections or stuck loading spinners. |
| **Verification Method** | Run `pnpm lint` and verify component rendering in test harness. |
| **Estimated Complexity** | High |

#### FEE-019 — Student & Parent Self-Service Fee Payment Portal (`/portal/fees`)
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-019 |
| **Phase** | Phase 9 — Web User Interfaces — Admin Finance Cockpit & Parent Portal |
| **Description** | Build the student and parent self-service fee portal (`src/app/(shell)/portal/fees/page.tsx`) providing an intuitive, transparent interface to view pending dues, select installment plans, apply approved scholarships, initiate multi-gateway payments, and download cryptographically signed receipts. |
| **Files** | `src/app/(shell)/portal/fees/page.tsx` [NEW] · `src/components/operations/finance/parent-fee-card.tsx` [NEW] · `src/components/operations/finance/checkout-modal.tsx` [NEW] · `src/components/operations/finance/payment-history-table.tsx` [NEW] · `src/lib/hooks/use-parent-fees.ts` [NEW] |
| **Dependencies** | FEE-016, FEE-010 |
| **Acceptance Criteria** | 1. Clean, mobile-responsive layout showing outstanding fee breakdown, upcoming due dates, and paid installments.<br>2. Embedded checkout modal with gateway selection (Razorpay, Stripe, UPI QR, Net Banking) and instant payment status polling.<br>3. One-click PDF receipt download button fetching cryptographically signed document from DOC-GEN. |
| **Verification Method** | Run `pnpm lint` and test portal interactions. |
| **Estimated Complexity** | Medium |

---

### Phase 10 — Mobile Application — Flutter Payment Hub & Offline Sync

#### FEE-020 — Flutter Mobile Fee Payment & Receipt Module (Riverpod)
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-020 |
| **Phase** | Phase 10 — Mobile Application — Flutter Payment Hub & Offline Sync |
| **Description** | Implement the Flutter mobile fee module (`mobile/lib/features/fee_payment/`) with Riverpod state management, displaying fee schedules, due date badges, payment history, and integrated UPI deep linking (GPay, PhonePe, Paytm). |
| **Files** | `mobile/lib/features/fee_payment/models/fee_models.dart` [NEW] · `mobile/lib/features/fee_payment/providers/fee_providers.dart` [NEW] · `mobile/lib/features/fee_payment/screens/fee_dashboard_screen.dart` [NEW] · `mobile/lib/features/fee_payment/screens/fee_checkout_screen.dart` [NEW] · `mobile/lib/features/fee_payment/widgets/fee_installment_card.dart` [NEW] · `mobile/lib/app/router.dart` [MODIFY] |
| **Dependencies** | FEE-016 |
| **Acceptance Criteria** | 1. Riverpod providers managing fee state, installment selection, and active payment sessions.<br>2. Native UPI intent invocation generating valid `upi://pay` transaction strings with verified checksums.<br>3. Route protection integrated into `router.dart` with `_authGuard` middleware. |
| **Verification Method** | Run `flutter analyze` in `mobile/`. |
| **Estimated Complexity** | Medium |

#### FEE-021 — Mobile Offline Receipt Storage & Push Notification Handlers
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-021 |
| **Phase** | Phase 10 — Mobile Application — Flutter Payment Hub & Offline Sync |
| **Description** | Build mobile offline receipt vault and push notification handler (`mobile/lib/features/fee_payment/services/fee_offline_storage.dart`) enabling parents to store cryptographically verified PDF receipts locally in secure device storage and receive automated fee reminder push alerts. |
| **Files** | `mobile/lib/features/fee_payment/services/fee_offline_storage.dart` [NEW] · `mobile/lib/features/fee_payment/screens/receipt_viewer_screen.dart` [NEW] · `mobile/lib/features/fee_payment/services/fee_push_handler.dart` [NEW] |
| **Dependencies** | FEE-020 |
| **Acceptance Criteria** | 1. Cache downloaded PDF receipts locally with SHA-256 integrity verification.<br>2. Native PDF viewer screen with pinch-to-zoom, system share sheet, and verification badge display.<br>3. Handle foreground and background push notification payloads routing directly to checkout or receipt screens. |
| **Verification Method** | Run `flutter analyze` in `mobile/`. |
| **Estimated Complexity** | Medium |

---

### Phase 11 — End-to-End Simulation Harness & Quality Verification

#### FEE-022 — End-to-End Simulation CLI Harness (`pnpm fee:simulate`)
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-022 |
| **Phase** | Phase 11 — End-to-End Simulation Harness & Quality Verification |
| **Description** | Build the comprehensive 8-stage automated simulation CLI harness (`scripts/simulate-fee-operations.ts`) testing the complete institutional fee collection and financial lifecycle from configuration through bank reconciliation. |
| **Files** | `scripts/simulate-fee-operations.ts` [NEW] · `package.json` [MODIFY] |
| **Dependencies** | FEE-003, FEE-005, FEE-006, FEE-008, FEE-009, FEE-010, FEE-011, FEE-014 |
| **Acceptance Criteria** | 1. Execute 8 sequential simulation stages:<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 1**: Multi-Campus Fee Structure & Component Hierarchy Compilation.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 2**: Student Installment Matrix Allocation & Proration.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 3**: Scholarship Rule Matching & Multi-Tier Approval Workflow.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 4**: Multi-Gateway Online Checkout & Webhook Ingress with DLQ Idempotency.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 5**: Double-Entry General Ledger (GL) Balanced Journal Posting.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 6**: Cryptographic PDF Fee Receipt Generation & Public QR Verification.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 7**: Cashier Counter Shift Float, POS Collection & Blind Handover Reconciliation.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 8**: Aging Accounts Receivable (30/60/90 Days) & Bank Statement Matching.<br>2. Registered under npm scripts as `pnpm fee:simulate`.<br>3. 100% exit code 0 success across all 8 stages. |
| **Verification Method** | Run `pnpm fee:simulate`. |
| **Estimated Complexity** | High |

#### FEE-023 — Financial Governance, Tenancy Isolation & Security Audit Test Suite
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-023 |
| **Phase** | Phase 11 — End-to-End Simulation Harness & Quality Verification |
| **Description** | Implement comprehensive security and financial audit test suites (`src/lib/__tests__/finance/fee-security-governance.test.ts`) validating tenant boundary isolation, cryptographic Merkle audit integrity, and zero cross-campus financial leakage. |
| **Files** | `src/lib/__tests__/finance/fee-security-governance.test.ts` [NEW] |
| **Dependencies** | FEE-016, FEE-022 |
| **Acceptance Criteria** | 1. Assert zero cross-tenant financial query leakage between distinct campus institution IDs.<br>2. Verify Merkle tree consistency across all generated fee payment audit logs via `pnpm compliance:verify`.<br>3. Validate that tampering with payment amount or receipt hash immediately triggers cryptographic verification failure. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/finance/fee-security-governance.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 12 — Standard Operating Procedures & Engineering Runbooks

#### FEE-024 — Financial Operations & Gateway Runbooks
| Field | Specification Details |
|---|---|
| **Task ID** | FEE-024 |
| **Phase** | Phase 12 — Standard Operating Procedures & Engineering Runbooks |
| **Description** | Author 5 comprehensive operational guides and standard operating procedures (SOPs) in `docs/operations/` detailing fee setup, gateway credential rotation, cashier shift handling, defaulter recovery, and bank reconciliation. |
| **Files** | `docs/operations/fee-structure-setup-guide.md` [NEW] · `docs/operations/payment-gateway-integration-guide.md` [NEW] · `docs/operations/cashier-shift-reconciliation-runbook.md` [NEW] · `docs/operations/defaulter-recovery-and-aging-guide.md` [NEW] · `docs/operations/bank-statement-reconciliation-runbook.md` [NEW] |
| **Dependencies** | FEE-018, FEE-022 |
| **Acceptance Criteria** | 1. Step-by-step guides covering full operational procedures, troubleshooting steps, and failover workflows.<br>2. Clear operational diagrams, API references, and error resolution matrices.<br>3. Validated for accuracy against the implemented system. |
| **Verification Method** | Review documentation files for completeness and technical accuracy. |
| **Estimated Complexity** | Low |

---

## 5. Cross-Cutting Engineering Standards

### Dual-Store Persistence Parity
- Every schema modification MUST be applied simultaneously and identically to both SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`).
- Column definitions, data types, nullability constraints, foreign keys, and indexes MUST match 100%.
- Verified via automated unit test `src/lib/__tests__/db/fee-schema-parity.test.ts`.

### Double-Entry Accounting Invariant
- Every financial event MUST produce balanced general ledger journal lines:
  $$\sum \text{Debit Amounts} - \sum \text{Credit Amounts} = 0$$
- No unallocated or single-entry transaction may be committed to the database without a corresponding balancing ledger entry.

### Role-Based Access Control (RBAC)
- All financial endpoints MUST be shielded by `requireAuth` wrapper with explicit permission strings.
- Enforce least-privilege role matrix:
  - `super_admin`: Full platform financial access and cross-campus consolidated ledger view (`*`).
  - `admin` / `finance_director`: Institution-wide fee configuration, reconciliation, and scholarship approval.
  - `accountant` / `cashier`: Fee collection, counter shift management, and receipt issuance.
  - `principal` / `hod`: Departmental fee oversight, scholarship submission, and defaulter tracking.
  - `parent` / `student`: Read-only access to own dues, payment checkout, and receipt download.

### Cryptographic Merkle Audit Trail
- All financial state mutations (fee adjustments, payments, concessions, shift closes, refunds) MUST emit a SHA-256 Merkle audit event into `fee_audit_logs`.
- Compliance verification script `pnpm compliance:verify` MUST execute and pass without broken chain links.

### Performance & Latency Targets
- Webhook Ingress Processing Latency: $< 100$ms (idempotent ACK returned immediately).
- Dynamic PDF Receipt Compilation: $< 150$ms per receipt document.
- Online Checkout Order Creation: $< 200$ms roundtrip.
- Aging Analytics Cohort Calculation: $< 500$ms for 5,000 students.

---

## 6. Risk Register & Mitigation Strategy

### Technical & Architectural Risks

| # | Risk Description | Severity | Impact | Mitigation Strategy |
|---|---|---|---|---|
| 1 | **Third-Party Payment Gateway Webhook Delivery Failure**: Network partitions, upstream gateway timeouts, or load spikes could drop webhook delivery. | High | Delayed payment confirmation and ledger reconciliation. | Implement transactional idempotency keys, background polling reconciliation worker, and dead-letter queue (DLQ) with automated exponential backoff retries. |
| 2 | **Concurrent Double-Payment Race Conditions**: Parents initiating simultaneous payments across multiple browser tabs or apps for the same installment. | High | Duplicate credit charges and accounting reconciliation disputes. | Utilize distributed database row locks and atomic balance deduction checks inside a single transaction during checkout order initiation. |
| 3 | **PCI-DSS Compliance & Card Data Leakage**: Inadvertent logging of raw credit card numbers, CVVs, or bank authorization tokens in logs or database. | Critical | Severe compliance violation, legal liability, and gateway suspension. | Enforce client-side tokenization (Razorpay/Stripe Elements); enforce strict regex filters masking card/CVV patterns in all logging interceptors. |
| 4 | **Floating Point Currency Rounding Drift**: Cumulative precision drift in fee installment splits, discounts, and late fee percentage calculations. | High | Unbalanced GL ledgers and fractional cent discrepancies. | Enforce integer-based micro-currency units (cents/paise) for all internal storage and computation; format decimals only at presentation layer. |
| 5 | **Cash Counter Drawer Shift Discrepancies**: Cashiers closing shifts with unaccounted cash deficits or surpluses due to manual counting errors. | Medium | Financial shrinkage and delayed shift handover. | Implement mandatory blind double-entry denomination counting with supervisor threshold overrides and immutable discrepancy journal entries. |

---

### Business & Operational Risks

| # | Risk Description | Severity | Impact | Mitigation Strategy |
|---|---|---|---|---|
| 1 | **Parent Payment Friction on Low-Bandwidth Networks**: Mobile payment dropouts during end-of-term fee rush hours in rural campus areas. | Medium | Abandoned transactions and parent frustration. | Provide lightweight UPI dynamic QR codes, offline receipt storage, and automated SMS fallback with direct pay links. |
| 2 | **Unauthorized Fee Concessions & Waivers**: Staff issuing discretionary fee waivers without appropriate governance approvals. | High | Revenue loss and audit non-compliance. | Enforce multi-tier digital approval workflows with role-based limits and immutable cryptographic audit logging. |
| 3 | **Bank Statement Reconciliation Lag**: Commercial banks providing statement feeds with non-standard reference formats or 48-hour delays. | Medium | Delayed recognition of direct bank wire transfers. | Build intelligent fuzzy matching on student roll number / admission ID and provide manual reconciliation override interface. |

---

## 7. Rollback & Disaster Recovery Procedures

### Rollback Strategy Overview
Sprint-057 introduces non-breaking additive schema tables and modular micro-services. In the event of an unforeseen production regression, the financial subsystem can be rolled back safely without disrupting core student management, auth, examination, or previous platform features.

### Rollback Execution Steps

```bash
# Step 1: Disable FEE-HIVE Subsystem via Environment Feature Flags (< 30 seconds)
FEE_HIVE_ENABLED=false
FEE_GATEWAY_ROUTING_ENABLED=false
FEE_WEBHOOK_INGRESS_ENABLED=false
FEE_COUNTER_REGISTER_ENABLED=false
FEE_AGING_NOTIFICATIONS_ENABLED=false

# Step 2: Enable Fallback Offline Manual Mode (< 30 seconds)
FEE_OFFLINE_COUNTER_FALLBACK=true

# Step 3: Revert Source Code & Clean Build (< 5 minutes)
git revert --no-edit HEAD
pnpm build

# Step 4: Verification of Restored Baseline
pnpm typecheck
pnpm test
pnpm compliance:verify
```

---

## 8. Definition of Done

A Sprint-057 task is considered **COMPLETE** when all of the following quality gates are satisfied:

### Code Quality & Standards
- [ ] `pnpm typecheck` (`tsc --noEmit`) passes with 0 TypeScript errors across `src/`, `packages/auth`, and `packages/db`.
- [ ] `pnpm lint` passes with 0 errors and 0 new warnings.
- [ ] `flutter analyze` passes with 0 errors and 0 warnings in `mobile/`.
- [ ] Zero `console.log` statements in production source code (`src/`, `packages/`, `mobile/`).
- [ ] No hardcoded gateway API secrets, private keys, or bypassed authorization checks.
- [ ] Complete TypeScript interfaces and JSDoc documentation on all exported types, functions, and classes.

### Testing & Verification
- [ ] Unit tests authored for every new module with $\ge 85\%$ code coverage.
- [ ] Full platform test suite passes: `pnpm test` $\to$ 100% pass rate across all test suites (including new FEE-HIVE test suites).
- [ ] `pnpm gateway:scan --strict --json` $\to$ 100% route coverage verified with 0 unshielded endpoints.
- [ ] `pnpm compliance:scan` $\to$ 100% compliance audit coverage across all financial mutation routes.
- [ ] `pnpm compliance:verify` $\to$ Cryptographic Merkle audit chain verified intact.
- [ ] `pnpm security:tenants` $\to$ 0 cross-tenant isolation leaks across all financial queries.
- [ ] `fee-schema-parity.test.ts` $\to$ 100% schema parity confirmed between SQLite and PostgreSQL.
- [ ] `pnpm fee:simulate` $\to$ All 8 simulation scenarios pass with 100% success.
- [ ] Double-entry GL invariant ($\sum \text{Debits} \equiv \sum \text{Credits}$) verified across 100% of generated journal records.

### Security & RBAC
- [ ] All new FEE-HIVE API routes protected with `requireAuth` and granular financial permissions.
- [ ] Public verification route (`/api/finance/fees/verify/[hash]`) strictly sanitized with PII redaction.
- [ ] Webhook ingress validated with cryptographic HMAC signatures before processing.
- [ ] Strict row-level institution isolation verified across all queries.

### Documentation & Governance
- [ ] 5 operational runbooks created in `docs/operations/`.
- [ ] `.ai/FEATURES.md` updated with Sprint-057 features.
- [ ] `.ai/CHANGELOG.md` updated with v3.41.0 release notes.
- [ ] `.ai/PROJECT_STATUS.md` updated with Sprint-057 deliverables.
- [ ] `.ai/execution/Sprint-057-Execution-Log.md` initialized with all 24 tasks.

---

## 9. Sprint Metadata & Lifecycle

| Metadata Field | Value |
|---|---|
| **Sprint ID** | SPRINT-057 |
| **Sprint Name** | Centralized Fee Collection, Online Payment Gateway & Financial Reconciliation Mesh (FEE-HIVE / FinanceOS) |
| **Target Release Version** | v3.41.0 |
| **Total Implementation Tasks** | 24 (FEE-001 through FEE-024) |
| **Estimated Sprint Duration** | 10–14 engineering days |
| **Estimated Complexity** | Large |
| **Predecessor Sprint** | SPRINT-056 (v3.40.0 — Examination PDF Generator, Universal Multi-Format Export Engine & Mobile Academic Push Synchronization — DOC-GEN / ExportHub) |
| **Successor Artifact** | `.ai/execution/Sprint-057-Execution-Log.md` |
| **Release Certificate Artifact** | `.ai/releases/Release-Certificate-Sprint-057.md` |

---

*Engineering Contract authored by: Implementation Engineer (Antigravity)*  
*Date: 2026-08-27*  
*ThaibaHive Institution OS — Sprint-057 v3.41.0 Engineering Lifecycle*
