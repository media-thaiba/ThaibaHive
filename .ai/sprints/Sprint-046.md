# Engineering Contract — Sprint-046

**Sprint ID:** SPRINT-046  
**Sprint Name:** Unified Multi-Modal Communication & Intelligent Stakeholder Engagement System (UMC / EngageOS)  
**Target Release Version:** v3.30.0  
**Contract Date:** 2026-08-20  
**Contract Status:** APPROVED — Ready for Implementation  
**Contract Author:** Implementation Engineer (Antigravity)  
**Source Recommendation:** `.ai/Sprint-046-Recommendation.md`  
**Review Status:** ✅ Reviewed and Aligned with AIOS Engineering Guide, Architecture Lead & Security Standards  

---

## 1. Executive Summary

This engineering contract formalizes the implementation scope, technical architecture, detailed task breakdown, acceptance criteria, risk register, rollback procedures, and definition of done for **Sprint-046**. It governs all execution work by the Implementation Engineer until formal handoff to the Verification Engineer.

Following the operational automation delivered in Sprint-043 (AIMS / AutoOps), the collaborative edge intelligence delivered in Sprint-044 (A-FED / EdgeMesh), and the autonomous institutional governance and compliance automation delivered in Sprint-045 (AGOV / ComplianceOS), Sprint-046 elevates ThaibaHive into **Relational Intelligence**.

Sprint-046 introduces **Unified Multi-Modal Communication & Intelligent Stakeholder Engagement System (UMC / EngageOS)**. It replaces fragmented, manual, and isolated outreach channels with an omnichannel orchestration platform that unifies Email, SMS, Push Notifications, In-App WebSockets/SSE, and Interactive Voice response. Driven by predictive AI models, real-time context from academic/operational subsystems, natural language conversational interfaces, and strict GDPR/FERPA consent compliance, EngageOS ensures personalized, high-impact, timely communication with students, parents, staff, and institutional stakeholders.

Furthermore, Sprint-046 resolves critical technical debt items carried over from prior sprints:
- **TD-044-03:** Production cloud inference endpoint integration for the `TieredFallbackEngine`.
- **TD-044-04:** Cryptographic implementation of full BN254 Ate bilinear pairing verification for zk-SNARK gradient bounds.

---

## 2. Scope

### In Scope

| # | Domain | Detailed Description |
|---|---|---|
| 1 | **Dual-Store Schema & Persistence** | 10 new Drizzle ORM entities with 100% SQLite (dev) and PostgreSQL (prod) schema parity covering templates, messages, deliveries, preferences, workflows, chat sessions, intents, translations, campaigns, and engagement analytics. |
| 2 | **Omnichannel Dispatch Engine** | Unified delivery engine supporting Email (SMTP/SES), SMS (Twilio/Vonage), Mobile Push (FCM/APNs), In-App (SSE/WebSocket via Redis PubSub), and Voice Call (Twilio Voice API) with automatic channel fallback cascading. |
| 3 | **Multi-Factor Intelligent Routing Engine** | Dynamic routing algorithm optimizing channel selection based on message urgency (critical, high, standard, low), stakeholder historical responsiveness, real-time presence, cost, and provider reliability. |
| 4 | **Send-Time Optimization & Frequency Capping** | AI-driven dispatch scheduling evaluating individual recipient open/interaction history to predict optimal send windows while enforcing strict anti-fatigue frequency caps. |
| 5 | **Dynamic Template Engine & Brand Safety** | Templating system with conditional blocks, variable interpolation, Markdown/HTML rendering, tone analysis, and brand safety validation. |
| 6 | **AI Personalization & Content Synthesis** | LLM/NLP-powered personalization dynamically tailoring message tone, reading level, and contextual recommendations based on recipient profile, academic standing, and attendance history. |
| 7 | **Multi-Variant A/B Testing & Attribution** | Automated multi-arm bandit experimentation framework testing subject lines, delivery times, and copy variations with real-time conversion attribution. |
| 8 | **Conversational NLP & Intent Engine** | Intent classification, named entity recognition (NER), context slot filling, and fallback handling for student/parent inquiries across attendance, fees, exams, and campus schedules. |
| 9 | **Contextual Dialog Manager & Human Handoff** | Multi-turn dialog state manager with persistent session state, automated FAQs, and zero-loss escalation to human staff with full conversation transcript handoff. |
| 10 | **Event-Driven Workflow Automation Engine** | Visual/declarative trigger-action workflow engine connecting campus subsystem events (e.g. attendance deficit, overdue fee, exam schedule publication) into multi-stage communication drip sequences. |
| 11 | **Neural Localization & Multi-Language Engine** | Automatic translation across 20+ languages with locale-aware date/currency formatting, cultural adaptation heuristics, and manual override hooks. |
| 12 | **GDPR/FERPA Consent & Preference Center** | Fine-grained stakeholder preference management supporting channel toggles, topic subscriptions, quiet hours, and cryptographic opt-in/opt-out consent logging. |
| 13 | **Cryptographic Merkle Audit Trail** | Deterministic SHA-256 Merkle chain logging for every message dispatch, template modification, consent change, and governance approval. |
| 14 | **Prometheus OpenMetrics Telemetry** | 8 new Prometheus metrics tracking dispatch throughput, delivery latency, bounce/failure rates, channel cost, and chatbot deflection rate at `/api/metrics`. |
| 15 | **TD-044-03 Cloud Inference Integration** | Production-grade serverless/cloud model endpoint wiring replacing mock ensemble in `TieredFallbackEngine`. |
| 16 | **TD-044-04 Full BN254 Ate Pairing** | Complete BN254 Ate bilinear pairing verification algorithm integrated into `zk-gradient-verifier.ts`. |
| 17 | **RBAC REST API Suite** | Granular RBAC-gated endpoints (`requireAuth`) for campaigns, templates, workflows, conversations, preferences, and analytics with DPoP tokens and gateway shielding. |
| 18 | **Admin EngageOS Radar & Campaign UI** | 5-tab Next.js dashboard at `/admin/operations/engage-os` featuring Live Dispatch Monitor, Workflow Canvas, Template Studio, Conversational Hub, and Engagement Analytics. |
| 19 | **Stakeholder Portal & Chatbot Widget** | Embedded responsive chat drawer and self-service preference management center for students and parents. |
| 20 | **Mobile Integration (Flutter Riverpod)** | Mobile push notification handlers, background message receipt, and in-app communication drawer in Flutter app. |
| 21 | **End-to-End Simulation CLI Harness** | CLI simulation test runner (`scripts/operations/engage-simulation-runner.ts` / `pnpm engage:simulate`) executing 8 automated communication scenarios. |
| 22 | **Operational Documentation & Runbooks** | 5 comprehensive engineering guides and operational runbooks in `docs/`. |

---

### Out of Scope

| Area | Justification |
|---|---|
| Unsolicited Mass Cold Marketing / External Spam | The system is strictly engineered for authenticated institutional stakeholder communication (students, parents, staff, alumni, applicants); cold lead generation or unverified bulk marketing is strictly out of scope. |
| Direct Cellular Carrier Telephony Infrastructure | Communication uses certified cloud gateway APIs (Twilio, AWS SES, FCM); maintaining physical telecom towers or SS7 carrier hardware is out of scope. |
| Unencrypted PII in External Provider Payloads | Transmission of sensitive student PII (e.g. national ID, medical records) over unencrypted external channels is strictly prohibited; messages must contain secure portal links or sanitized summaries. |
| Automatic Overriding of Stakeholder Opt-Outs for Non-Emergency Traffic | Emergency broadcast overrides are restricted to super-admin certified safety crises; routine marketing/operational notices must never bypass user opt-out preferences. |
| Unbounded Cloud Translation / NLP API Expenditure | Translation and NLP pipelines must enforce local token caching, fuzzy match deduplication, and budget caps to prevent unbounded third-party billing. |

---

## 3. Technical Architecture & Component Interactions

```mermaid
flowchart TD
    subgraph Campus Subsystem Triggers
        ATTEND[Attendance Engine] --> EVENT_BUS[Campus Event Bus / Redis PubSub]
        FINANCE[Finance & Fee Engine] --> EVENT_BUS
        EXAMS[Exam & Grade Engine] --> EVENT_BUS
        ADMIN_MANUAL[Admin Campaign UI] --> EVENT_BUS
    end

    subgraph EngageOS Workflow & Decision Core
        EVENT_BUS --> WORKFLOW_ENG[Event-Driven Workflow Engine]
        WORKFLOW_ENG --> CONSENT_GATE[Consent & Preference Gate\nGDPR/FERPA Check]
        CONSENT_GATE -->|Allowed| ROUTING_ENG[Multi-Factor Intelligent Router\nUrgency, Cost, Presence]
        CONSENT_GATE -->|Blocked / Opt-Out| AUDIT_LOG[SHA-256 Merkle Audit Chain]
        
        ROUTING_ENG --> SEND_TIME_OPT[Send-Time Optimizer & Frequency Capper]
        SEND_TIME_OPT --> AI_PERS[AI Personalization & Synthesis Engine]
        AI_PERS --> TEMPLATE_ENG[Template Studio & Brand Safety Validator]
        TEMPLATE_ENG --> TRANSLATION[Neural Localization & Translation]
    end

    subgraph Omnichannel Dispatch Engine
        TRANSLATION --> DISPATCHER[Unified Dispatch Orchestrator]
        DISPATCHER --> EMAIL_ADAPTER[Email Adapter\nSMTP / AWS SES]
        DISPATCHER --> SMS_ADAPTER[SMS Adapter\nTwilio / Vonage]
        DISPATCHER --> PUSH_ADAPTER[Push Adapter\nFCM / APNs]
        DISPATCHER --> INAPP_ADAPTER[In-App SSE/WS\nRedis PubSub Mesh]
        DISPATCHER --> VOICE_ADAPTER[Voice Call Adapter\nTwilio Voice IVR]
        
        DISPATCHER -->|Failure / Timeout| FALLBACK_CASCADE[Fallback Cascading Engine]
        FALLBACK_CASCADE -->|Retry alternate channel| DISPATCHER
    end

    subgraph Conversational & Inbound Interface
        USER_INBOUND[Inbound User Message / Voice] --> CONV_ROUTER[Conversational Router]
        CONV_ROUTER --> NLP_INTENT[NLP Intent & Entity Extractor]
        NLP_INTENT --> DIALOG_MGR[Dialog State & Knowledge Retriever]
        DIALOG_MGR -->|Automated Answer| DISPATCHER
        DIALOG_MGR -->|Low Confidence / Human Request| HUMAN_HANDOFF[Human Staff Escalation Desk]
    end

    subgraph Persistence, Telemetry & UI
        DISPATCHER & WORKFLOW_ENG & CONV_ROUTER --> DB[(Dual-Store Persistence\nSQLite & PostgreSQL)]
        DISPATCHER & WORKFLOW_ENG & CONV_ROUTER --> MERKLE[SHA-256 Merkle Chain]
        DISPATCHER & WORKFLOW_ENG & CONV_ROUTER --> METRICS[Prometheus OpenMetrics]
        
        DB & MERKLE & METRICS --> ENGAGE_UI[Admin EngageOS Radar UI\n/admin/operations/engage-os]
        DB & DISPATCHER --> PORTAL_UI[Stakeholder Portal & Preference Hub]
        DB & DISPATCHER --> FLUTTER_APP[Mobile Flutter App]
    end
```

---

## 4. Implementation Task Breakdown

Tasks are organized across 12 logical implementation phases in strict dependency order. Core persistence schemas, dispatchers, and routing engines MUST be constructed and unit-tested before downstream workflow automations, conversational bots, UI panels, simulation harnesses, and operational runbooks are built.

---

### Phase 1 — Dual-Store Persistence & Core Multi-Modal Dispatch Infrastructure

#### UMC-001 — Dual-Store Drizzle ORM Schemas for EngageOS
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-001 |
| **Phase** | Phase 1 — Dual-Store Persistence & Core Multi-Modal Dispatch Infrastructure |
| **Description** | Define 10 new Drizzle ORM entities with 100% schema parity across SQLite (`packages/db/schema.ts`) and PostgreSQL (`packages/db/schema.pg.ts`): `engage_templates`, `engage_messages`, `engage_deliveries`, `engage_preferences`, `engage_workflows`, `engage_workflow_runs`, `engage_chat_sessions`, `engage_chat_messages`, `engage_translations`, and `engage_analytics_events`. Implement CRUD data stores with strict tenant isolation, index optimizations, and export typed stores. |
| **Files** | `packages/db/schema.ts` [MODIFY] · `packages/db/schema.pg.ts` [MODIFY] · `src/lib/db/engage-store.ts` [NEW] · `src/lib/__tests__/db/engage-schema-parity.test.ts` [NEW] · `src/lib/__tests__/db/engage-store.test.ts` [NEW] |
| **Dependencies** | None (Foundational Persistence Layer) |
| **Acceptance Criteria** | 1. All 10 tables declared with complete column parity, indexes, foreign keys, and timestamps.<br>2. Full support for SQLite (`text`, `integer`, `real`) and PostgreSQL (`timestamp`, `jsonb`, `uuid`, `varchar`) data types.<br>3. `engage-store.ts` provides transactional CRUD methods with mandatory `tenantId` parameter filtering.<br>4. Parity test validates matching column names, nullability, and index constraints across both dialects with 100% pass rate. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/db/engage-schema-parity.test.ts` and `pnpm test src/lib/__tests__/db/engage-store.test.ts`. |
| **Estimated Complexity** | Medium |

#### UMC-002 — Omnichannel Unified Dispatch Engine & Channel Adapters
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-002 |
| **Phase** | Phase 1 — Dual-Store Persistence & Core Multi-Modal Dispatch Infrastructure |
| **Description** | Implement the core multi-channel dispatch orchestrator in `src/lib/operations/engage/dispatch-engine.ts` with dedicated channel adapters in `src/lib/operations/engage/adapters/`: `email-adapter.ts` (SMTP/AWS SES), `sms-adapter.ts` (Twilio/Vonage), `push-adapter.ts` (FCM/APNs), `inapp-adapter.ts` (SSE & Redis PubSub Mesh), and `voice-adapter.ts` (Twilio Voice IVR). Provide a unified interface `ChannelAdapter` with standard normalized request/response contracts, rate limiters, and payload transformers. |
| **Files** | `src/lib/operations/engage/engage-types.ts` [NEW] · `src/lib/operations/engage/dispatch-engine.ts` [NEW] · `src/lib/operations/engage/adapters/channel-adapter.ts` [NEW] · `src/lib/operations/engage/adapters/email-adapter.ts` [NEW] · `src/lib/operations/engage/adapters/sms-adapter.ts` [NEW] · `src/lib/operations/engage/adapters/push-adapter.ts` [NEW] · `src/lib/operations/engage/adapters/inapp-adapter.ts` [NEW] · `src/lib/operations/engage/adapters/voice-adapter.ts` [NEW] · `src/lib/__tests__/operations/engage/dispatch-engine.test.ts` [NEW] |
| **Dependencies** | UMC-001 |
| **Acceptance Criteria** | 1. Unified `dispatchMessage(payload)` routes to target adapter based on channel identifier.<br>2. Adapters support mock/test mode for local development and real credential injection in production.<br>3. In-App adapter integrates with existing Redis PubSub mesh for instant broadcast.<br>4. Adapters capture provider message IDs, timestamps, and normalized delivery statuses (`queued`, `sent`, `failed`). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/dispatch-engine.test.ts`. |
| **Estimated Complexity** | High |

#### UMC-003 — Delivery Status Tracker, Fallback Cascading & Webhook Receivers
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-003 |
| **Phase** | Phase 1 — Dual-Store Persistence & Core Multi-Modal Dispatch Infrastructure |
| **Description** | Implement delivery tracking, timeout detection, and fallback cascading in `src/lib/operations/engage/delivery-tracker.ts` and `src/lib/operations/engage/fallback-engine.ts`. If a primary channel dispatch (e.g. Push notification) is unacknowledged within a configurable SLA (e.g. 5 minutes) or fails permanently (e.g. invalid token), the fallback engine automatically promotes the dispatch to the next priority channel (e.g. SMS, then Email). Build webhook handlers in `src/app/api/engage/webhooks/[provider]/route.ts` for inbound delivery receipts (DLR) from Twilio, SendGrid/SES, and FCM. |
| **Files** | `src/lib/operations/engage/delivery-tracker.ts` [NEW] · `src/lib/operations/engage/fallback-engine.ts` [NEW] · `src/app/api/engage/webhooks/[provider]/route.ts` [NEW] · `src/lib/__tests__/operations/engage/fallback-engine.test.ts` [NEW] · `src/lib/__tests__/operations/engage/delivery-tracker.test.ts` [NEW] |
| **Dependencies** | UMC-002 |
| **Acceptance Criteria** | 1. Webhook endpoint verifies cryptographic provider signatures (e.g. Twilio X-Twilio-Signature, SES SNS signature).<br>2. Status updates (`delivered`, `opened`, `clicked`, `bounced`, `complained`) mutate `engage_deliveries` records.<br>3. Failed/timed-out dispatches trigger automatic fallback cascade according to tenant policy.<br>4. Prevent infinite fallback loops with max-hop counter ($N \le 3$). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/fallback-engine.test.ts` and test webhook signature verification. |
| **Estimated Complexity** | Medium |

---

### Phase 2 — Intelligent Routing, Optimization & Cost Management

#### UMC-004 — Multi-Factor Intelligent Routing Engine
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-004 |
| **Phase** | Phase 2 — Intelligent Routing, Optimization & Cost Management |
| **Description** | Create the intelligent routing algorithm in `src/lib/operations/engage/routing-engine.ts`. The router selects the optimal delivery channel by calculating a multi-factor score: $S(c) = w_1 U(m) + w_2 P(r, c) + w_3 H(r, c) + w_4 R(c) - w_5 C(c)$, where $U$ is message urgency, $P$ is recipient presence/preference, $H$ is historical engagement rate, $R$ is channel provider reliability SLA, and $C$ is monetary channel delivery cost. |
| **Files** | `src/lib/operations/engage/routing-engine.ts` [NEW] · `src/lib/__tests__/operations/engage/routing-engine.test.ts` [NEW] |
| **Dependencies** | UMC-002, UMC-003 |
| **Acceptance Criteria** | 1. Emergency/critical alerts always prioritize highest-speed, high-penetration channels (Push + SMS + Voice).<br>2. Routine notices optimize for lowest cost (In-App / Email) unless recipient history shows 0% open rates.<br>3. Respects explicit user channel priority preferences stored in `engage_preferences`.<br>4. Supports tenant-level cost budget limits with graceful downgrade to free channels (In-App/Email). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/routing-engine.test.ts` across diverse simulated stakeholder personas and urgency levels. |
| **Estimated Complexity** | High |

#### UMC-005 — Send-Time Optimizer & Frequency Capping Throttler
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-005 |
| **Phase** | Phase 2 — Intelligent Routing, Optimization & Cost Management |
| **Description** | Implement `src/lib/operations/engage/send-time-optimizer.ts` and `src/lib/operations/engage/frequency-capper.ts`. The send-time optimizer analyzes 30-day recipient activity timestamps to predict 1-hour windows with highest open probability. The frequency capper enforces configurable limits (e.g. max 2 non-critical SMS/week, max 1 promo email/day, mandatory quiet hours 21:00–07:00 local time) with emergency bypass validation. |
| **Files** | `src/lib/operations/engage/send-time-optimizer.ts` [NEW] · `src/lib/operations/engage/frequency-capper.ts` [NEW] · `src/lib/__tests__/operations/engage/frequency-capper.test.ts` [NEW] · `src/lib/__tests__/operations/engage/send-time-optimizer.test.ts` [NEW] |
| **Dependencies** | UMC-001, UMC-004 |
| **Acceptance Criteria** | 1. Computes optimal dispatch timestamp in recipient local timezone.<br>2. Blocks non-emergency messages during quiet hours and queues for next morning release.<br>3. Enforces frequency caps per communication category (`academic`, `financial`, `operational`, `general`).<br>4. High-priority/Emergency messages bypass frequency throttling with audit trail log. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/frequency-capper.test.ts` and `pnpm test src/lib/__tests__/operations/engage/send-time-optimizer.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 3 — AI-Driven Personalization & Template Management

#### UMC-006 — Dynamic Template Engine & Brand Safety Validator
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-006 |
| **Phase** | Phase 3 — AI-Driven Personalization & Template Management |
| **Description** | Implement a secure template compilation and rendering engine in `src/lib/operations/engage/template-engine.ts` with brand safety and tone compliance checking in `src/lib/operations/engage/brand-validator.ts`. Supports dynamic placeholders (`{{student.name}}`, `{{fee.balance}}`), conditional blocks (`{{#if isOverdue}}...{{/if}}`), loops, HTML sanitization, and automated brand guideline linting (institutional logo presence, forbidden keywords, accessibility contrast ratio). |
| **Files** | `src/lib/operations/engage/template-engine.ts` [NEW] · `src/lib/operations/engage/brand-validator.ts` [NEW] · `src/lib/__tests__/operations/engage/template-engine.test.ts` [NEW] · `src/lib/__tests__/operations/engage/brand-validator.test.ts` [NEW] |
| **Dependencies** | UMC-001 |
| **Acceptance Criteria** | 1. Compiles templates with zero injection vulnerabilities (XSS sanitized, no `eval`).<br>2. Missing required variable substitutions raise descriptive errors or fallback defaults.<br>3. Brand validator flags missing institutional disclosures, unapproved links, or hostile tone.<br>4. Supports multi-channel template rendering (HTML for email, plain text for SMS, concise payload for Push). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/template-engine.test.ts` and `pnpm test src/lib/__tests__/operations/engage/brand-validator.test.ts`. |
| **Estimated Complexity** | Medium |

#### UMC-007 — AI Personalization Engine & Behavioral Content Synthesizer
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-007 |
| **Phase** | Phase 3 — AI-Driven Personalization & Template Management |
| **Description** | Implement the AI personalization module in `src/lib/operations/engage/ai-personalizer.ts`. Synthesizes personalized message snippets, subject lines, and call-to-actions based on student academic performance trends, attendance patterns, language preferences, and sentiment history. Integrates with the local Ollama LLM / cloud serverless endpoint to adapt message complexity and empathy level (e.g. encouraging tone for struggling students, formal notice for administrative fees). |
| **Files** | `src/lib/operations/engage/ai-personalizer.ts` [NEW] · `src/lib/__tests__/operations/engage/ai-personalizer.test.ts` [NEW] |
| **Dependencies** | UMC-006 |
| **Acceptance Criteria** | 1. Adapts message tone based on recipient archetype (parent, student, staff).<br>2. Generates personalized action suggestions (e.g., "Schedule a 10-min review with Prof. Ahmed").<br>3. Output bounded by deterministic safety filters; hallucinated links or data are filtered.<br>4. Provides offline/deterministic fallback heuristics if LLM engine is unreachable. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/ai-personalizer.test.ts`. |
| **Estimated Complexity** | High |

#### UMC-008 — Multi-Variant A/B Testing & Conversion Attribution Framework
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-008 |
| **Phase** | Phase 3 — AI-Driven Personalization & Template Management |
| **Description** | Build the experimentation and attribution engine in `src/lib/operations/engage/ab-testing.ts`. Allows campaign managers to define $N$-variant message experiments (varying subject lines, send times, channels, or copy). Implements $\epsilon$-greedy / Thompson Sampling multi-armed bandit algorithm to dynamically allocate traffic toward top-performing variants once statistical significance ($p < 0.05$) is achieved. |
| **Files** | `src/lib/operations/engage/ab-testing.ts` [NEW] · `src/lib/__tests__/operations/engage/ab-testing.test.ts` [NEW] |
| **Dependencies** | UMC-003, UMC-006 |
| **Acceptance Criteria** | 1. Deterministic hashing assigns recipients to consistent experiment buckets.<br>2. Real-time conversion tracking (open $\to$ click $\to$ portal login $\to$ fee payment).<br>3. Multi-armed bandit automatically increases allocation to winning variant after sample threshold ($N \ge 100$).<br>4. Computes confidence intervals, conversion lift %, and statistical significance score. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/ab-testing.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 4 — Conversational Interface & Voice Assistant Framework

#### UMC-009 — NLP Intent Classification & Entity Extraction Engine
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-009 |
| **Phase** | Phase 4 — Conversational Interface & Voice Assistant Framework |
| **Description** | Create the natural language understanding (NLU) service in `src/lib/operations/engage/conversational/intent-classifier.ts` and `src/lib/operations/engage/conversational/entity-extractor.ts`. Classifies stakeholder inquiries into 30+ institutional intents (e.g. `check_attendance`, `fee_balance`, `exam_timetable`, `hostel_complaint`, `leave_application_status`, `transport_schedule`) and extracts key entities (dates, course codes, student IDs, amounts). |
| **Files** | `src/lib/operations/engage/conversational/intent-classifier.ts` [NEW] · `src/lib/operations/engage/conversational/entity-extractor.ts` [NEW] · `src/lib/operations/engage/conversational/intent-catalog.ts` [NEW] · `src/lib/__tests__/operations/engage/conversational/intent-classifier.test.ts` [NEW] |
| **Dependencies** | UMC-001 |
| **Acceptance Criteria** | 1. Intent classifier achieves $\ge 90\%$ accuracy on benchmark institutional query dataset.<br>2. Entity extractor extracts ISO dates, course IDs, and currency amounts with boundary validation.<br>3. Returns confidence score $C \in [0, 1]$ and secondary matching candidates.<br>4. Operates efficiently in $< 20$ms per query using local tokenizer/pattern matcher with LLM semantic fallback. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/conversational/intent-classifier.test.ts`. |
| **Estimated Complexity** | High |

#### UMC-010 — Dialog Context Manager & Knowledge Retriever
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-010 |
| **Phase** | Phase 4 — Conversational Interface & Voice Assistant Framework |
| **Description** | Implement multi-turn conversational session management in `src/lib/operations/engage/conversational/dialog-manager.ts` and RAG institutional knowledge retrieval in `src/lib/operations/engage/conversational/knowledge-retriever.ts`. Tracks multi-turn conversation slots (e.g. asking for missing course code when checking exam dates), retains session state across channels (e.g. Web Chat $\to$ SMS continuation), and retrieves answers from indexed institutional policies and FAQs. |
| **Files** | `src/lib/operations/engage/conversational/dialog-manager.ts` [NEW] · `src/lib/operations/engage/conversational/knowledge-retriever.ts` [NEW] · `src/lib/__tests__/operations/engage/conversational/dialog-manager.test.ts` [NEW] |
| **Dependencies** | UMC-009 |
| **Acceptance Criteria** | 1. Maintains multi-turn context across up to 20 conversation turns with 1-hour session TTL.<br>2. Slot-filling logic prompts for missing required parameters before executing queries.<br>3. Integrates with live campus data services (attendance, fees, exams) under caller RBAC context.<br>4. Prevents unauthorized data access (e.g., parent cannot view unlinked student records). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/conversational/dialog-manager.test.ts`. |
| **Estimated Complexity** | High |

#### UMC-011 — Omnichannel Chatbot & Voice Assistant with Human Handoff
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-011 |
| **Phase** | Phase 4 — Conversational Interface & Voice Assistant Framework |
| **Description** | Implement `src/lib/operations/engage/conversational/chat-gateway.ts`, Twilio Voice IVR webhook handlers in `src/app/api/engage/voice/route.ts`, and human escalation routing in `src/lib/operations/engage/conversational/human-handoff.ts`. If intent confidence is low ($C < 0.65$), sentiment is strongly negative, or user explicitly requests human help, the session transitions to `agent_pending` state, notifies on-duty staff, and streams real-time transcript to staff desk. |
| **Files** | `src/lib/operations/engage/conversational/chat-gateway.ts` [NEW] · `src/lib/operations/engage/conversational/human-handoff.ts` [NEW] · `src/app/api/engage/voice/route.ts` [NEW] · `src/app/api/engage/chat/route.ts` [NEW] · `src/lib/__tests__/operations/engage/conversational/chat-gateway.test.ts` [NEW] |
| **Dependencies** | UMC-002, UMC-010 |
| **Acceptance Criteria** | 1. Web chat endpoint provides streaming response over SSE/WebSocket.<br>2. Voice endpoint returns compliant TwiML (Text-to-Speech + Gather DTMF/Speech) for phone callers.<br>3. Human handoff generates triage ticket with full conversation summary, sentiment score, and context slots.<br>4. Staff can seamlessly join chat and resume conversation without stakeholder re-authentication. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/conversational/chat-gateway.test.ts`. |
| **Estimated Complexity** | High |

---

### Phase 5 — Automated Engagement Workflows & Event Triggers

#### UMC-012 — Event-Driven Workflow Engine & Campus Subsystem Triggers
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-012 |
| **Phase** | Phase 5 — Automated Engagement Workflows & Event Triggers |
| **Description** | Build the trigger listening and workflow execution engine in `src/lib/operations/engage/workflow/workflow-engine.ts` and `src/lib/operations/engage/workflow/event-listener.ts`. Subscribes to internal platform events (e.g. `student.attendance.consecutive_absent_3_days`, `finance.fee.due_in_7_days`, `academic.risk.predicted_high`, `exam.results.published`) and evaluates workflow entry conditions. |
| **Files** | `src/lib/operations/engage/workflow/workflow-engine.ts` [NEW] · `src/lib/operations/engage/workflow/event-listener.ts` [NEW] · `src/lib/operations/engage/workflow/workflow-types.ts` [NEW] · `src/lib/__tests__/operations/engage/workflow/workflow-engine.test.ts` [NEW] |
| **Dependencies** | UMC-001, UMC-004 |
| **Acceptance Criteria** | 1. Event listener captures domain events published by existing ThaibaHive subsystems.<br>2. Workflow engine evaluates conditional JSON filter rules (e.g., `attendance_pct < 75 AND semester >= 3`).<br>3. Prevents duplicate concurrent workflow executions for the same recipient-trigger pair.<br>4. Emits lifecycle metrics (`workflow_triggered_total`, `workflow_completed_total`). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/workflow/workflow-engine.test.ts`. |
| **Estimated Complexity** | Medium |

#### UMC-013 — Multi-Step Drip Sequence Orchestrator & Dynamic Branching
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-013 |
| **Phase** | Phase 5 — Automated Engagement Workflows & Event Triggers |
| **Description** | Implement stateful, multi-step communication sequence execution in `src/lib/operations/engage/workflow/sequence-orchestrator.ts`. Supports delay nodes (e.g. "Wait 3 days"), condition branch nodes (e.g. "If recipient opened Email, do Step A; else send SMS Step B"), webhook action nodes, and goal completion exits (e.g. fee paid terminates reminder sequence). |
| **Files** | `src/lib/operations/engage/workflow/sequence-orchestrator.ts` [NEW] · `src/lib/__tests__/operations/engage/workflow/sequence-orchestrator.test.ts` [NEW] |
| **Dependencies** | UMC-003, UMC-012 |
| **Acceptance Criteria** | 1. Persistent execution state stored in `engage_workflow_runs` with resumption after server restart.<br>2. Non-blocking delay timers schedule future job ticks cleanly.<br>3. Dynamic branch evaluator checks real-time recipient event history before taking path.<br>4. Early exit condition terminates sequence immediately when goal event occurs. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/workflow/sequence-orchestrator.test.ts`. |
| **Estimated Complexity** | High |

---

### Phase 6 — Multi-Language Localization & Cultural Adaptation

#### UMC-014 — Neural Machine Translation Pipeline & Localization Service
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-014 |
| **Phase** | Phase 6 — Multi-Language Localization & Cultural Adaptation |
| **Description** | Implement automated translation and localization service in `src/lib/operations/engage/localization/translation-engine.ts`. Translates communication templates and ad-hoc notices across 20+ supported institutional languages (Arabic, Malayalam, Hindi, Tamil, Urdu, Bengali, French, Spanish, etc.) with translation memory caching in `engage_translations`. |
| **Files** | `src/lib/operations/engage/localization/translation-engine.ts` [NEW] · `src/lib/operations/engage/localization/translation-cache.ts` [NEW] · `src/lib/__tests__/operations/engage/localization/translation-engine.test.ts` [NEW] |
| **Dependencies** | UMC-001, UMC-006 |
| **Acceptance Criteria** | 1. Translates content preserving dynamic variables (`{{student.name}}` remains untouched).<br>2. SHA-256 content-hash translation cache avoids redundant API calls and reduces latency to $< 5$ms for cached strings.<br>3. Supports manual human translation overrides that take precedence over machine translations.<br>4. Supports RTL (Right-to-Left) script text direction formatting for Arabic/Urdu templates. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/localization/translation-engine.test.ts`. |
| **Estimated Complexity** | Medium |

#### UMC-015 — Cultural Adaptation & Automated Tone/Sentiment Verifier
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-015 |
| **Phase** | Phase 6 — Multi-Language Localization & Cultural Adaptation |
| **Description** | Implement `src/lib/operations/engage/localization/cultural-adapter.ts` and `src/lib/operations/engage/localization/sentiment-verifier.ts`. Adapts salutations, honorifics, calendar formatting (e.g. Hijri / Gregorian dates), and currency units based on recipient cultural locale. Scans message text for unintended negative sentiment, cultural insensitivity, or ambiguous phrasing before dispatch. |
| **Files** | `src/lib/operations/engage/localization/cultural-adapter.ts` [NEW] · `src/lib/operations/engage/localization/sentiment-verifier.ts` [NEW] · `src/lib/__tests__/operations/engage/localization/cultural-adapter.test.ts` [NEW] |
| **Dependencies** | UMC-014 |
| **Acceptance Criteria** | 1. Automatically formats dates and numbers according to recipient locale conventions.<br>2. Injects appropriate cultural greetings and honorifics based on recipient relationship and locale.<br>3. Sentiment verifier scores emotional valence and flags aggressive/harsh phrases.<br>4. Blocks dispatches with sentiment severity violations until modified or manually approved. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/localization/cultural-adapter.test.ts`. |
| **Estimated Complexity** | Medium |

---

### Phase 7 — Privacy, Consent & Preference Management (GDPR/FERPA)

#### UMC-016 — Granular Stakeholder Preference & Consent Management
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-016 |
| **Phase** | Phase 7 — Privacy, Consent & Preference Management (GDPR/FERPA) |
| **Description** | Build the preference and consent controller in `src/lib/operations/engage/privacy/consent-manager.ts` and `src/lib/operations/engage/privacy/preference-service.ts`. Manages channel-by-category opt-ins/opt-outs (e.g. allow academic SMS, block marketing SMS, allow email for all), quiet hours, and unsubscription token generators. |
| **Files** | `src/lib/operations/engage/privacy/consent-manager.ts` [NEW] · `src/lib/operations/engage/privacy/preference-service.ts` [NEW] · `src/lib/__tests__/operations/engage/privacy/consent-manager.test.ts` [NEW] |
| **Dependencies** | UMC-001 |
| **Acceptance Criteria** | 1. Validates recipient consent before every non-emergency dispatch.<br>2. Generates secure, HMAC-signed one-click unsubscribe links for email and SMS headers.<br>3. Supports quiet hours configuration with timezone awareness.<br>4. Full compliance with GDPR Art. 7 (Consent) and FERPA privacy regulations. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/privacy/consent-manager.test.ts`. |
| **Estimated Complexity** | Medium |

#### UMC-017 — Cryptographic Consent Audit Trail & Regulatory Compliance Logger
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-017 |
| **Phase** | Phase 7 — Privacy, Consent & Preference Management (GDPR/FERPA) |
| **Description** | Implement `src/lib/operations/engage/privacy/compliance-audit.ts`. Logs every consent grant, consent withdrawal, preference modification, and communication dispatch into the SHA-256 Merkle audit chain (`pnpm compliance:verify`). Generates automated GDPR/FERPA compliance reports detailing lawful basis for every message sent. |
| **Files** | `src/lib/operations/engage/privacy/compliance-audit.ts` [NEW] · `src/lib/__tests__/operations/engage/privacy/compliance-audit.test.ts` [NEW] |
| **Dependencies** | UMC-016 |
| **Acceptance Criteria** | 1. Creates immutable cryptographic audit block for all consent state mutations.<br>2. Verifiable via existing `pnpm compliance:verify` CLI command with 0 broken links.<br>3. Exportable GDPR Article 15 Data Subject Access Request (DSAR) communication history package.<br>4. 100% test coverage on cryptographic signature generation and tamper detection. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/privacy/compliance-audit.test.ts` and `pnpm compliance:verify`. |
| **Estimated Complexity** | Medium |

---

### Phase 8 — Engagement Analytics, Sentiment & Telemetry

#### UMC-018 — Engagement Analytics Aggregator & Heatmap Pipeline
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-018 |
| **Phase** | Phase 8 — Engagement Analytics, Sentiment & Telemetry |
| **Description** | Build the real-time engagement aggregation engine in `src/lib/operations/engage/analytics/engagement-aggregator.ts`. Computes delivery rates, open rates, click-through rates (CTR), response times, channel efficacy heatmaps, and sentiment distribution across campaigns, departments, and stakeholder segments. |
| **Files** | `src/lib/operations/engage/analytics/engagement-aggregator.ts` [NEW] · `src/lib/operations/engage/analytics/engagement-types.ts` [NEW] · `src/lib/__tests__/operations/engage/analytics/engagement-aggregator.test.ts` [NEW] |
| **Dependencies** | UMC-001, UMC-003 |
| **Acceptance Criteria** | 1. Calculates aggregate funnel metrics (Dispatched $\to$ Delivered $\to$ Opened $\to$ Responded $\to$ Converted).<br>2. Computes hourly engagement heatmap matrices (24 hours $\times$ 7 days).<br>3. Segments engagement scores by student year, department, and language.<br>4. Supports date-range filtering with sub-second query performance. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/analytics/engagement-aggregator.test.ts`. |
| **Estimated Complexity** | Medium |

#### UMC-019 — Prometheus OpenMetrics Telemetry & Health Monitoring
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-019 |
| **Phase** | Phase 8 — Engagement Analytics, Sentiment & Telemetry |
| **Description** | Register 8 new Prometheus OpenMetrics series in `src/lib/metrics/registry.ts` and implement health monitoring in `src/lib/operations/engage/engage-telemetry.ts`: `engage_dispatches_total`, `engage_dispatch_duration_seconds`, `engage_delivery_failures_total`, `engage_channel_cost_usd_total`, `engage_chatbot_sessions_total`, `engage_chatbot_deflection_rate`, `engage_workflow_executions_total`, and `engage_active_campaigns_gauge`. |
| **Files** | `src/lib/metrics/registry.ts` [MODIFY] · `src/lib/operations/engage/engage-telemetry.ts` [NEW] · `src/lib/__tests__/operations/engage/engage-telemetry.test.ts` [NEW] |
| **Dependencies** | UMC-002, UMC-018 |
| **Acceptance Criteria** | 1. All 8 metric series exported via `/api/metrics` endpoint in standard Prometheus text format.<br>2. Label dimensions include `channel`, `priority`, `status`, `tenant_id`, and `intent`.<br>3. Channel cost counter tracks estimated spend based on provider unit pricing.<br>4. Zero metric registration collisions or memory leaks during high-frequency increments. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/engage/engage-telemetry.test.ts` and verify `/api/metrics` output. |
| **Estimated Complexity** | Low |

---

### Phase 9 — Technical Debt Resolution

#### UMC-020 — Serverless/Cloud Model Endpoint Integration (TD-044-03 Resolution)
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-020 |
| **Phase** | Phase 9 — Technical Debt Resolution |
| **Description** | Resolve **TD-044-03** by replacing the mock ensemble in `src/lib/operations/federated/edge-inference-engine.ts` with a production-grade cloud serverless model inference client (`src/lib/operations/federated/cloud-inference-client.ts`). Supports secure HTTPS/mTLS requests to AWS Lambda, Google Cloud Run, or Azure Function model endpoints with HMAC request signing, exponential backoff, timeout circuit breakers, and DP-noise preservation. |
| **Files** | `src/lib/operations/federated/cloud-inference-client.ts` [NEW] · `src/lib/operations/federated/edge-inference-engine.ts` [MODIFY] · `src/lib/__tests__/operations/federated/cloud-inference-client.test.ts` [NEW] · `src/lib/__tests__/operations/federated/edge-inference-engine.test.ts` [MODIFY] |
| **Dependencies** | None (Pre-existing A-FED architecture) |
| **Acceptance Criteria** | 1. Real HTTP client sends encrypted, DP-protected feature vectors to configured cloud inference endpoint.<br>2. Implements circuit breaker (trips after 3 consecutive timeouts $> 2000$ms) with graceful local fallback.<br>3. Signature authentication using `CLOUD_MODEL_API_KEY` or AWS SigV4.<br>4. Replaces mock ensemble Boost logic with actual cloud inference response parsing. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/federated/cloud-inference-client.test.ts` and `pnpm test src/lib/__tests__/operations/federated/edge-inference-engine.test.ts`. |
| **Estimated Complexity** | Medium |

#### UMC-021 — Full BN254 Ate Bilinear Pairing & zk-SNARK Verification (TD-044-04 Resolution)
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-021 |
| **Phase** | Phase 9 — Technical Debt Resolution |
| **Description** | Resolve **TD-044-04** by upgrading `src/lib/operations/federated/zk-gradient-verifier.ts` with a full mathematical implementation of BN254 (alt_bn128) optimal Ate bilinear pairing $e: G_1 \times G_2 \to G_T$. Verifies Groth16 zk-SNARK gradient clipping proofs satisfying the pairing check $e(A, B) = e(\alpha, \beta) \cdot e(x \cdot \gamma, \delta) \cdot e(C, \delta)$ over the BN254 elliptic curve group with Miller loop and final exponentiation. |
| **Files** | `src/lib/operations/federated/bn254-pairing.ts` [NEW] · `src/lib/operations/federated/zk-gradient-verifier.ts` [MODIFY] · `src/lib/__tests__/operations/federated/bn254-pairing.test.ts` [NEW] · `src/lib/__tests__/operations/federated/zk-gradient-verifier.test.ts` [MODIFY] |
| **Dependencies** | None (Pre-existing A-FED architecture) |
| **Acceptance Criteria** | 1. Correctly implements Miller loop and final exponentiation for BN254 curve parameters ($q, r, b$).<br>2. Verifies valid Groth16 proofs in $< 50$ms on standard CPU.<br>3. Detects and rejects invalid proofs, corrupted points, and points not on curve group.<br>4. Cryptographically certifies gradient clipping compliance without exposing local client weights. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/operations/federated/bn254-pairing.test.ts` and `pnpm test src/lib/__tests__/operations/federated/zk-gradient-verifier.test.ts`. |
| **Estimated Complexity** | High |

---

### Phase 10 — REST APIs, Security & RBAC Gateway Shield

#### UMC-022 — RBAC-Protected REST API Suite & Gateway Shielding
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-022 |
| **Phase** | Phase 10 — REST APIs, Security & RBAC Gateway Shield |
| **Description** | Create 8 REST API routes under `src/app/api/engage/` protected with `requireAuth`, Zod input validation schemas, DPoP token verification, and tenant isolation: `/api/engage/campaigns` (GET/POST), `/api/engage/campaigns/[id]` (GET/PATCH/DELETE), `/api/engage/templates` (GET/POST), `/api/engage/workflows` (GET/POST), `/api/engage/conversations` (GET/POST), `/api/engage/preferences` (GET/PATCH), `/api/engage/analytics` (GET), and `/api/engage/dispatch` (POST - immediate manual/system trigger). Register all routes in Gateway Shield. |
| **Files** | `src/lib/validation/engage-schemas.ts` [NEW] · `src/app/api/engage/campaigns/route.ts` [NEW] · `src/app/api/engage/campaigns/[id]/route.ts` [NEW] · `src/app/api/engage/templates/route.ts` [NEW] · `src/app/api/engage/workflows/route.ts` [NEW] · `src/app/api/engage/conversations/route.ts` [NEW] · `src/app/api/engage/preferences/route.ts` [NEW] · `src/app/api/engage/analytics/route.ts` [NEW] · `src/app/api/engage/dispatch/route.ts` [NEW] · `src/lib/__tests__/api/engage-api.test.ts` [NEW] |
| **Dependencies** | UMC-001, UMC-002, UMC-012, UMC-016 |
| **Acceptance Criteria** | 1. All routes wrapped with `requireAuth` and enforce permissions (`engage:campaign:manage`, `engage:template:edit`, `engage:chat:interact`, `engage:analytics:view`).<br>2. Request bodies strictly validated with Zod schemas in `engage-schemas.ts`.<br>3. `pnpm gateway:scan --strict` confirms 100% route coverage with 0 unshielded endpoints.<br>4. Mutation operations log threat and audit events into the Merkle chain. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/api/engage-api.test.ts` and `pnpm gateway:scan --strict`. |
| **Estimated Complexity** | High |

---

### Phase 11 — User Interfaces & Mobile Integration

#### UMC-023 — Admin EngageOS Radar & Campaign Management UI
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-023 |
| **Phase** | Phase 11 — User Interfaces & Mobile Integration |
| **Description** | Build the 5-tab Next.js administrative dashboard at `src/app/(shell)/admin/operations/engage-os/page.tsx` using Radix UI primitives and custom UI components: Tab 1 — Live Dispatch Radar & Multi-Channel Feed, Tab 2 — Campaign Studio & A/B Testing, Tab 3 — Visual Workflow Builder & Subsystem Triggers, Tab 4 — Conversational Hub & Human Escalation Desk, and Tab 5 — Engagement Analytics & Heatmap Visualizer. Implement dedicated React hooks in `src/lib/hooks/engage/`. |
| **Files** | `src/app/(shell)/admin/operations/engage-os/page.tsx` [NEW] · `src/components/operations/engage/dispatch-radar-panel.tsx` [NEW] · `src/components/operations/engage/campaign-studio-panel.tsx` [NEW] · `src/components/operations/engage/workflow-canvas-panel.tsx` [NEW] · `src/components/operations/engage/conversational-desk-panel.tsx` [NEW] · `src/components/operations/engage/analytics-dashboard-panel.tsx` [NEW] · `src/lib/hooks/engage/use-engage-dispatch.ts` [NEW] · `src/lib/hooks/engage/use-engage-workflows.ts` [NEW] · `src/lib/hooks/engage/use-engage-chat.ts` [NEW] · `src/lib/hooks/engage/use-engage-analytics.ts` [NEW] · `src/lib/__tests__/components/engage-radar-ui.test.tsx` [NEW] |
| **Dependencies** | UMC-022 |
| **Acceptance Criteria** | 1. 100% adherence to ThaibaHive UI conventions (Radix primitives, Skeleton loading, no raw buttons/inputs).<br>2. Real-time live dispatch feed updates over WebSocket/SSE.<br>3. Passes accessibility audit (`jest-axe`) with 0 WCAG AA violations.<br>4. Interactive visual canvas for drafting workflow trigger trees. |
| **Verification Method** | Run `pnpm test src/lib/__tests__/components/engage-radar-ui.test.tsx` and run `jest-axe` checks. |
| **Estimated Complexity** | High |

#### UMC-024 — Stakeholder Conversational Widget & Preference Portal
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-024 |
| **Phase** | Phase 11 — User Interfaces & Mobile Integration |
| **Description** | Build the stakeholder-facing conversational drawer widget (`src/components/operations/engage/chat-widget-drawer.tsx`) and the self-service communication preference center at `src/app/(shell)/portal/engagement/page.tsx`. Enables students and parents to chat with the institutional assistant, check attendance/fees, configure channel preferences, and manage quiet hours. |
| **Files** | `src/components/operations/engage/chat-widget-drawer.tsx` [NEW] · `src/app/(shell)/portal/engagement/page.tsx` [NEW] · `src/components/operations/engage/preference-settings-panel.tsx` [NEW] · `src/lib/__tests__/components/stakeholder-chat-widget.test.tsx` [NEW] |
| **Dependencies** | UMC-011, UMC-016 |
| **Acceptance Criteria** | 1. Responsive chat drawer opens smoothly from bottom-right on desktop and mobile viewports.<br>2. Renders rich message cards (action buttons, timetable preview, fee payment links).<br>3. Preference portal allows granular toggling of categories and channels with instant save.<br>4. Zero WCAG violations and full keyboard accessibility (Enter/Esc navigation). |
| **Verification Method** | Run `pnpm test src/lib/__tests__/components/stakeholder-chat-widget.test.tsx`. |
| **Estimated Complexity** | Medium |

#### UMC-025 — Flutter Mobile Engagement & Push Notification Integration
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-025 |
| **Phase** | Phase 11 — User Interfaces & Mobile Integration |
| **Description** | Implement Riverpod mobile providers, push notification receivers, and in-app communication drawer in `mobile/lib/features/engagement/`: `engagement_providers.dart`, `push_notification_service.dart`, and `presentation/engagement_feed_screen.dart`. Handles background FCM payload deserialization, local notification display, deep link routing to campus screens, and offline message caching. |
| **Files** | `mobile/lib/features/engagement/application/engagement_providers.dart` [NEW] · `mobile/lib/features/engagement/data/push_notification_service.dart` [NEW] · `mobile/lib/features/engagement/presentation/engagement_feed_screen.dart` [NEW] · `mobile/lib/features/engagement/presentation/widgets/in_app_chat_sheet.dart` [NEW] · `mobile/test/features/engagement/engagement_providers_test.dart` [NEW] |
| **Dependencies** | UMC-002, UMC-011 |
| **Acceptance Criteria** | 1. Riverpod state management complies with immutable StateNotifier / AsyncNotifier patterns.<br>2. Background push notifications trigger appropriate GoRouter deep links (e.g. `/attendance/details`).<br>3. In-app chat sheet supports live chat interaction with institutional AI assistant.<br>4. Passes `flutter analyze` with 0 errors and 0 warnings (enforcing TD-044-01 CI gate). |
| **Verification Method** | Run `flutter test mobile/test/features/engagement/engagement_providers_test.dart` and `flutter analyze`. |
| **Estimated Complexity** | Medium |

---

### Phase 12 — Simulation Harness, Runbooks & Verification

#### UMC-026 — End-to-End Simulation CLI Harness & Operational Runbooks
| Field | Specification Details |
|---|---|
| **Task ID** | UMC-026 |
| **Phase** | Phase 12 — Simulation Harness, Runbooks & Verification |
| **Description** | Develop the comprehensive 8-scenario simulation CLI test runner in `scripts/operations/engage-simulation-runner.ts` (`pnpm engage:simulate`) and author 5 operational guides in `docs/`: `omnichannel-communication-guide.md`, `ai-personalization-brand-safety-guide.md`, `conversational-nlp-bot-guide.md`, `workflow-automation-triggers-guide.md`, and `gdpr-ferpa-consent-compliance-guide.md`. Update `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md`. |
| **Files** | `scripts/operations/engage-simulation-runner.ts` [NEW] · `package.json` [MODIFY] · `docs/omnichannel-communication-guide.md` [NEW] · `docs/ai-personalization-brand-safety-guide.md` [NEW] · `docs/conversational-nlp-bot-guide.md` [NEW] · `docs/workflow-automation-triggers-guide.md` [NEW] · `docs/gdpr-ferpa-consent-compliance-guide.md` [NEW] · `.ai/FEATURES.md` [MODIFY] · `.ai/CHANGELOG.md` [MODIFY] · `.ai/PROJECT_STATUS.md` [MODIFY] |
| **Dependencies** | UMC-001 through UMC-025 |
| **Acceptance Criteria** | 1. `pnpm engage:simulate` executes all 8 stages (Schema verification, Multi-channel dispatch, Routing optimization, Personalization, Conversational bot, Workflow drip sequence, Consent compliance, and Telemetry export) with 100% pass rate.<br>2. 5 documentation guides provide complete architecture diagrams, configuration specs, and emergency procedures.<br>3. `pnpm typecheck` and `pnpm test` pass with 0 errors across entire workspace.<br>4. `.ai/execution/Sprint-046-Execution-Log.md` initialized. |
| **Verification Method** | Execute `pnpm tsx scripts/operations/engage-simulation-runner.ts` and verify exit code 0. |
| **Estimated Complexity** | Medium |

---

## 5. Summary of Implementation Files

```
packages/db/
├── schema.ts                                         (add 10 EngageOS tables)
└── schema.pg.ts                                      (add PostgreSQL parity tables)

src/lib/db/
└── engage-store.ts

src/lib/operations/engage/
├── engage-types.ts
├── dispatch-engine.ts
├── delivery-tracker.ts
├── fallback-engine.ts
├── routing-engine.ts
├── send-time-optimizer.ts
├── frequency-capper.ts
├── template-engine.ts
├── brand-validator.ts
├── ai-personalizer.ts
├── ab-testing.ts
├── engage-telemetry.ts
├── adapters/
│   ├── channel-adapter.ts
│   ├── email-adapter.ts
│   ├── sms-adapter.ts
│   ├── push-adapter.ts
│   ├── inapp-adapter.ts
│   └── voice-adapter.ts
├── conversational/
│   ├── intent-classifier.ts
│   ├── entity-extractor.ts
│   ├── intent-catalog.ts
│   ├── dialog-manager.ts
│   ├── knowledge-retriever.ts
│   ├── chat-gateway.ts
│   └── human-handoff.ts
├── workflow/
│   ├── workflow-engine.ts
│   ├── event-listener.ts
│   ├── workflow-types.ts
│   └── sequence-orchestrator.ts
├── localization/
│   ├── translation-engine.ts
│   ├── translation-cache.ts
│   ├── cultural-adapter.ts
│   └── sentiment-verifier.ts
└── privacy/
    ├── consent-manager.ts
    ├── preference-service.ts
    └── compliance-audit.ts

src/lib/operations/federated/
├── cloud-inference-client.ts                         (TD-044-03 Resolution)
├── bn254-pairing.ts                                  (TD-044-04 Resolution)
├── edge-inference-engine.ts                          (Modified for cloud client)
└── zk-gradient-verifier.ts                           (Modified for BN254 pairing)

src/lib/validation/
└── engage-schemas.ts

src/app/api/engage/
├── campaigns/
│   ├── route.ts
│   └── [id]/route.ts
├── templates/route.ts
├── workflows/route.ts
├── conversations/route.ts
├── preferences/route.ts
├── analytics/route.ts
├── dispatch/route.ts
├── chat/route.ts
├── voice/route.ts
└── webhooks/[provider]/route.ts

src/app/(shell)/
├── admin/operations/engage-os/page.tsx
└── portal/engagement/page.tsx

src/components/operations/engage/
├── dispatch-radar-panel.tsx
├── campaign-studio-panel.tsx
├── workflow-canvas-panel.tsx
├── conversational-desk-panel.tsx
├── analytics-dashboard-panel.tsx
├── chat-widget-drawer.tsx
└── preference-settings-panel.tsx

src/lib/hooks/engage/
├── use-engage-dispatch.ts
├── use-engage-workflows.ts
├── use-engage-chat.ts
└── use-engage-analytics.ts

scripts/operations/
└── engage-simulation-runner.ts

docs/
├── omnichannel-communication-guide.md
├── ai-personalization-brand-safety-guide.md
├── conversational-nlp-bot-guide.md
├── workflow-automation-triggers-guide.md
└── gdpr-ferpa-consent-compliance-guide.md

mobile/lib/features/engagement/
├── application/engagement_providers.dart
├── data/push_notification_service.dart
└── presentation/
    ├── engagement_feed_screen.dart
    └── widgets/in_app_chat_sheet.dart
```

---

## 6. Security, RBAC & Compliance Framework

### RBAC Permissions

| Permission String | Role Access | Description |
|---|---|---|
| `engage:campaign:view` | `super_admin`, `admin`, `principal`, `hod` | View campaigns, message delivery statuses, and engagement analytics. |
| `engage:campaign:manage` | `super_admin`, `admin` | Create, schedule, execute, and cancel omnichannel campaigns and emergency broadcasts. |
| `engage:template:edit` | `super_admin`, `admin` | Create, modify, and validate multi-modal message templates and brand rules. |
| `engage:workflow:manage` | `super_admin`, `admin` | Design and publish automated event-driven communication drip workflows. |
| `engage:chat:interact` | `super_admin`, `admin`, `staff`, `student` | Interact with the AI conversational assistant and staff escalation desk. |
| `engage:preferences:manage` | `super_admin`, `admin`, `principal`, `staff`, `student` | Update individual or institutional communication channel and consent preferences. |

### Compliance & Cryptographic Controls
- **GDPR & FERPA Mandates:** Explicit consent tracking, one-click opt-out headers, and purpose-bound message delivery. No unauthorized secondary use of student/parent contact data.
- **SHA-256 Merkle Audit Integrity:** Every message dispatch metadata hash, template change, and consent toggle is permanently recorded in the SHA-256 Merkle chain (`pnpm compliance:verify`).
- **Data Protection & Sanitization:** All sensitive student PII is stripped or masked prior to sending over external carrier gateways (SMS/Push); outbound messages link to authenticated secure portals for sensitive details.
- **Rate Limiting & Anti-Spam Safeguards:** Strict frequency caps prevent alert fatigue and carrier spam blocking.

---

## 7. Risk Register & Mitigation Strategy

| Risk ID | Category | Risk Description | Severity | Probability | Mitigation Strategy |
|---|---|---|---|---|---|
| **R-046-1** | Delivery / External Provider Outage | External carrier provider (Twilio, SES, FCM) experiences outage or API throttling | High | Medium | Implement multi-provider redundancy, automatic fallback cascading (Push $\to$ SMS $\to$ Email), exponential backoff retries, and local queue buffering. |
| **R-046-2** | AI / Hallucination & Brand Damage | AI personalization generates inaccurate, misleading, or culturally insensitive content | High | Low | Enforce deterministic template boundaries, brand safety linting rules, sentiment verification score gates, and strict system prompts. |
| **R-046-3** | Privacy / Consent Violation | Non-emergency message dispatched to recipient who previously opted out | High | Low | Enforce mandatory synchronous consent verification gate in `dispatchMessage` core before routing to any external adapter. |
| **R-046-4** | NLU / Chatbot Query Misclassification | Bot misinterprets critical academic or fee inquiry, causing stakeholder distress | Medium | Medium | Set intent confidence threshold ($C \ge 0.65$); queries below threshold trigger gentle disambiguation or direct human staff escalation. |
| **R-046-5** | Performance / Broadcast Surge | Massive emergency broadcast (e.g. 50,000 push/SMS) causes API thread starvation or database lock contention | Medium | Low | Process bulk dispatches asynchronously in chunked batches ($N = 500$) using Redis queue workers and non-blocking I/O. |
| **R-046-6** | Localization / Translation Drift | Machine translation alters technical academic terminology or policy nuance | Medium | Low | Maintain translation memory cache with manual human approval overrides for all official institutional policy terms. |

---

## 8. Rollback Plan

### Rollback Trigger Criteria
- Outbound delivery failure rate exceeds 15% across all channels over a 15-minute window.
- AI Personalization engine produces unhandled exceptions or latency $> 2500$ms on $> 5\%$ of messages.
- Consent verification gate fails to load, risking unconsented dispatches.
- Chatbot service encounters memory leak exceeding 150MB heap growth.

### Rollback Execution Steps

```bash
# Step 1: Emergency Communication Engine Pause (< 10 seconds)
# Instantly halts all active outbound campaigns and automated workflows
pnpm tsx scripts/operations/engage-simulation-runner.ts --emergency-pause-all

# Step 2: Disable EngageOS via Environment Feature Flags (< 30 seconds)
ENGAGE_DISPATCH_ENABLED=false
ENGAGE_WORKFLOWS_ENABLED=false
ENGAGE_CHATBOT_ENABLED=false
ENGAGE_AI_PERSONALIZATION_ENABLED=false

# Step 3: Revert Outbound Queue to Safe Fallback Mode
# Routes critical alerts directly through legacy standard email notification channel
ENGAGE_LEGACY_EMAIL_FALLBACK=true

# Step 4: Revert Source Code & Database Migrations (if necessary) (< 5 minutes)
git revert --no-edit HEAD
pnpm build

# Step 5: Verification of Restored Baseline
pnpm typecheck
pnpm test
pnpm compliance:verify
```

---

## 9. Definition of Done

A Sprint-046 task is considered **COMPLETE** when all of the following gates are met:

### Code Quality & Standards
- [ ] `pnpm typecheck` (`pnpm tsc --noEmit`) passes with 0 TypeScript errors across `src/`, `packages/auth`, and `packages/db`.
- [ ] `pnpm lint` passes with 0 errors and 0 new warnings.
- [ ] `flutter analyze` passes with 0 errors and 0 warnings in `mobile/`.
- [ ] Zero `console.log` statements in production source code (`src/`, `packages/`, `mobile/`).
- [ ] No hardcoded API keys, private tokens, or disabled security checks.
- [ ] Complete TypeScript interfaces and JSDoc annotations on all exported types, classes, and handlers.

### Testing & Verification
- [ ] Unit tests authored for every new module with $\ge 90\%$ code coverage.
- [ ] All Jest test suites pass: `pnpm test` $\to$ 100% pass rate.
- [ ] `pnpm gateway:scan --strict --json` $\to$ 100% route coverage verified with 0 unshielded endpoints.
- [ ] `pnpm compliance:scan` $\to$ 100% compliance audit coverage across all mutation endpoints.
- [ ] `pnpm compliance:verify` $\to$ Cryptographic Merkle audit chain verified intact.
- [ ] `pnpm security:tenants` $\to$ 0 cross-tenant isolation leaks across all files.
- [ ] `schema-parity.test.ts` $\to$ 100% schema parity confirmed between SQLite and PostgreSQL.
- [ ] `pnpm engage:simulate` $\to$ All 8 simulation scenarios pass with 100% success.
- [ ] TD-044-03 and TD-044-04 verified with unit and integration tests.

### Security & RBAC
- [ ] All new EngageOS API routes protected with `requireAuth` and granular permissions.
- [ ] DPoP cryptographic proof of possession validated on all admin mutation endpoints.
- [ ] GDPR and FERPA consent validation rules mathematically and procedurally verified.

### Documentation & Governance
- [ ] 5 operational runbooks created in `docs/`.
- [ ] `.ai/FEATURES.md` updated with Sprint-046 features.
- [ ] `.ai/CHANGELOG.md` updated with v3.30.0 release notes.
- [ ] `.ai/PROJECT_STATUS.md` updated with Sprint-046 deliverables.
- [ ] `.ai/execution/Sprint-046-Execution-Log.md` initialized with all 26 tasks.

---

## 10. Sprint Metadata & Lifecycle

| Metadata Field | Value |
|---|---|
| **Sprint ID** | SPRINT-046 |
| **Sprint Name** | Unified Multi-Modal Communication & Intelligent Stakeholder Engagement System (UMC / EngageOS) |
| **Target Release Version** | v3.30.0 |
| **Total Implementation Tasks** | 26 (UMC-001 through UMC-026) |
| **Estimated Sprint Duration** | 14–16 engineering days |
| **Estimated Complexity** | Large |
| **Predecessor Sprint** | SPRINT-045 (v3.29.0 — Autonomous Institutional Governance & Compliance Automation — AGOV / ComplianceOS) |
| **Successor Artifact** | `.ai/execution/Sprint-046-Execution-Log.md` |
| **Release Certificate Artifact** | `.ai/releases/Release-Certificate-Sprint-046.md` |

---

*Engineering Contract authored by: Implementation Engineer (Antigravity)*  
*Date: 2026-08-20*  
*ThaibaHive Institution OS — Sprint-046 v3.30.0 Engineering Lifecycle*
