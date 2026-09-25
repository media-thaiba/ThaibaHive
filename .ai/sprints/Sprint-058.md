# Engineering Contract — Sprint-058

**Sprint ID:** SPRINT-058  
**Sprint Name:** Autonomous Alumni Network, Career Mentorship Mesh & Endowment Fund Management (ALUMNI-HUB / EndowmentOS)  
**Target Release Version:** v3.42.0  
**Contract Date:** 2026-08-27  
**Contract Status:** APPROVED — Ready for Implementation  
**Contract Author:** Implementation Engineer (Antigravity)  
**Source Recommendation:** `.ai/Sprint-058-Recommendation.md`  
**Review Status:** ✅ Reviewed and Aligned with AIOS Engineering Guide, Architecture Lead & Institutional Governance Standards  

---

## 1. Executive Summary

This engineering contract formalizes the implementation scope, system architecture, task decomposition, acceptance criteria, risk register, rollback procedures, and definition of done for **Sprint-058**. It governs all execution work by the Implementation Engineer until formal handoff to the Verification Engineer.

Following the successful delivery of Sprint-057 (FEE-HIVE / FinanceOS v3.41.0) and reaching 98% overall platform maturity across academic, examination, spatial, facility, supply chain, and security operations, ThaibaHive executes the final strategic operational subsystem: **ALUMNI-HUB / EndowmentOS** — an autonomous multi-campus alumni lifecycle network, AI-driven career mentorship mesh, institutional job board, regional chapter event manager, and endowment fund giving platform with automated 80G tax-exempt receipting.

$$\text{Comprehensive Institution OS} = \underbrace{\text{Academic Lifecycle}}_{\text{ADMISSION} \to \text{CAMPUS-OS} \to \text{DOC-GEN}} \times \underbrace{\text{Campus Quad}}_{\text{TWIN-OPS} \times \text{ECO-MESH} \times \text{VISION}} \times \underbrace{\text{Financial Engine}}_{\text{FEE-HIVE} \times \text{FINANCE-OS}} \times \underbrace{\text{ALUMNI-HUB / EndowmentOS}}_{\text{Sprint-058 Final Legacy Mesh}}$$

Sprint-058 establishes **ALUMNI-HUB / EndowmentOS** across all 23+ institutions of Thaiba Garden. It delivers:

1. **Dual-Store Alumni Management Persistence Layer (14 Tables)**: 100% schema parity across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`) for alumni profiles, education histories, career experiences, mentorship profiles, mentorship requests/sessions, job postings, job applications, donation campaigns, donations/endowments, regional chapters, chapter memberships, alumni events, event RSVPs, and alumni audit logs.
2. **Automated Student-to-Alumni Graduation Onboarding**: Real-time integration with `ACADEMIC-HIVE` to transition graduating cohorts into verified alumni profiles with digital degree credentials, batch year tagging, and customizable privacy consent options.
3. **AI-Powered Mentorship Matching Engine**: Multi-dimensional compatibility scoring algorithm evaluating career trajectory, industry sector, skill sets (integrating with `KM-COPILOT` Skill Graph), geographical proximity, and mentor availability to optimize student-alumni pairing with $< 5$s recommendation latency.
4. **Mentorship Session Lifecycle & Career Mesh**: Structured mentorship request workflows, 1-on-1 session scheduling, calendar integrations, feedback/rating loops, and impact metrics reporting.
5. **Alumni Job Board & Internship Placement Mesh**: Curated institutional career board enabling alumni and corporate partners to post jobs and internships, with role vetting, application tracking, resume parsing, and student placement analytics.
6. **Endowment Fund & Multi-Tier Donation Engine**: Comprehensive campaign management for infrastructure endowments, merit scholarships, research chairs, and general giving with recurring pledges, target progress tracking, and donor recognition tiers.
7. **FinanceOS & DOC-GEN Integration for 80G Tax-Exempt Receipting**: Seamless double-entry GL posting (`GL:BANK_CASH` $\leftrightarrow$ `GL:ENDOWMENT_REVENUE`) and automated generation of cryptographically signed PDF 80G tax exemption donation receipts with verification QR codes.
8. **Regional Chapter & Event Management System**: Federated chapter management for geographical or professional alumni chapters, chapter officer governance, reunion/networking event ticketing, and QR code attendee check-in.
9. **RBAC-Protected REST API Suite & Real-Time SSE Telemetry**: 12 new RBAC-shielded endpoints (`requireAuth`) with strict Zod validation schemas, paired with a Server-Sent Events (SSE) telemetry stream and 8 Prometheus OpenMetrics series.
10. **Admin Alumni Command Cockpit (`/admin/alumni/hub`)**: 5-tab Next.js 16 administrative studio: (1) Alumni Directory & Verification, (2) Mentorship Mesh & Pairing, (3) Job Board & Career Services, (4) Endowment & Donation Campaigns, and (5) Chapters & Events Studio.
11. **Alumni Self-Service & Student Mentorship Portal (`/portal/alumni`)**: Responsive web portal for alumni profile management, mentor availability settings, job posting/browsing, endowment giving checkout, and chapter event registrations.
12. **Flutter Mobile Alumni Hub (Riverpod)**: Native mobile module (`mobile/lib/features/alumni_hub/`) with Riverpod state management, digital alumni ID card, mentor discovery, offline event ticket vault, and push notification triggers.
13. **End-to-End Simulation CLI Harness (`pnpm alumni:simulate`)**: 8-stage automated simulation runner verifying graduation onboarding, profile verification, AI mentorship scoring, job application lifecycle, endowment donation with 80G receipting, chapter event RSVP/check-in, mobile synchronization, and career placement analytics.
14. **Standard Operating Procedures & Engineering Runbooks**: 4 comprehensive operational runbooks in `docs/operations/`.

---

## 2. Scope

### In Scope

| # | Domain | Detailed Description |
|---|---|---|
| 1 | **Dual-Store Persistence Layer (14 Tables)** | 14 new Drizzle ORM entities with 100% schema parity across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`): `alumni_profiles`, `alumni_educations`, `alumni_experiences`, `alumni_mentorship_profiles`, `alumni_mentorship_requests`, `alumni_mentorship_sessions`, `alumni_job_postings`, `alumni_job_applications`, `alumni_donation_campaigns`, `alumni_donations`, `alumni_chapters`, `alumni_chapter_members`, `alumni_events`, and `alumni_event_rsvps`. |
| 2 | **Automated Graduation Transition Engine** | Automatic conversion of student registry records to verified alumni profiles upon graduation, preserving academic transcripts, major/degree metadata, graduation honors, and issuing digital verifiable alumni credentials. |
| 3 | **AI-Powered Mentorship Matching Engine** | Algorithmic compatibility scoring engine analyzing career paths, industry sectors, skills (via `KM-COPILOT` Skill Graph), language preferences, and mentor capacity with support for manual matching overrides. |
| 4 | **Mentorship Session & Career Mesh** | End-to-end mentorship lifecycle management: mentor profile configuration, student request submissions, scheduling, session notes, dual-sided rating/feedback, and institutional mentorship hours tracking. |
| 5 | **Alumni Job Board & Application Tracking (ATS)** | Alumni-posted and partner-posted job/internship portal with admin vetting workflows, student direct applications, resume attachments, status tracking (Applied, Shortlisted, Interviewed, Offered, Hired), and placement analytics. |
| 6 | **Endowment & Donation Campaign Management** | Multi-campaign fundraising manager supporting recurring pledges, goal milestones, corporate matching gifts, donor anonymity flags, and donor recognition tiers (Bronze, Silver, Gold, Platinum, Trustee Circle). |
| 7 | **FinanceOS Integration & 80G Tax Receipting** | Real-time GL posting to FinanceOS double-entry ledger and DOC-GEN automated PDF compilation of HMAC-SHA256 cryptographically signed Section 80G tax-exempt donation receipts with verification QR codes. |
| 8 | **Regional Chapters & Event Coordination** | Federated alumni chapter administration by city/country/specialty, chapter leadership assignment, event ticketing, RSVP management, and dynamic QR code attendee check-in. |
| 9 | **RBAC-Protected REST API Suite** | 12 new RBAC-protected API route handlers (`src/app/api/alumni/*`) with strict Zod validation schemas, institution tenant isolation, and granular permission checks. |
| 10 | **Real-Time Telemetry & Prometheus OpenMetrics** | SSE telemetry stream for live mentorship requests, donation alerts, and event check-ins, accompanied by 8 Prometheus OpenMetrics series. |
| 11 | **Admin Alumni Command Cockpit (`/admin/alumni/hub`)** | Comprehensive 5-tab Next.js 16 admin cockpit: Directory & Verification, Mentorship Mesh, Job Board & Placement, Endowment Campaigns, and Chapters & Events. |
| 12 | **Alumni Self-Service & Student Portal (`/portal/alumni`)** | Frictionless portal for alumni and students with responsive UI, directory search, mentor booking, job board, donation checkout, and event ticketing. |
| 13 | **Flutter Mobile Alumni Hub (Riverpod)** | Native mobile module (`mobile/lib/features/alumni_hub/`) with Riverpod state management, offline digital alumni ID card, instant mentor booking, and push notifications. |
| 14 | **End-to-End Simulation CLI Harness (`pnpm alumni:simulate`)** | 8-stage automated simulation script verifying complete alumni operations from graduation transition to career placement analytics. |
| 15 | **Security Governance & Operational SOPs** | GDPR/FERPA alumni privacy consent enforcement, Merkle audit trail logging (`pnpm compliance:verify`), and 4 comprehensive engineering runbooks in `docs/operations/`. |

---

### Out of Scope

| Area | Justification |
|---|---|
| Direct Third-Party Social Media Scraping (e.g., LinkedIn Profile Auto-Sync Bot) | Automated headless scraping of LinkedIn or third-party professional networks violates platform terms of service. Alumni profile data will be maintained via user self-service updates and verified institution registry data. |
| Direct Bank Wire Host-to-Host (H2H) ISO 20022 Protocol Daemon | All online donation payments leverage the established multi-gateway layer from FinanceOS (Razorpay, Stripe, UPI); dedicated banking switch daemon is handled via standard payment gateway settlement feeds. |
| Native Video Conferencing Media Server (WebRTC SFU/MCU Node Cluster) | Mentorship sessions provide meeting link integration (Zoom, Google Meet, Microsoft Teams) and in-platform scheduling rather than embedding a heavyweight custom WebRTC media server cluster. |
| Legal Endowment Trust Deed Conveyancing & Land Registry Filing | Endowment management tracks fund allocations, restrictions, and financial accounting; legal deed registration for physical property donations is an external legal process. |
| Direct Background Check Private Investigation Integration | Job board vetting includes admin review and verified alumni employer credentials; third-party criminal background check API integrations are excluded. |

---

## 3. Technical Architecture & Component Interactions

```mermaid
flowchart TD
    subgraph Client Presentation Layer
        ADMIN_COCKPIT[Admin Alumni Cockpit\n/admin/alumni/hub]
        ALUMNI_PORTAL[Alumni & Student Portal\n/portal/alumni]
        MOBILE_HUB[Flutter Mobile Alumni Hub\nRiverpod + Digital ID + Offline Vault]
    end

    subgraph API Gateway & Security Layer
        API_GATEWAY[Secure RBAC API Gateway\nrequireAuth + Zod Schemas]
        SSE_ALUMNI[Real-Time Alumni SSE Stream\nMentorship, Donation & Event Alerts]
        PRIVACY_GUARD[Privacy & Consent Filter\nGDPR/FERPA Data Redaction]
    end

    ADMIN_COCKPIT <--> API_GATEWAY
    ALUMNI_PORTAL <--> API_GATEWAY
    MOBILE_HUB <--> API_GATEWAY
    API_GATEWAY --> PRIVACY_GUARD
    API_GATEWAY --> SSE_ALUMNI
    SSE_ALUMNI --> ADMIN_COCKPIT
    SSE_ALUMNI --> MOBILE_HUB

    subgraph Core Orchestration Engine (ALUMNI-HUB / EndowmentOS)
        GRAD_ENGINE[Graduation Transition Engine\nStudent-to-Alumni Auto-Onboarding]
        PROFILE_ENGINE[Alumni Profile & Credential Manager\nCareer Trajectory & Privacy Settings]
        AI_MENTOR_ENGINE[AI Mentorship Matching Engine\nCompatibility Scoring & Skill Graph]
        SESSION_MGR[Mentorship Session & Feedback Mesh\nScheduling, Notes & Ratings]
        JOB_BOARD_ENGINE[Alumni Job Board & ATS Engine\nPosting Vetting & Application Tracking]
        ENDOWMENT_ENGINE[Endowment & Campaign Engine\nFund Allocations & Recognition Tiers]
        CHAPTER_EVENT_ENGINE[Regional Chapter & Event Engine\nGovernance, Ticketing & QR Check-In]
    end

    API_GATEWAY <--> GRAD_ENGINE
    API_GATEWAY <--> PROFILE_ENGINE
    API_GATEWAY <--> AI_MENTOR_ENGINE
    API_GATEWAY <--> SESSION_MGR
    API_GATEWAY <--> JOB_BOARD_ENGINE
    API_GATEWAY <--> ENDOWMENT_ENGINE
    API_GATEWAY <--> CHAPTER_EVENT_ENGINE

    subgraph Subsystem Integrations
        ACADEMIC_HIVE[Academic Hive (Sprint-001)\nGraduation Records & Transcripts]
        KM_COPILOT[KM-COPILOT / Skill Graph (Sprint-031)\nDomain Skills & Career Trajectories]
        FINANCE_OS[FinanceOS / FEE-HIVE (Sprint-057)\nDonation Processing & Double-Entry GL]
        DOCGEN[DOC-GEN / ExportHub (Sprint-056)\nCryptographic 80G Tax Receipts & Digital IDs]
        ENGAGE_OS[EngageOS / UMC (Sprint-046)\nMulti-Channel Notifications & Invites]
    end

    GRAD_ENGINE <--> ACADEMIC_HIVE
    AI_MENTOR_ENGINE <--> KM_COPILOT
    ENDOWMENT_ENGINE --> FINANCE_OS
    ENDOWMENT_ENGINE --> DOCGEN
    CHAPTER_EVENT_ENGINE --> DOCGEN
    SESSION_MGR --> ENGAGE_OS
    CHAPTER_EVENT_ENGINE --> ENGAGE_OS

    subgraph Persistence & Audit Layer
        ALUMNI_STORE[Alumni Hub Store Layer\nMulti-Tenant Isolation & Atomic DB Ops]
        DB[(Dual-Store Database\nSQLite Dev / PostgreSQL Prod)]
        MERKLE[Merkle Audit Trail Anchor\npnpm compliance:verify]
        OPENMETRICS[Prometheus OpenMetrics Exporter\n8 Alumni Telemetry Series]
    end

    PROFILE_ENGINE --> ALUMNI_STORE
    AI_MENTOR_ENGINE --> ALUMNI_STORE
    SESSION_MGR --> ALUMNI_STORE
    JOB_BOARD_ENGINE --> ALUMNI_STORE
    ENDOWMENT_ENGINE --> ALUMNI_STORE
    CHAPTER_EVENT_ENGINE --> ALUMNI_STORE
    ALUMNI_STORE <--> DB
    ALUMNI_STORE --> MERKLE
    ALUMNI_STORE --> OPENMETRICS
```

---

## 4. Implementation Task Breakdown

Tasks are decomposed into 12 logical implementation phases in strict dependency order. Foundational database schemas, store data access layer, and core calculation engines MUST be implemented and verified before developing AI matching engines, UI cockpits, mobile integrations, and simulation runners.

---

### Phase 1 — Dual-Store Persistence & Database Schema

#### ALUM-001 — Dual-Store Drizzle ORM Schemas for Alumni & Endowment Subsystem
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-001 |
| **Phase** | Phase 1 — Dual-Store Persistence & Database Schema |
| **Description** | Define 14 new Drizzle ORM entities with 100% schema parity across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`): `alumni_profiles`, `alumni_educations`, `alumni_experiences`, `alumni_mentorship_profiles`, `alumni_mentorship_requests`, `alumni_mentorship_sessions`, `alumni_job_postings`, `alumni_job_applications`, `alumni_donation_campaigns`, `alumni_donations`, `alumni_chapters`, `alumni_chapter_members`, `alumni_events`, and `alumni_event_rsvps`. |
| **Files** | `packages/db/schema.ts` [MODIFY] · `packages/db/schema.pg.ts` [MODIFY] · `src/lib/__tests__/db/alumni-schema-parity.test.ts` [NEW] |
| **Dependencies** | None (Foundational Persistence Layer) |
| **Acceptance Criteria** | 1. All 14 tables declared with complete column parity, foreign keys, and indexes across SQLite and PostgreSQL.<br>2. Full support for multi-campus isolation (`institutionId`), graduation metadata, mentorship settings, job status enums, donation ledger links, and Merkle audit hashes.<br>3. Parity test validates matching column names, nullability, data types, and index constraints with 100% pass rate. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/db/alumni-schema-parity.test.ts`. |
| **Estimated Complexity** | Medium |

#### ALUM-002 — Alumni Store Data Access Layer & Multi-Tenant Isolation
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-002 |
| **Phase** | Phase 1 — Dual-Store Persistence & Database Schema |
| **Description** | Implement the centralized data access store layer (`src/db/alumni-store.ts`) providing strongly typed CRUD operations, tenant-scoped queries, and atomic database transaction wrappers for alumni profiles, mentorship matches, job postings, donations, and chapter events. |
| **Files** | `src/db/alumni-store.ts` [NEW] · `src/lib/__tests__/db/alumni-store.test.ts` [NEW] |
| **Dependencies** | ALUM-001 |
| **Acceptance Criteria** | 1. Implement full typed repository functions with strict `institutionId` isolation on every query.<br>2. Support atomic transactions for donation recording (recording donation, updating campaign total, logging FinanceOS GL entry, generating receipt record).<br>3. Comprehensive unit tests covering CRUD lifecycle, filtering, pagination, and multi-tenant boundary checks. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/db/alumni-store.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 2 — Alumni Lifecycle, Onboarding & Verification Engine

#### ALUM-003 — Automated Student-to-Alumni Graduation Transition Engine
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-003 |
| **Phase** | Phase 2 — Alumni Lifecycle, Onboarding & Verification Engine |
| **Description** | Build the automated graduation transition engine (`src/lib/operations/alumni/graduation-transition-engine.ts`) that listens to academic graduation events or batch processes graduating cohorts from `ACADEMIC-HIVE`, creating verified alumni profiles with academic degree credentials and batch year taxonomy. |
| **Files** | `src/lib/operations/alumni/graduation-transition-engine.ts` [NEW] · `src/lib/operations/alumni/types.ts` [NEW] · `src/lib/__tests__/alumni/graduation-transition-engine.test.ts` [NEW] |
| **Dependencies** | ALUM-002 |
| **Acceptance Criteria** | 1. Support batch graduation processing mapping student ID, degree program, CGPA, graduation date, and honors to alumni profile.<br>2. Generate immutable digital credential hashes linking to original academic transcripts.<br>3. Idempotent onboarding preventing duplicate alumni creation upon repeated graduation triggers. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/alumni/graduation-transition-engine.test.ts`. |
| **Estimated Complexity** | Medium |

#### ALUM-004 — Alumni Profile, Career Trajectory & Privacy Consent Engine
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-004 |
| **Phase** | Phase 2 — Alumni Lifecycle, Onboarding & Verification Engine |
| **Description** | Implement the alumni profile and privacy governance manager (`src/lib/operations/alumni/alumni-profile-engine.ts`) managing multi-position career history, education milestones, skill tags, and granular GDPR/FERPA privacy consent controls (directory visibility, contact sharing, mentorship availability). |
| **Files** | `src/lib/operations/alumni/alumni-profile-engine.ts` [NEW] · `src/lib/operations/alumni/privacy-consent-manager.ts` [NEW] · `src/lib/__tests__/alumni/alumni-profile-engine.test.ts` [NEW] |
| **Dependencies** | ALUM-003 |
| **Acceptance Criteria** | 1. Manage complete career timeline (company, designation, industry sector, start/end dates, current role).<br>2. Enforce granular privacy controls (Public, Alumni-Only, Hidden) across email, phone, location, and current employer.<br>3. Provide automated sanitization helper redacting private fields according to viewer relationship and consent flags. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/alumni/alumni-profile-engine.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 3 — AI-Powered Mentorship Matching & Session Mesh

#### ALUM-005 — AI Mentorship Compatibility Scoring & Recommendation Engine
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-005 |
| **Phase** | Phase 3 — AI-Powered Mentorship Matching & Session Mesh |
| **Description** | Create the AI mentorship compatibility scoring engine (`src/lib/operations/alumni/mentorship/mentorship-matching-engine.ts`) utilizing weighted multi-factor scoring (Career Alignment: 35%, Industry Domain: 25%, Skill Graph Overlap via KM-COPILOT: 20%, Availability/Capacity: 10%, Academic Background: 10%) with fallback heuristic scoring. |
| **Files** | `src/lib/operations/alumni/mentorship/mentorship-matching-engine.ts` [NEW] · `src/lib/operations/alumni/mentorship/skill-matcher.ts` [NEW] · `src/lib/__tests__/alumni/mentorship-matching-engine.test.ts` [NEW] |
| **Dependencies** | ALUM-002, ALUM-004 |
| **Acceptance Criteria** | 1. Calculate deterministic compatibility score ($0.0–1.0$ / $0–100\%$) between any student mentee profile and alumni mentor profile.<br>2. Filter out mentors who have exceeded their monthly mentee capacity or are marked unavailable.<br>3. Deliver top-5 ranked mentor recommendations with explanation factors in $< 50$ms. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/alumni/mentorship-matching-engine.test.ts`. |
| **Estimated Complexity** | High |

#### ALUM-006 — Mentorship Session Scheduling, Feedback & Outcome Tracking
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-006 |
| **Phase** | Phase 3 — AI-Powered Mentorship Matching & Session Mesh |
| **Description** | Implement the mentorship session lifecycle engine (`src/lib/operations/alumni/mentorship/mentorship-session-engine.ts`) managing mentorship requests (`PENDING`, `ACCEPTED`, `DECLINED`, `COMPLETED`), session meeting links, calendar sync payloads, dual-sided ratings/reviews, and cumulative mentorship hours. |
| **Files** | `src/lib/operations/alumni/mentorship/mentorship-session-engine.ts` [NEW] · `src/lib/__tests__/alumni/mentorship-session-engine.test.ts` [NEW] |
| **Dependencies** | ALUM-005 |
| **Acceptance Criteria** | 1. State machine enforcing valid status transitions and notification dispatch via EngageOS.<br>2. Session booking with virtual meeting link generator and iCal `.ics` payload creator.<br>3. Post-session review capture with 1–5 star rating and skill progression notes. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/alumni/mentorship-session-engine.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 4 — Job Board, Internship & Career Placement Mesh

#### ALUM-007 — Alumni Job Board, Internship Portal & Employer Vetting Engine
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-007 |
| **Phase** | Phase 4 — Job Board, Internship & Career Placement Mesh |
| **Description** | Build the institutional career board engine (`src/lib/operations/alumni/jobs/job-board-engine.ts`) enabling alumni and verified partner employers to post full-time, part-time, internship, and research opportunities with admin moderation and vetting controls. |
| **Files** | `src/lib/operations/alumni/jobs/job-board-engine.ts` [NEW] · `src/lib/__tests__/alumni/job-board-engine.test.ts` [NEW] |
| **Dependencies** | ALUM-002, ALUM-004 |
| **Acceptance Criteria** | 1. Job posting schema supporting role title, company, work arrangement (Remote/Hybrid/Onsite), experience level, salary range, required skills, application deadline, and referral contact.<br>2. Admin moderation workflow (`DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `REJECTED`, `EXPIRED`, `CLOSED`).<br>3. Automated expiry calculation and targeted student cohort eligibility filtering. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/alumni/job-board-engine.test.ts`. |
| **Estimated Complexity** | Medium |

#### ALUM-008 — Job Application Lifecycle, Referral Routing & Placement Analytics
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-008 |
| **Phase** | Phase 4 — Job Board, Internship & Career Placement Mesh |
| **Description** | Implement the job application tracking and career placement analytics engine (`src/lib/operations/alumni/jobs/job-application-engine.ts`) handling student applications, resume submissions, alumni referral endorsements, and campus placement rate metrics. |
| **Files** | `src/lib/operations/alumni/jobs/job-application-engine.ts` [NEW] · `src/lib/operations/alumni/jobs/placement-analytics.ts` [NEW] · `src/lib/__tests__/alumni/job-application-engine.test.ts` [NEW] |
| **Dependencies** | ALUM-007 |
| **Acceptance Criteria** | 1. Complete application state tracking: `APPLIED` $\to$ `SHORTLISTED` $\to$ `INTERVIEWING` $\to$ `OFFERED` $\to$ `HIRED` / `REJECTED`.<br>2. Support alumni referral tags boosting application visibility to posting employers.<br>3. Compute real-time placement analytics: Placement Rate %, Average Salary Package, Top Hiring Companies, and Industry Distribution. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/alumni/job-application-engine.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 5 — Endowment Fund, Donation Campaigns & 80G Tax Receipting

#### ALUM-009 — Endowment & Multi-Tier Donation Campaign Management Engine
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-009 |
| **Phase** | Phase 5 — Endowment Fund, Donation Campaigns & 80G Tax Receipting |
| **Description** | Build the institutional giving and endowment engine (`src/lib/operations/alumni/endowments/endowment-campaign-engine.ts`) supporting targeted campaigns (Scholarship Fund, Infrastructure, Research Chairs, General Endowment), target milestone tracking, recurring pledges, corporate matching, and donor tier classifications. |
| **Files** | `src/lib/operations/alumni/endowments/endowment-campaign-engine.ts` [NEW] · `src/lib/__tests__/alumni/endowment-campaign-engine.test.ts` [NEW] |
| **Dependencies** | ALUM-002 |
| **Acceptance Criteria** | 1. Manage campaign target funding goals, raised totals, donor counts, and active date windows.<br>2. Classify donor recognition tiers: `SUPPORTER` ($<\$500$), `BRONZE` ($\$500+$), `SILVER` ($\$2,500+$), `GOLD` ($\$10,000+$), `PLATINUM` ($\$50,000+$), and `TRUSTEE_CIRCLE` ($\$100,000+$).<br>3. Support donor anonymity flags while maintaining audit compliance for financial regulators. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/alumni/endowment-campaign-engine.test.ts`. |
| **Estimated Complexity** | Medium |

#### ALUM-010 — FinanceOS GL Integration & Automated 80G Tax-Exempt Receipt Generation
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-010 |
| **Phase** | Phase 5 — Endowment Fund, Donation Campaigns & 80G Tax Receipting |
| **Description** | Implement the financial integration bridge (`src/lib/operations/alumni/endowments/donation-finance-bridge.ts`) connecting donation payments with FinanceOS (FEE-HIVE) double-entry GL ledger (`GL:1100-BANK_CASH` $\leftrightarrow$ `GL:3100-ENDOWMENT_REVENUE`) and compiling cryptographically signed PDF 80G tax receipts via DOC-GEN. |
| **Files** | `src/lib/operations/alumni/endowments/donation-finance-bridge.ts` [NEW] · `src/lib/operations/alumni/endowments/receipt-80g-generator.ts` [NEW] · `src/lib/__tests__/alumni/donation-finance-bridge.test.ts` [NEW] |
| **Dependencies** | ALUM-009 |
| **Acceptance Criteria** | 1. Emit balanced double-entry GL journal entry for every confirmed donation transaction.<br>2. Generate official Section 80G tax exemption PDF receipt with institutional registration number, donor PAN/Tax ID, amount in words, and digital HMAC-SHA256 signature.<br>3. Embed vector QR code linking to public verification endpoint `/verify/donation/[receiptHash]`. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/alumni/donation-finance-bridge.test.ts`. |
| **Estimated Complexity** | High |

---

### Phase 6 — Regional Chapter & Event Management System

#### ALUM-011 — Regional Chapter Governance & Member Directory Engine
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-011 |
| **Phase** | Phase 6 — Regional Chapter & Event Management System |
| **Description** | Implement the federated regional chapter engine (`src/lib/operations/alumni/chapters/chapter-engine.ts`) managing geographic (e.g. Dubai, London, Bangalore, Calicut) and specialty chapters, chapter officer roles (`PRESIDENT`, `SECRETARY`, `TREASURER`, `COORDINATOR`), member join requests, and local chapter newsfeeds. |
| **Files** | `src/lib/operations/alumni/chapters/chapter-engine.ts` [NEW] · `src/lib/__tests__/alumni/chapter-engine.test.ts` [NEW] |
| **Dependencies** | ALUM-002, ALUM-004 |
| **Acceptance Criteria** | 1. Full CRUD and governance workflows for regional and international alumni chapters.<br>2. Role-based chapter officer delegation with chapter-scoped administrative capabilities.<br>3. Chapter membership directory with proximity search and batch cohort grouping. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/alumni/chapter-engine.test.ts`. |
| **Estimated Complexity** | Medium |

#### ALUM-012 — Chapter Event Management, Ticketing & QR Check-In Engine
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-012 |
| **Phase** | Phase 6 — Regional Chapter & Event Management System |
| **Description** | Build the event coordination and attendance engine (`src/lib/operations/alumni/events/alumni-event-engine.ts`) supporting annual reunions, chapter meetups, webinars, ticket tiers (Free/Paid), RSVP capacity caps, digital pass issuance, and real-time QR check-in scanning. |
| **Files** | `src/lib/operations/alumni/events/alumni-event-engine.ts` [NEW] · `src/lib/operations/alumni/events/ticket-pass-generator.ts` [NEW] · `src/lib/__tests__/alumni/alumni-event-engine.test.ts` [NEW] |
| **Dependencies** | ALUM-011 |
| **Acceptance Criteria** | 1. Support in-person, virtual, and hybrid event formats with venue mapping and streaming URLs.<br>2. Generate digital event ticket passes with dynamic HMAC-signed attendee QR codes.<br>3. Real-time attendee check-in scanner validation preventing duplicate entries and tracking attendance rates. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/alumni/alumni-event-engine.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 7 — RBAC-Protected REST API Suite & Real-Time Telemetry

#### ALUM-013 — REST API Route Suite for Alumni Hub Operations & Public Verifier
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-013 |
| **Phase** | Phase 7 — RBAC-Protected REST API Suite & Real-Time Telemetry |
| **Description** | Implement 12 RBAC-protected API route handlers (`src/app/api/alumni/*`) and public donation receipt verification endpoint (`/api/alumni/verify/donation/[hash]`) with strict Zod validation schemas and `requireAuth` guards. |
| **Files** | `src/app/api/alumni/profiles/route.ts` [NEW] · `src/app/api/alumni/directory/route.ts` [NEW] · `src/app/api/alumni/mentorship/match/route.ts` [NEW] · `src/app/api/alumni/mentorship/sessions/route.ts` [NEW] · `src/app/api/alumni/jobs/route.ts` [NEW] · `src/app/api/alumni/jobs/applications/route.ts` [NEW] · `src/app/api/alumni/endowments/campaigns/route.ts` [NEW] · `src/app/api/alumni/endowments/donate/route.ts` [NEW] · `src/app/api/alumni/chapters/route.ts` [NEW] · `src/app/api/alumni/events/route.ts` [NEW] · `src/app/api/alumni/events/checkin/route.ts` [NEW] · `src/app/api/alumni/verify/donation/[hash]/route.ts` [NEW] · `src/lib/validation/alumni-schemas.ts` [NEW] · `src/lib/__tests__/api/alumni-routes.test.ts` [NEW] |
| **Dependencies** | ALUM-003, ALUM-004, ALUM-005, ALUM-006, ALUM-007, ALUM-008, ALUM-009, ALUM-010, ALUM-011, ALUM-012 |
| **Acceptance Criteria** | 1. All routes wrapped in `requireAuth` with granular permissions (`alumni:profile:manage`, `alumni:mentorship:match`, `alumni:jobs:post`, `alumni:donations:collect`, `alumni:events:manage`).<br>2. Public verification endpoint sanitized with strict PII masking (donor initials and obfuscated IDs only).<br>3. 100% route coverage verified by Gateway AST Scanner (`pnpm gateway:scan`). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/api/alumni-routes.test.ts` and `pnpm gateway:scan`. |
| **Estimated Complexity** | High |

#### ALUM-014 — Real-Time Alumni Telemetry Stream (SSE) & Prometheus OpenMetrics
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-014 |
| **Phase** | Phase 7 — RBAC-Protected REST API Suite & Real-Time Telemetry |
| **Description** | Implement the real-time alumni telemetry SSE stream handler (`src/app/api/alumni/stream/route.ts`) and 8 Prometheus OpenMetrics telemetry series (`src/lib/operations/alumni/telemetry/alumni-metrics.ts`). |
| **Files** | `src/app/api/alumni/stream/route.ts` [NEW] · `src/lib/operations/alumni/telemetry/alumni-metrics.ts` [NEW] · `src/lib/__tests__/alumni/alumni-telemetry.test.ts` [NEW] |
| **Dependencies** | ALUM-013 |
| **Acceptance Criteria** | 1. SSE stream pushes live mentorship session notifications, new job alert broadcasts, donation goal milestones, and event check-in counts to connected admin clients.<br>2. Export 8 standard OpenMetrics series: `thaiba_alumni_total_registered`, `thaiba_alumni_mentorship_matches_total`, `thaiba_alumni_mentorship_hours_total`, `thaiba_alumni_job_postings_active`, `thaiba_alumni_job_placements_total`, `thaiba_alumni_donations_total_cents`, `thaiba_alumni_active_chapters_total`, and `thaiba_alumni_event_attendees_total`.<br>3. Unit tests verify stream heartbeats, channel broadcasting, and metric counters. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/alumni/alumni-telemetry.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 8 — Web User Interfaces — Admin Cockpit & Alumni Portal

#### ALUM-015 — Admin Alumni Command Cockpit (`/admin/alumni/hub`)
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-015 |
| **Phase** | Phase 8 — Web User Interfaces — Admin Cockpit & Alumni Portal |
| **Description** | Develop the comprehensive 5-tab Next.js 16 administrative cockpit (`src/app/(shell)/admin/alumni/hub/page.tsx` and subcomponents) providing full command and control over alumni directory verification, mentorship pairing, job board moderation, endowment campaigns, and regional chapter events. |
| **Files** | `src/app/(shell)/admin/alumni/hub/page.tsx` [NEW] · `src/components/operations/alumni/alumni-directory-tab.tsx` [NEW] · `src/components/operations/alumni/mentorship-mesh-tab.tsx` [NEW] · `src/components/operations/alumni/job-placement-tab.tsx` [NEW] · `src/components/operations/alumni/endowment-campaign-tab.tsx` [NEW] · `src/components/operations/alumni/chapter-events-tab.tsx` [NEW] · `src/lib/hooks/use-alumni-hub.ts` [NEW] |
| **Dependencies** | ALUM-013, ALUM-014 |
| **Acceptance Criteria** | 1. Multi-tab responsive layout matching ThaibaHive Design System standards using Radix UI primitives and Tailwind CSS.<br>2. Interactive alumni directory with cohort filtering, credential verification badges, and profile export.<br>3. Live telemetry widget showing active mentorship pairs, jobs posted, total endowment collections, and upcoming chapter events.<br>4. Zero unhandled promise rejections or stuck loading spinners. |
| **Verification Method** | Run `pnpm lint` and verify component rendering in test harness. |
| **Estimated Complexity** | High |

#### ALUM-016 — Alumni Self-Service & Student Mentorship Portal (`/portal/alumni`)
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-016 |
| **Phase** | Phase 8 — Web User Interfaces — Admin Cockpit & Alumni Portal |
| **Description** | Build the alumni self-service and student career networking portal (`src/app/(shell)/portal/alumni/page.tsx`) providing an intuitive interface for alumni to manage their profile, volunteer as mentors, post jobs, and donate, and for students to discover mentors and apply for jobs. |
| **Files** | `src/app/(shell)/portal/alumni/page.tsx` [NEW] · `src/components/operations/alumni/mentor-discovery-card.tsx` [NEW] · `src/components/operations/alumni/job-application-modal.tsx` [NEW] · `src/components/operations/alumni/donation-checkout-card.tsx` [NEW] · `src/components/operations/alumni/event-rsvp-card.tsx` [NEW] · `src/lib/hooks/use-alumni-portal.ts` [NEW] |
| **Dependencies** | ALUM-013, ALUM-010 |
| **Acceptance Criteria** | 1. Clean, mobile-responsive layout for both alumni and student user roles.<br>2. AI mentor discovery widget displaying matching percentage scores and instant booking modal.<br>3. Seamless endowment giving card with preset tiers, custom amount, tax deduction calculator, and one-click PDF 80G receipt download. |
| **Verification Method** | Run `pnpm lint` and test portal interactions. |
| **Estimated Complexity** | Medium |

---

### Phase 9 — Mobile Application — Flutter Alumni Hub & Offline Vault

#### ALUM-017 — Flutter Mobile Alumni Networking Hub & Mentorship Engine (Riverpod)
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-017 |
| **Phase** | Phase 9 — Mobile Application — Flutter Alumni Hub & Offline Vault |
| **Description** | Implement the Flutter mobile alumni module (`mobile/lib/features/alumni_hub/`) with Riverpod state management, featuring alumni directory search, AI mentor discovery, 1-on-1 session request booking, and job board browsing. |
| **Files** | `mobile/lib/features/alumni_hub/models/alumni_models.dart` [NEW] · `mobile/lib/features/alumni_hub/providers/alumni_providers.dart` [NEW] · `mobile/lib/features/alumni_hub/screens/alumni_hub_screen.dart` [NEW] · `mobile/lib/features/alumni_hub/screens/mentor_booking_screen.dart` [NEW] · `mobile/lib/features/alumni_hub/widgets/mentor_profile_card.dart` [NEW] · `mobile/lib/app/router.dart` [MODIFY] |
| **Dependencies** | ALUM-013 |
| **Acceptance Criteria** | 1. Riverpod providers managing alumni state, mentor search filters, and booking sessions.<br>2. Pull-to-refresh list views with cached network image rendering and optimistic UI updates.<br>3. Route protection integrated into `router.dart` with `_authGuard` middleware. |
| **Verification Method** | Run `flutter analyze` in `mobile/`. |
| **Estimated Complexity** | Medium |

#### ALUM-018 — Mobile Digital Alumni ID Card, Offline Vault & Push Event Handlers
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-018 |
| **Phase** | Phase 9 — Mobile Application — Flutter Alumni Hub & Offline Vault |
| **Description** | Build mobile digital alumni ID card and offline event pass vault (`mobile/lib/features/alumni_hub/services/alumni_offline_vault.dart`) allowing verified alumni to carry a tamper-proof digital ID with secure vector QR code for campus entry and receive event push notifications. |
| **Files** | `mobile/lib/features/alumni_hub/services/alumni_offline_vault.dart` [NEW] · `mobile/lib/features/alumni_hub/screens/digital_id_screen.dart` [NEW] · `mobile/lib/features/alumni_hub/screens/event_pass_screen.dart` [NEW] · `mobile/lib/features/alumni_hub/services/alumni_push_handler.dart` [NEW] |
| **Dependencies** | ALUM-017 |
| **Acceptance Criteria** | 1. Store digital alumni credential and event tickets locally using `FlutterSecureStorage` with offline cryptographic verification.<br>2. Dynamic brightness-boosted QR code display on digital ID screen for seamless gate optical scanning.<br>3. Handle push notification payloads routing directly to mentorship bookings, new job postings, and chapter event passes. |
| **Verification Method** | Run `flutter analyze` in `mobile/`. |
| **Estimated Complexity** | Medium |

---

### Phase 10 — End-to-End Simulation CLI Harness & Quality Verification

#### ALUM-019 — End-to-End Simulation CLI Harness (`pnpm alumni:simulate`)
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-019 |
| **Phase** | Phase 10 — End-to-End Simulation CLI Harness & Quality Verification |
| **Description** | Build the comprehensive 8-stage automated simulation CLI harness (`scripts/simulate-alumni-operations.ts`) testing the complete institutional alumni, mentorship, job board, endowment, and chapter event lifecycle. |
| **Files** | `scripts/simulate-alumni-operations.ts` [NEW] · `package.json` [MODIFY] |
| **Dependencies** | ALUM-003, ALUM-005, ALUM-006, ALUM-007, ALUM-008, ALUM-009, ALUM-010, ALUM-012 |
| **Acceptance Criteria** | 1. Execute 8 sequential simulation stages:<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 1**: Cohort Graduation Event & Automated Alumni Profile Transition.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 2**: Profile Credential Verification & Granular Privacy Consent Redaction.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 3**: AI Mentorship Compatibility Scoring & Optimal Pair Recommendation.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 4**: Mentorship Session Scheduling, Meeting Link Generation & Review Capture.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 5**: Alumni Job Posting Moderation, Application Workflow & Referral Routing.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 6**: Endowment Giving, FinanceOS GL Posting & Cryptographic 80G Tax Receipt.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 7**: Regional Chapter Creation, Event Ticketing & Dynamic QR Check-In.<br>&nbsp;&nbsp;&nbsp;&nbsp;• **Stage 8**: Career Placement Analytics Compilation & Real-Time Telemetry Broadcast.<br>2. Registered under npm scripts as `pnpm alumni:simulate`.<br>3. 100% exit code 0 success across all 8 stages. |
| **Verification Method** | Run `pnpm alumni:simulate`. |
| **Estimated Complexity** | High |

---

### Phase 11 — Security Governance, Tenancy Isolation & Audit Trail

#### ALUM-020 — Alumni Privacy (GDPR/FERPA), Data Isolation & Merkle Audit Test Suite
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-020 |
| **Phase** | Phase 11 — Security Governance, Tenancy Isolation & Audit Trail |
| **Description** | Implement comprehensive security, privacy, and multi-tenant isolation test suites (`src/lib/__tests__/alumni/alumni-security-governance.test.ts`) validating tenant boundary isolation, GDPR/FERPA consent filters, and cryptographic Merkle audit integrity. |
| **Files** | `src/lib/__tests__/alumni/alumni-security-governance.test.ts` [NEW] |
| **Dependencies** | ALUM-013, ALUM-019 |
| **Acceptance Criteria** | 1. Assert zero cross-tenant query leakage between distinct campus institution IDs.<br>2. Verify that alumni with privacy consent set to hidden are never exposed in public or directory API responses.<br>3. Validate that donation state mutations emit immutable Merkle audit log entries verified by `pnpm compliance:verify`. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/alumni/alumni-security-governance.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 12 — Standard Operating Procedures & Engineering Runbooks

#### ALUM-021 — Alumni Lifecycle & Graduation Onboarding Runbook
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-021 |
| **Phase** | Phase 12 — Standard Operating Procedures & Engineering Runbooks |
| **Description** | Author standard operating procedure for student-to-alumni graduation cohort processing, credential verification, and automated welcome onboarding. |
| **Files** | `docs/operations/alumni-graduation-onboarding-runbook.md` [NEW] |
| **Dependencies** | ALUM-003, ALUM-015 |
| **Acceptance Criteria** | 1. Complete procedural guide with batch execution instructions and troubleshooting steps.<br>2. Academic credential verification and digital ID issuance workflow documentation. |
| **Verification Method** | Review documentation file for completeness and technical accuracy. |
| **Estimated Complexity** | Low |

#### ALUM-022 — AI Mentorship Mesh & Career Matching Operations Guide
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-022 |
| **Phase** | Phase 12 — Standard Operating Procedures & Engineering Runbooks |
| **Description** | Author operational guide detailing mentorship algorithm configuration, scoring weights, mentor capacity management, and student matching oversight. |
| **Files** | `docs/operations/ai-mentorship-mesh-guide.md` [NEW] |
| **Dependencies** | ALUM-005, ALUM-006 |
| **Acceptance Criteria** | 1. Detailed breakdown of scoring weights, skill graph mapping, and manual pairing overrides.<br>2. Session quality monitoring and dispute resolution workflows. |
| **Verification Method** | Review documentation file for completeness and technical accuracy. |
| **Estimated Complexity** | Low |

#### ALUM-023 — Endowment Campaign Management & 80G Tax Receipting SOP
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-023 |
| **Phase** | Phase 12 — Standard Operating Procedures & Engineering Runbooks |
| **Description** | Author standard operating procedure for launching endowment campaigns, managing donor recognition tiers, reconciling double-entry GL ledger postings, and issuing 80G tax certificates. |
| **Files** | `docs/operations/endowment-campaign-and-80g-tax-receipting-sop.md` [NEW] |
| **Dependencies** | ALUM-009, ALUM-010 |
| **Acceptance Criteria** | 1. Step-by-step instructions for campaign setup, target milestones, and recurring pledge tracking.<br>2. Tax regulatory compliance guide for Section 80G receipting and FinanceOS reconciliation. |
| **Verification Method** | Review documentation file for completeness and technical accuracy. |
| **Estimated Complexity** | Low |

#### ALUM-024 — Regional Chapter & Alumni Event Coordination Runbook
| Field | Specification Details |
|---|---|
| **Task ID** | ALUM-024 |
| **Phase** | Phase 12 — Standard Operating Procedures & Engineering Runbooks |
| **Description** | Author engineering runbook for establishing regional chapters, assigning chapter officers, creating reunion events, and managing QR check-in desks. |
| **Files** | `docs/operations/regional-chapter-and-event-coordination-runbook.md` [NEW] |
| **Dependencies** | ALUM-011, ALUM-012 |
| **Acceptance Criteria** | 1. Comprehensive guide for chapter officer onboarding, event ticket management, and venue coordination.<br>2. On-site QR scanner check-in desk operational protocol. |
| **Verification Method** | Review documentation file for completeness and technical accuracy. |
| **Estimated Complexity** | Low |

---

## 5. Cross-Cutting Engineering Standards

### Dual-Store Persistence Parity
- Every schema modification MUST be applied simultaneously and identically to both SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`).
- Column definitions, data types, nullability constraints, foreign keys, and indexes MUST match 100%.
- Verified via automated unit test `src/lib/__tests__/db/alumni-schema-parity.test.ts`.

### Double-Entry Accounting Invariant for Donations
- Every completed donation MUST produce balanced general ledger journal lines in FinanceOS:
  $$\sum \text{Debit Amounts} - \sum \text{Credit Amounts} = 0$$
- No donation transaction may be finalized without a corresponding balancing ledger entry in `GL:1100-BANK_CASH` and `GL:3100-ENDOWMENT_REVENUE`.

### Role-Based Access Control (RBAC)
- All alumni endpoints MUST be shielded by `requireAuth` wrapper with explicit permission strings.
- Enforce least-privilege role matrix:
  - `super_admin`: Full platform alumni and cross-campus consolidated endowment access (`*`).
  - `admin` / `advancement_director`: Institution-wide alumni directory verification, endowment campaign management, and chapter oversight.
  - `chapter_officer`: Chapter-specific event management and local member coordination.
  - `alumni`: Manage own profile, mentorship availability, job postings, donations, and event RSVPs.
  - `student`: Discover mentors, request mentorship sessions, browse job board, apply for jobs, and attend events.

### Privacy & Consent Governance (GDPR / FERPA)
- All alumni profile lookups and directory searches MUST pass through the privacy consent filter (`privacy-consent-manager.ts`).
- Unverified or hidden fields (personal phone, private email, residential address) MUST be redacted for non-admin viewers unless explicitly consented.

### Performance & Latency Targets
- AI Mentorship Recommendation Latency: $< 50$ms per student query.
- Cryptographic 80G PDF Receipt Compilation: $< 150$ms per donation receipt document.
- Job Application Submission & Referral Routing: $< 100$ms roundtrip.
- Career Analytics Aggregation: $< 300$ms across 10,000 alumni records.

---

## 6. Risk Register & Mitigation Strategy

### Technical & Architectural Risks

| # | Risk Description | Severity | Impact | Mitigation Strategy |
|---|---|---|---|---|
| 1 | **Alumni Data Privacy Leakage (GDPR / FERPA Violation)**: Inadvertent exposure of alumni contact numbers, personal emails, or compensation data in public directory search APIs. | Critical | Severe regulatory penalties and reputation loss. | Enforce mandatory data redaction middleware (`privacy-consent-manager.ts`) on all directory query handlers; test with automated privacy leak test suites (`ALUM-020`). |
| 2 | **AI Mentorship Matching Cold-Start & Sparsity**: Low initial alumni mentor participation leading to unfulfilled student mentorship requests. | High | Poor student experience and abandoned mentorship mesh. | Implement automated fallback heuristic matching based on department and degree program; provide batch mentor onboarding incentives and administrative pairing overrides. |
| 3 | **Spam & Fraudulent Job Postings**: Malicious or low-quality job postings targeting students with phishing or unverified employment offers. | High | Student security risk and platform distrust. | Enforce mandatory admin moderation workflow (`PENDING_REVIEW` $\to$ `PUBLISHED`) before any external or alumni job posting is visible to students. |
| 4 | **Donation Double-Charging & Receipt Duplication**: Network retries causing double charge on endowment donation checkout or issuing conflicting 80G tax receipt numbers. | High | Financial reconciliation disputes and tax audit issues. | Leverage FinanceOS idempotency keys, atomic transaction locks, and sequential deterministic receipt numbering with SHA-256 integrity verification. |
| 5 | **High-Concurrency Event Check-In Queue Bottlenecks**: Large campus reunion events experiencing delays at optical QR check-in desks due to offline connectivity. | Medium | Entry delays and attendee frustration. | Support offline ticket verification on Flutter mobile hub with pre-downloaded cryptographic public keys and batch sync upon reconnection. |

---

### Business & Operational Risks

| # | Risk Description | Severity | Impact | Mitigation Strategy |
|---|---|---|---|---|
| 1 | **Low Alumni Profile Claim Rate**: Graduating students losing touch with institution email addresses after graduation. | High | Decreased active alumni network engagement. | Capture personal email and WhatsApp numbers during graduation onboarding; dispatch automated transition invitations via EngageOS multi-channel gateway. |
| 2 | **Corporate Matching Donation Verification Lag**: Delays in verifying corporate matching gift eligibility from donor employers. | Medium | Delayed realization of pledged endowment matching funds. | Implement corporate gift pledge status tracking (`PLEDGED`, `SUBMITTED`, `MATCHED`) with automated reminder notifications to employer advancement contacts. |
| 3 | **Regional Chapter Leadership Inactivity**: Appointed chapter officers failing to organize local alumni meetups or maintain communications. | Medium | Stagnant regional chapters and low local participation. | Implement chapter health metrics in Admin Cockpit (Event Frequency, Active Members) and provide centralized institutional event planning templates. |

---

## 7. Rollback & Disaster Recovery Procedures

### Rollback Strategy Overview
Sprint-058 introduces non-breaking additive schema tables and modular micro-services. In the event of an unforeseen production regression, the alumni and endowment subsystem can be rolled back safely without disrupting fee collection, academic, examination, security, or previous platform features.

### Rollback Execution Steps

```bash
# Step 1: Disable ALUMNI-HUB Subsystem via Environment Feature Flags (< 30 seconds)
ALUMNI_HUB_ENABLED=false
ALUMNI_MENTORSHIP_ENABLED=false
ALUMNI_JOB_BOARD_ENABLED=false
ALUMNI_ENDOWMENT_ENABLED=false
ALUMNI_CHAPTERS_ENABLED=false

# Step 2: Revert Source Code & Clean Build (< 5 minutes)
git revert --no-edit HEAD
pnpm build

# Step 3: Verification of Restored Baseline
pnpm typecheck
pnpm test
pnpm compliance:verify
```

---

## 8. Definition of Done

A Sprint-058 task is considered **COMPLETE** when all of the following quality gates are satisfied:

### Code Quality & Standards
- [ ] `pnpm typecheck` (`tsc --noEmit`) passes with 0 TypeScript errors across `src/`, `packages/auth`, and `packages/db`.
- [ ] `pnpm lint` passes with 0 errors and 0 new warnings.
- [ ] `flutter analyze` passes with 0 errors and 0 warnings in `mobile/`.
- [ ] Zero `console.log` statements in production source code (`src/`, `packages/`, `mobile/`).
- [ ] No hardcoded API secrets, private keys, or bypassed authorization checks.
- [ ] Complete TypeScript interfaces and JSDoc documentation on all exported types, functions, and classes.

### Testing & Verification
- [ ] Unit tests authored for every new module with $\ge 85\%$ code coverage.
- [ ] Full platform test suite passes: `pnpm test` $\to$ 100% pass rate across all test suites (including new ALUMNI-HUB test suites).
- [ ] `pnpm gateway:scan --strict --json` $\to$ 100% route coverage verified with 0 unshielded endpoints.
- [ ] `pnpm compliance:scan` $\to$ 100% compliance audit coverage across all alumni/donation mutation routes.
- [ ] `pnpm compliance:verify` $\to$ Cryptographic Merkle audit chain verified intact.
- [ ] `pnpm security:tenants` $\to$ 0 cross-tenant isolation leaks across all alumni queries.
- [ ] `alumni-schema-parity.test.ts` $\to$ 100% schema parity confirmed between SQLite and PostgreSQL.
- [ ] `pnpm alumni:simulate` $\to$ All 8 simulation scenarios pass with 100% success.
- [ ] Double-entry GL invariant ($\sum \text{Debits} \equiv \sum \text{Credits}$) verified across 100% of donation journal records.

### Security, Privacy & RBAC
- [ ] All new ALUMNI-HUB API routes protected with `requireAuth` and granular alumni permissions.
- [ ] Public verification route (`/api/alumni/verify/donation/[hash]`) strictly sanitized with PII redaction.
- [ ] Privacy consent filters tested and verified for GDPR/FERPA compliance.
- [ ] Strict row-level institution isolation verified across all queries.

### Documentation & Governance
- [ ] 4 operational runbooks created in `docs/operations/`.
- [ ] `.ai/FEATURES.md` updated with Sprint-058 features.
- [ ] `.ai/CHANGELOG.md` updated with v3.42.0 release notes.
- [ ] `.ai/PROJECT_STATUS.md` updated with Sprint-058 deliverables.
- [ ] `.ai/execution/Sprint-058-Execution-Log.md` initialized with all 24 tasks.

---

## 9. Sprint Metadata & Lifecycle

| Metadata Field | Value |
|---|---|
| **Sprint ID** | SPRINT-058 |
| **Sprint Name** | Autonomous Alumni Network, Career Mentorship Mesh & Endowment Fund Management (ALUMNI-HUB / EndowmentOS) |
| **Target Release Version** | v3.42.0 |
| **Total Implementation Tasks** | 24 (ALUM-001 through ALUM-024) |
| **Estimated Sprint Duration** | 8–12 engineering days |
| **Estimated Complexity** | Large |
| **Predecessor Sprint** | SPRINT-057 (v3.41.0 — Centralized Fee Collection, Online Payment Gateway & Financial Reconciliation Mesh — FEE-HIVE / FinanceOS) |
| **Successor Artifact** | `.ai/execution/Sprint-058-Execution-Log.md` |
| **Release Certificate Artifact** | `.ai/releases/Release-Certificate-Sprint-058.md` |

---

*Engineering Contract authored by: Implementation Engineer (Antigravity)*  
*Date: 2026-08-27*  
*ThaibaHive Institution OS — Sprint-058 v3.42.0 Engineering Lifecycle*
