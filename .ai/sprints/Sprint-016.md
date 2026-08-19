# Implementation Contract: Sprint-016 Enterprise Multi-Tenant Scale & Regional Data Lakehouse Integration

**Sprint ID:** ENTERPRISE-MULTI-TENANT-LAKEHOUSE-016 (EMS-PARENT-016)  
**Sprint Name:** Enterprise Multi-Tenant Scale & Regional Data Lakehouse Integration  
**Status:** Approved Engineering Contract  
**Created Date:** 2026-08-03  
**Target Execution:** 2026-08-04 to 2026-09-15  
**Estimated Duration:** 6–8 weeks (240–320 engineering hours)  
**Risk Level:** High (Enterprise integration, distributed data lakehouse, security compliance)  
**Classification:** AIOS v3.0 Official Implementation Contract  
**Target Release Version:** v3.0.0 (Enterprise Multi-Tenant Scale, Regional Data Lakehouse, SAML 2.0/OIDC Federation, DB Index Auto-Tuning & MDM Certification)

---

## Executive Summary

Sprint-016 executes **Enterprise Multi-Tenant Scale & Regional Data Lakehouse Integration**, strategically advancing ThaibaHive from v2.7.0 into **v3.0.0**. Following the successful completion of Sprint-015—which established 100% mobile platform production maturity (App Store/Play Store pipelines, FCM/APNs push notifications, Dart background isolate offline sync, WCAG 2.1 AA accessibility compliance, and 100% test coverage across 159 passing suites)—all core ERP modules, AI engines, and mobile companion capabilities are now complete and production-certified.

This landmark sprint transforms ThaibaHive from a single-institution operating system into a high-throughput, enterprise-scale regional education management platform. It equips the platform to serve regional education boards, government ministries, and multi-campus networks of 23+ institutions.

### Key Business Impact

- **10x Query Performance for Cross-Campus Analytics:** High-throughput Apache Arrow & Apache Parquet columnar export pipelines (`parquet-writer.ts`, `etl-engine.ts`) offloading analytical processing to data lakehouses (AWS S3, Azure Blob, GCS) without degrading live operational database transactions.
- **80% Identity Overhead Reduction via SAML 2.0 & OIDC Federation:** Single Sign-On (SSO) integration (`saml-service.ts`, `oidc-service.ts`) with enterprise Identity Providers (Azure AD, Okta, Google Workspace), featuring automated Just-In-Time (JIT) provisioning and Attribute-Based Access Control (ABAC).
- **90% Database Maintenance Overhead Reduction via Index Auto-Tuning:** Autonomous PostgreSQL query performance monitoring and index recommendation engine (`index-analyzer.ts`, `index-auto-tuner.ts`) that executes non-blocking `CREATE INDEX CONCURRENTLY` operations with strict lock-timeout safety guards and zero production downtime.
- **Enterprise MDM Distribution Certification:** Microsoft Intune and Apple Business Manager MDM profile generation and enrollment verification (`mdm-config-generator.ts`, `mdm_config_service.dart`) enabling zero-touch bulk deployment across 10,000+ institutionally managed mobile devices.
- **5x Long-Term Data Storage Cost Savings:** Columnar Snappy/ZSTD compression reducing raw historical transactional data footprints while enabling instant queryability via Spark, Trino, DuckDB, and Pandas.

### Strategic Alignment

- Advances product version from v2.7.0 to **v3.0.0 (Enterprise Multi-Tenant Scale & Regional Data Lakehouse Integration)**.
- Extends Sprint-012 Regional Analytics Engine and Federated Governance Engine across multi-region data lakehouse architectures.
- Fulfills enterprise procurement requirements for government education boards and large multi-campus networks.
- Enforces strict multi-tenant data isolation and Zero Trust security boundaries across federated identities and data exports.

---

## Technical Feasibility & Soundness Evaluation

### Soundness Evaluation

The Sprint-016 specification is **technically sound, architecturally incremental, and fully compliant with AIOS v3.0 standards**. The implementation builds directly upon established platform primitives:
- **Data Lakehouse Pipeline:** Uses stream-based chunking and memory-buffered Apache Arrow/Parquet writers (`parquet-writer.ts`) to transform Drizzle ORM PostgreSQL entity streams into partitioned Parquet files with zero main-thread event loop blocking.
- **Identity Federation Engine:** Extends `@thaiba/auth` with SAML 2.0 Assertion Consumer Service (ACS) handlers and OpenID Connect (OIDC) Relying Party (RP) flows, leveraging `jose` for cryptographically verified JWT session minting and JWS signature verification.
- **Database Index Auto-Tuning:** Hooks into PostgreSQL `pg_stat_statements` and `pg_stat_user_indexes` system views to detect sequential scans and high-latency queries (>200ms), validating query plans via `EXPLAIN (FORMAT JSON)` before generating non-blocking DDL commands.
- **Enterprise MDM Engine:** Generates signed Apple `.mobileconfig` and Microsoft Intune XML policy payloads, integrating with Flutter's native platform channels (`mdm_config_service.dart`) to read managed app configurations (`AppConfig`) at runtime.

### Technical Assessment & Risks Identified

1. **Parquet Export Memory Pressure during Bulk Multi-Campus Extractions**
   - *Challenge:* Loading millions of records into memory for Parquet columnar encoding can cause NodeJS heap exhaustion (OOM crashes).
   - *Mitigation:* Implement streaming row-iterator chunks (10,000 records per slice) with backpressure buffers and configurable memory thresholds in `parquet-writer.ts` (`EMS-001`, `EMS-002`).

2. **SAML 2.0 XML Signature Malleability & Replay Attacks**
   - *Challenge:* Misconfigured SAML assertions can be vulnerable to XML Signature Wrapping (XSW) attacks or Assertion Replay.
   - *Mitigation:* Enforce strict XML schema validation, InResponseTo ID verification against Redis nonce caches, clock skew tolerance (±120s), and mandatory assertion signature verification using `xml-crypto` (`EMS-006`, `EMS-010`).

3. **Index Creation Locks Blocking Concurrent Production Transactions**
   - *Challenge:* `CREATE INDEX` acquires an `ACCESS EXCLUSIVE` lock on PostgreSQL tables, blocking incoming student/staff writes.
   - *Mitigation:* Enforce `CREATE INDEX CONCURRENTLY` with `lock_timeout = '2s'`, execution window restriction (low-traffic hours), and automated rollback if lock acquisition times out (`EMS-011`, `EMS-012`, `EMS-014`).

4. **Multi-Tenant Data Leakage in Data Lakehouse Storage Partitions**
   - *Challenge:* Improper partitioning schemes could expose tenant data across multi-campus analytics buckets.
   - *Mitigation:* Enforce strict hierarchical partition paths (`s3://lakehouse/tenant_id={tenant_id}/domain={domain}/year={yyyy}/month={mm}/`) with IAM policy enforcement and automated integration tests verifying tenant separation (`EMS-002`, `EMS-004`, `EMS-019`).

---

## Plan Reviews & Model Feedback Integration

Per the **Plan Review Rule** documented in `AGENTS.md`, this implementation contract was submitted for multi-model technical review to **Qwen**, **OpenCode (Local-Ollama)**, and **Claude Code**. The following architectural enhancements were incorporated into the task specifications:

1. **Streaming Memory Management & Chunk Backpressure (OpenCode / Local-Ollama):** Recommended dynamic buffer allocation pools and batch backpressure in `parquet-writer.ts` (`EMS-001`, `EMS-002`) to guarantee low memory usage (<512MB heap) even when exporting multi-gigabyte campus tables.
2. **SAML 2.0 Nonce Cache & Session Revocation List (Qwen):** Recommended integrating Redis distributed nonce caching and explicit IDP single logout (SLO) endpoint handling (`EMS-006`, `EMS-009`) to prevent replay attacks and ensure instant global session termination.
3. **Database Lock Timeout & Concurrent DDL Execution Safety (Claude Code & OpenCode):** Recommended wrapping all index auto-tuning commands in transactional lock timeout blocks with `statement_timeout` guards (`EMS-011`, `EMS-012`) to prevent index creation from blocking operational ERP writes.
4. **Zero-Touch Nonce Verification for Enterprise MDM Handoff (Claude Code):** Suggested implementing a dual-handshake enrollment protocol in `/api/mobile/mdm/enroll` (`EMS-016`, `EMS-017`) that verifies MDM device payloads against hardware UUIDs and signed organization nonces.

---

## Scope & Out of Scope

### In Scope

1. **Regional Data Lakehouse ETL Engine:**
   - Columnar Parquet & Apache Arrow data export writer (`src/lib/lakehouse/parquet-writer.ts`).
   - Incremental multi-tenant ETL engine with partition management (`src/lib/lakehouse/etl-engine.ts`).
   - Lakehouse export schema evolution manager supporting backward-compatible schema updates.
   - Database schema tracking tables (`data_lakehouse_jobs`, `data_lakehouse_partitions`) in `packages/db`.
   - Admin API endpoints (`/api/admin/lakehouse/exports`, `/api/admin/lakehouse/jobs/[id]`).

2. **SAML 2.0 & OIDC Enterprise Identity Federation:**
   - SAML 2.0 Service Provider (SP) metadata generator & Assertion Consumer Service (ACS) (`src/lib/auth/saml-service.ts`).
   - OpenID Connect (OIDC) Relying Party (RP) handler (`src/lib/auth/oidc-service.ts`).
   - Federated identity mapping engine with Just-In-Time (JIT) user provisioning and Attribute-Based Access Control (ABAC).
   - SSO API endpoints (`/api/auth/saml/sso`, `/api/auth/saml/acs`, `/api/auth/saml/metadata`, `/api/auth/oidc/login`, `/api/auth/oidc/callback`).
   - Database schema tracking tables (`saml_providers`, `oidc_providers`, `federated_identity_mappings`) in `packages/db`.

3. **Automated Database Index Auto-Tuning Engine:**
   - PostgreSQL `pg_stat_statements` query analyzer & index candidate recommendation engine (`src/lib/database/index-analyzer.ts`).
   - Non-blocking `CREATE INDEX CONCURRENTLY` execution engine with lock-timeout safety guards (`src/lib/database/index-auto-tuner.ts`).
   - Index auto-tuning management API endpoints (`/api/admin/database/index-tuning/analyze`, `/api/admin/database/index-tuning/apply`, `/api/admin/database/index-tuning/history`).
   - Database schema tracking tables (`index_tuning_recommendations`, `index_tuning_logs`) in `packages/db`.

4. **Enterprise MDM Deployment & App Wrapping Certification:**
   - MDM configuration profile generator for Microsoft Intune and Apple Business Manager (`src/lib/mdm/config-generator.ts`).
   - MDM enrollment & hardware UUID validation API (`/api/mobile/mdm/enroll`, `/api/mobile/mdm/verify`).
   - Flutter mobile companion managed configuration client service (`mobile/lib/features/mdm/services/mdm_config_service.dart`).
   - Database schema tracking tables (`mdm_enrolled_devices`, `mdm_profiles`) in `packages/db`.

5. **Integration, Testing, Security Audit & Release Documentation:**
   - Comprehensive test suites (`data-lakehouse-integration.test.ts`, `saml-oidc-security.test.ts`, `index-tuning-safety.test.ts`, `sprint-016-performance.test.ts`, `sprint-016-security-audit.test.ts`).
   - Architecture Guide (`docs/enterprise-multi-tenant-lakehouse-guide.md`).
   - Full update of AIOS documentation (`.ai/FEATURES.md`, `.ai/CHANGELOG.md`, `.ai/PROJECT_STATUS.md`).

### Explicitly Out of Scope

- Procurement of enterprise SAML/OIDC vendor tenant subscriptions (testing will use mock SAML/OIDC test providers like SimpleSAMLphp / Keycloak / Mock-OIDC).
- Provisioning physical cloud object storage infrastructure (pipelines will output to local filesystem/S3-compatible API abstractions).
- Direct modification of underlying third-party enterprise IdPs (Azure AD / Okta instance administration).
- Developing non-enterprise ERP features outside Lakehouse ETL, Identity Federation, Index Tuning, and MDM packaging.

---

## Detailed Task Breakdown

### Phase 1: Regional Data Lakehouse ETL Engine

#### Task EMS-001: Apache Arrow / Parquet Writer Integration & Columnar Export Utility
- **Task ID:** EMS-001
- **Description:** Create the core Apache Arrow & Parquet export utility (`src/lib/lakehouse/parquet-writer.ts`). Implement stream-based record ingestion, memory-efficient columnar encoding (Snappy/ZSTD compression), and row-group buffering to convert TypeScript object arrays or DB cursor streams into valid Parquet binary buffers.
- **Files:**
  - `src/lib/lakehouse/parquet-writer.ts` [NEW]
  - `src/lib/lakehouse/types.ts` [NEW]
  - `package.json` [MODIFY — add `apache-arrow` and parquet writer dependencies if missing]
- **Dependencies:** None (foundational task for Phase 1)
- **Acceptance Criteria:**
  - `parquet-writer.ts` successfully converts JSON/DB row streams into valid Parquet binary data.
  - Supports primitive types (int32, int64, float64, string, boolean, timestamp) and nullability flags.
  - Compression mode (Snappy or ZSTD) is configurable via export options.
  - Memory consumption remains under 256MB when writing 100,000 records.
- **Verification Method:** Run `npx jest src/lib/__tests__/parquet-writer.test.ts` verifying binary header magic bytes (`PAR1`) and valid Parquet schema extraction.
- **Estimated Complexity:** Medium-High

#### Task EMS-002: Incremental Multi-Tenant ETL Engine & Partition Manager
- **Task ID:** EMS-002
- **Description:** Implement the high-throughput incremental ETL engine (`src/lib/lakehouse/etl-engine.ts`). Extract data from core domain tables (students, staff, attendance, fee_transactions, exam_results), filter by institution/tenant ID, format into partitioned directory structures (`tenant_id={id}/domain={domain}/year={yyyy}/month={mm}/`), and handle delta cursor sync based on updated_at timestamps.
- **Files:**
  - `src/lib/lakehouse/etl-engine.ts` [NEW]
  - `src/lib/lakehouse/partition-manager.ts` [NEW]
- **Dependencies:** EMS-001
- **Acceptance Criteria:**
  - `etl-engine.ts` executes incremental extraction based on high-watermark `updated_at` timestamps.
  - Generates partitioned directory hierarchies matching target data lakehouse conventions.
  - Enforces strict tenant isolation during extraction, ensuring no cross-tenant data leaks into export files.
  - Supports full snapshot exports and incremental delta exports.
- **Verification Method:** Run unit tests validating partition path generation and incremental delta record extraction.
- **Estimated Complexity:** High

#### Task EMS-003: Data Lakehouse Export Schema Definition & Evolution Manager
- **Task ID:** EMS-003
- **Description:** Create the Lakehouse Schema Evolution Manager (`src/lib/lakehouse/schema-manager.ts`). Define standardized Parquet schemas for core domain models, manage schema versioning (v1, v2), handle field additions/deprecations with backward compatibility, and ensure analytics engines (Spark/Trino) can query historical partitions seamlessly.
- **Files:**
  - `src/lib/lakehouse/schema-manager.ts` [NEW]
  - `src/lib/lakehouse/schemas/` [NEW — directory containing domain schema definitions: `student-schema.ts`, `attendance-schema.ts`, `finance-schema.ts`]
- **Dependencies:** EMS-001, EMS-002
- **Acceptance Criteria:**
  - Standardized schemas created for all core ERP domains.
  - Backward compatibility rules enforced (new fields default to nullable/optional; existing field types immutable).
  - Schema registry validates export payloads prior to Parquet serialization.
- **Verification Method:** Execute schema compatibility tests adding new optional attributes to domain schemas.
- **Estimated Complexity:** Medium

#### Task EMS-004: Data Lakehouse Database Tracking Schema & Admin API Routes
- **Task ID:** EMS-004
- **Description:** Add Drizzle ORM schema definitions for lakehouse export job tracking in `packages/db` and implement administrative API route handlers (`/api/admin/lakehouse/exports`, `/api/admin/lakehouse/jobs/[id]`). Support manual trigger, schedule status, export execution logging, and partition metadata queries.
- **Files:**
  - `packages/db/src/schema/lakehouse.ts` [NEW]
  - `packages/db/src/index.ts` [MODIFY — export lakehouse schema]
  - `src/db/schema.ts` [MODIFY — re-export lakehouse schema]
  - `src/app/api/admin/lakehouse/exports/route.ts` [NEW]
  - `src/app/api/admin/lakehouse/jobs/[id]/route.ts` [NEW]
- **Dependencies:** EMS-002, EMS-003
- **Acceptance Criteria:**
  - Drizzle tables `data_lakehouse_jobs` and `data_lakehouse_partitions` defined with proper indexes.
  - `requireAuth(handler, "lakehouse:manage")` permission wrapper applied to all API endpoints.
  - POST `/api/admin/lakehouse/exports` initiates an async export job and returns job metadata.
  - GET `/api/admin/lakehouse/jobs/[id]` returns execution progress, record counts, file size, and partition URIs.
- **Verification Method:** Execute API integration tests verifying endpoint status 200, RBAC 403 enforcement, and DB record persistence.
- **Estimated Complexity:** Medium

#### Task EMS-005: Regional Data Lakehouse Export Verification & Test Suite
- **Task ID:** EMS-005
- **Description:** Author comprehensive integration test suite (`src/lib/__tests__/data-lakehouse-integration.test.ts`) covering Parquet generation, incremental ETL execution, partition path verification, tenant boundary isolation, and error handling during transient storage failures.
- **Files:**
  - `src/lib/__tests__/data-lakehouse-integration.test.ts` [NEW]
- **Dependencies:** EMS-001, EMS-002, EMS-003, EMS-004
- **Acceptance Criteria:**
  - Test suite passes with 100% assertion success.
  - Verifies incremental sync extracts only modified records since last watermark.
  - Confirms Parquet outputs are valid and readable by columnar parsers.
  - Validates tenant isolation across generated partitions.
- **Verification Method:** Run `npx jest src/lib/__tests__/data-lakehouse-integration.test.ts`.
- **Estimated Complexity:** Medium

---

### Phase 2: SAML 2.0 & OIDC Enterprise Identity Federation

#### Task EMS-006: SAML 2.0 Service Provider (SP) Engine & IdP Metadata Parser
- **Task ID:** EMS-006
- **Description:** Implement SAML 2.0 SP service (`src/lib/auth/saml-service.ts`). Parse external IdP XML metadata (Azure AD, Okta, Ping Identity), generate SP XML metadata, construct SAML AuthnRequests, and validate incoming SAML Responses (X.509 signature verification, audience restriction, expiration time, InResponseTo nonce check).
- **Files:**
  - `src/lib/auth/saml-service.ts` [NEW]
  - `src/lib/auth/saml-types.ts` [NEW]
- **Dependencies:** None (foundational task for Phase 2)
- **Acceptance Criteria:**
  - Parses IdP XML metadata into structured provider configuration objects.
  - Generates valid SAML 2.0 SP metadata XML with signing/encryption certificates.
  - Validates SAML Responses using `xml-crypto` and X.509 certificate chains.
  - Rejects expired, tampered, or replayed SAML assertions with detailed security audit log entries.
- **Verification Method:** Run unit tests against sample Azure AD and Okta SAML response XML payloads.
- **Estimated Complexity:** High

#### Task EMS-007: OpenID Connect (OIDC) Relying Party (RP) Engine
- **Task ID:** EMS-007
- **Description:** Implement the OIDC RP service (`src/lib/auth/oidc-service.ts`). Support Discovery Document fetching (`/.well-known/openid-configuration`), Authorization Code Flow with PKCE (Proof Key for Code Exchange), ID token signature validation via JWKS (JSON Web Key Sets), and UserInfo endpoint user attribute retrieval.
- **Files:**
  - `src/lib/auth/oidc-service.ts` [NEW]
- **Dependencies:** None
- **Acceptance Criteria:**
  - Dynamically fetches IdP discovery metadata and JWKS keys.
  - Constructs authorization URLs with PKCE `code_challenge` (S256).
  - Exchanges authorization code for tokens and validates ID token signatures using `jose`.
  - Extracts standard OIDC claims (`sub`, `email`, `name`, `groups`, `roles`).
- **Verification Method:** Run unit tests mocking OIDC provider discovery and token exchange endpoints.
- **Estimated Complexity:** Medium-High

#### Task EMS-008: Federated User Mapping & Attribute-Based Access Control (ABAC) Router
- **Task ID:** EMS-008
- **Description:** Create the Federated User Mapper (`src/lib/auth/federated-user-mapper.ts`). Map incoming SAML/OIDC SAML attributes/claims to local user accounts, execute Just-In-Time (JIT) provisioning for new enterprise users, assign default tenant/institution roles based on enterprise directory attributes, and issue platform JWT tokens.
- **Files:**
  - `src/lib/auth/federated-user-mapper.ts` [NEW]
  - `packages/db/src/schema/saml.ts` [NEW — tables: `saml_providers`, `oidc_providers`, `federated_identity_mappings`]
  - `packages/db/src/index.ts` [MODIFY — export SAML schema]
  - `src/db/schema.ts` [MODIFY — re-export SAML schema]
- **Dependencies:** EMS-006, EMS-007
- **Acceptance Criteria:**
  - Maps external subject IDs (`sub` / `NameID`) to unique internal user records.
  - Auto-provisions new users on first login if JIT provisioning is enabled for the provider.
  - Dynamically maps SAML/OIDC role attributes to system roles (`super_admin`, `admin`, `principal`, `hod`, `staff`).
  - Mints valid platform JWT session cookie matching standard authentication contracts.
- **Verification Method:** Unit test mapping logic with various IdP attribute payload structures.
- **Estimated Complexity:** Medium-High

#### Task EMS-009: Identity Federation API Route Handlers
- **Task ID:** EMS-009
- **Description:** Implement full set of API route handlers for SAML 2.0 and OIDC endpoints. Create `/api/auth/saml/sso`, `/api/auth/saml/acs`, `/api/auth/saml/metadata`, `/api/auth/oidc/login`, and `/api/auth/oidc/callback`.
- **Files:**
  - `src/app/api/auth/saml/sso/route.ts` [NEW]
  - `src/app/api/auth/saml/acs/route.ts` [NEW]
  - `src/app/api/auth/saml/metadata/route.ts` [NEW]
  - `src/app/api/auth/oidc/login/route.ts` [NEW]
  - `src/app/api/auth/oidc/callback/route.ts` [NEW]
- **Dependencies:** EMS-006, EMS-007, EMS-008
- **Acceptance Criteria:**
  - `/api/auth/saml/metadata` serves SP metadata XML formatted with HTTP 200 and `application/xml` header.
  - `/api/auth/saml/sso` redirects user to IdP SSO URL with signed AuthnRequest.
  - `/api/auth/saml/acs` processes HTTP POST SAML response, validates signature, mints session, and redirects to dashboard.
  - `/api/auth/oidc/callback` exchanges PKCE code, validates ID token, provisions/maps user, and establishes session.
- **Verification Method:** Execute HTTP route integration tests mocking IdP callbacks and verifying set-cookie response headers.
- **Estimated Complexity:** Medium

#### Task EMS-010: Enterprise Identity Federation Security Audit & Verification Test Suite
- **Task ID:** EMS-010
- **Description:** Author comprehensive security audit test suite (`src/lib/__tests__/saml-oidc-security.test.ts`) verifying signature verification enforcement, XML entity expansion (XXE) protection, replay attack prevention, assertion clock skew boundaries, and invalid claim rejection.
- **Files:**
  - `src/lib/__tests__/saml-oidc-security.test.ts` [NEW]
- **Dependencies:** EMS-006, EMS-007, EMS-008, EMS-009
- **Acceptance Criteria:**
  - Test suite passes with 100% assertion success.
  - Verifies rejection of tampered SAML assertions (invalid signature).
  - Verifies rejection of replayed nonces.
  - Confirms JIT provisioning creates user with correct tenant boundaries.
- **Verification Method:** Run `npx jest src/lib/__tests__/saml-oidc-security.test.ts`.
- **Estimated Complexity:** Medium

---

### Phase 3: Automated Database Index Auto-Tuning Engine

#### Task EMS-011: PostgreSQL Query Performance & Index Usage Analytics Extractor
- **Task ID:** EMS-011
- **Description:** Create the database index query analyzer (`src/lib/database/index-analyzer.ts`). Inspect PostgreSQL system views (`pg_stat_statements`, `pg_stat_user_tables`, `pg_stat_user_indexes`) to identify high-frequency sequential scans, slow queries (>200ms execution time), missing index candidates, and unused/redundant indexes.
- **Files:**
  - `src/lib/database/index-analyzer.ts` [NEW]
  - `src/lib/database/types.ts` [NEW]
- **Dependencies:** None (foundational task for Phase 3)
- **Acceptance Criteria:**
  - Safely queries system stats without blocking operational database queries.
  - Identifies tables with high sequential scan counts relative to index scans.
  - Generates recommended index DDL definitions (e.g. `CREATE INDEX idx_student_attendance_date ON student_attendance (institution_id, date)`).
  - Detects unused indexes with zero scans for potential deprecation.
- **Verification Method:** Execute unit tests against simulated `pg_stat_statements` query plan statistics.
- **Estimated Complexity:** Medium-High

#### Task EMS-012: Automated Index Recommendation & Risk-Weighted Execution Engine
- **Task ID:** EMS-012
- **Description:** Implement the index auto-tuning execution engine (`src/lib/database/index-auto-tuner.ts`). Evaluate recommended index candidates against safety thresholds, perform `EXPLAIN (FORMAT JSON)` validation, assign risk levels (Low, Medium, High), and execute approved DDL commands using `CREATE INDEX CONCURRENTLY` with `lock_timeout = '2s'`.
- **Files:**
  - `src/lib/database/index-auto-tuner.ts` [NEW]
  - `packages/db/src/schema/index-tuning.ts` [NEW — tables: `index_tuning_recommendations`, `index_tuning_logs`]
  - `packages/db/src/index.ts` [MODIFY — export index tuning schema]
  - `src/db/schema.ts` [MODIFY — re-export index tuning schema]
- **Dependencies:** EMS-011
- **Acceptance Criteria:**
  - All index creation commands strictly use `CONCURRENTLY` keyword to prevent table lock contention.
  - Enforces `SET LOCAL lock_timeout = '2s'` prior to execution; aborts gracefully if lock cannot be acquired.
  - Logs all index creations, drop actions, execution durations, and performance impact metrics in `index_tuning_logs`.
  - Supports dry-run analysis mode.
- **Verification Method:** Execute integration tests asserting generated SQL statements contain `CONCURRENTLY` and lock timeout guards.
- **Estimated Complexity:** High

#### Task EMS-013: Index Auto-Tuning Management API Routes & Control Dashboard
- **Task ID:** EMS-013
- **Description:** Create API route handlers for database index auto-tuning administration (`/api/admin/database/index-tuning/analyze`, `/api/admin/database/index-tuning/apply`, `/api/admin/database/index-tuning/history`).
- **Files:**
  - `src/app/api/admin/database/index-tuning/analyze/route.ts` [NEW]
  - `src/app/api/admin/database/index-tuning/apply/route.ts` [NEW]
  - `src/app/api/admin/database/index-tuning/history/route.ts` [NEW]
- **Dependencies:** EMS-011, EMS-012
- **Acceptance Criteria:**
  - All endpoints wrapped with `requireAuth(handler, "database:admin")`.
  - GET `/analyze` returns current index recommendations with query performance metrics and estimated impact.
  - POST `/apply` triggers concurrent index creation for selected recommendation IDs.
  - GET `/history` returns historical index tuning executions and performance deltas.
- **Verification Method:** Execute HTTP route integration tests validating JSON response structure and permission checks.
- **Estimated Complexity:** Medium

#### Task EMS-014: Index Auto-Tuning Safety Guards & Rollback Execution Test Suite
- **Task ID:** EMS-014
- **Description:** Author safety and rollback test suite (`src/lib/__tests__/index-tuning-safety.test.ts`) testing lock timeout aborts, syntax validation, duplicate index prevention, and index drop rollback functionality.
- **Files:**
  - `src/lib/__tests__/index-tuning-safety.test.ts` [NEW]
- **Dependencies:** EMS-011, EMS-012, EMS-013
- **Acceptance Criteria:**
  - Test suite passes with 100% assertion success.
  - Verifies that lock timeout failure does not corrupt database state or leave invalid indexes.
  - Validates `CONCURRENTLY` DDL generation across single-column and composite index definitions.
- **Verification Method:** Run `npx jest src/lib/__tests__/index-tuning-safety.test.ts`.
- **Estimated Complexity:** Medium

---

### Phase 4: Enterprise MDM Deployment & App Wrapping Certification

#### Task EMS-015: Microsoft Intune & Enterprise MDM App Configuration Profile Generator
- **Task ID:** EMS-015
- **Description:** Create the Enterprise MDM profile generator (`src/lib/mdm/config-generator.ts`). Generate XML App Configuration profiles for Microsoft Intune (`AppConfig`) and Apple Mobile Device Management (`.mobileconfig`), encoding server endpoints, tenant IDs, certificate pins, and security enforcement parameters.
- **Files:**
  - `src/lib/mdm/config-generator.ts` [NEW]
  - `src/lib/mdm/types.ts` [NEW]
  - `packages/db/src/schema/mdm.ts` [NEW — tables: `mdm_profiles`, `mdm_enrolled_devices`]
  - `packages/db/src/index.ts` [MODIFY — export MDM schema]
  - `src/db/schema.ts` [MODIFY — re-export MDM schema]
- **Dependencies:** None (foundational task for Phase 4)
- **Acceptance Criteria:**
  - Generates compliant Microsoft Intune AppConfig XML schemas.
  - Generates valid Apple `.mobileconfig` XML payloads signed with enterprise certificates.
  - Configures dynamic runtime parameters (`server_url`, `tenant_key`, `force_passcode`, `allow_export`).
- **Verification Method:** Unit test XML outputs against Microsoft Intune & Apple MDM schema specifications.
- **Estimated Complexity:** Medium

#### Task EMS-016: Enterprise MDM Zero-Touch Enrollment & Verification API
- **Task ID:** EMS-016
- **Description:** Implement MDM enrollment and verification API route handlers (`/api/mobile/mdm/enroll`, `/api/mobile/mdm/verify`). Process device hardware serials/UUIDs, validate organization enrollment tokens, register devices in `mdm_enrolled_devices`, and issue enterprise app provisioning keys.
- **Files:**
  - `src/app/api/mobile/mdm/enroll/route.ts` [NEW]
  - `src/app/api/mobile/mdm/verify/route.ts` [NEW]
- **Dependencies:** EMS-015
- **Acceptance Criteria:**
  - Endpoint validates enrollment authorization tokens issued by enterprise admins.
  - Binds device serial number / hardware UUID to tenant ID in `mdm_enrolled_devices`.
  - Rejects unauthorized or revoked device IDs with HTTP 403.
- **Verification Method:** HTTP integration tests verifying device enrollment and token verification responses.
- **Estimated Complexity:** Medium

#### Task EMS-017: Mobile MDM Managed Configuration Client Integration (Flutter)
- **Task ID:** EMS-017
- **Description:** Implement Flutter mobile companion managed configuration client service (`mobile/lib/features/mdm/services/mdm_config_service.dart`). Read runtime platform managed configurations via Android `RestrictionsManager` and iOS `UserDefaults` managed keys, enforcing tenant restrictions and auto-configuring server URLs on app launch.
- **Files:**
  - `mobile/lib/features/mdm/services/mdm_config_service.dart` [NEW]
  - `mobile/lib/features/mdm/models/mdm_config.dart` [NEW]
  - `mobile/lib/main.dart` [MODIFY — initialize MDM config service on launch]
- **Dependencies:** EMS-015, EMS-016
- **Acceptance Criteria:**
  - Service reads native OS managed configuration keys on startup without blocking main UI.
  - Pre-populates login server URL and institution tenant key from MDM policy.
  - Restricts unauthorized data export actions if MDM policy `allow_export` is false.
- **Verification Method:** Execute Flutter unit tests mocking native platform channel responses for managed configurations.
- **Estimated Complexity:** Medium-High

---

### Phase 5: E2E Integration, Hardening & Certification

#### Task EMS-018: Multi-Tenant Enterprise Scale & Lakehouse Performance Benchmark Test Suite
- **Task ID:** EMS-018
- **Description:** Author performance benchmark test suite (`src/lib/__tests__/sprint-016-performance.test.ts`) validating Parquet export throughput (>100 MB/s), SAML/OIDC authentication flow latency (<2 seconds), and concurrent index execution stability under load.
- **Files:**
  - `src/lib/__tests__/sprint-016-performance.test.ts` [NEW]
- **Dependencies:** EMS-005, EMS-010, EMS-014, EMS-016
- **Acceptance Criteria:**
  - All performance assertions pass under simulated multi-tenant load.
  - Parquet export processes 500,000 records in <5 seconds.
  - SAML response processing completes in <500ms.
- **Verification Method:** Run `npx jest src/lib/__tests__/sprint-016-performance.test.ts`.
- **Estimated Complexity:** Medium

#### Task EMS-019: Enterprise Security Invariants & Cross-Tenant Isolation Audit Test Suite
- **Task ID:** EMS-019
- **Description:** Author comprehensive security audit test suite (`src/lib/__tests__/sprint-016-security-audit.test.ts`) enforcing zero cross-tenant data leakage across data lakehouse exports, SAML/OIDC session isolation, and MDM enrollment validation.
- **Files:**
  - `src/lib/__tests__/sprint-016-security-audit.test.ts` [NEW]
- **Dependencies:** EMS-005, EMS-010, EMS-014, EMS-016
- **Acceptance Criteria:**
  - 100% security invariants verified.
  - Confirms tenant A credentials cannot trigger or access tenant B lakehouse exports.
  - Confirms SAML assertion bound to tenant A cannot authenticate user into tenant B.
- **Verification Method:** Run `npx jest src/lib/__tests__/sprint-016-security-audit.test.ts`.
- **Estimated Complexity:** Medium-High

#### Task EMS-020: Architecture Guide & Sprint-016 Release Certification Documentation
- **Task ID:** EMS-020
- **Description:** Author comprehensive architecture guide (`docs/enterprise-multi-tenant-lakehouse-guide.md`) detailing Data Lakehouse ETL setup, SAML/OIDC federation configuration, Database Index Auto-Tuning runbooks, and MDM deployment procedures. Update AIOS documentation (`.ai/FEATURES.md`, `.ai/CHANGELOG.md`, `.ai/PROJECT_STATUS.md`).
- **Files:**
  - `docs/enterprise-multi-tenant-lakehouse-guide.md` [NEW]
  - `.ai/FEATURES.md` [MODIFY — register Sprint-016 features]
  - `.ai/CHANGELOG.md` [MODIFY — log v3.0.0 release changes]
  - `.ai/PROJECT_STATUS.md` [MODIFY — update sprint completion status]
- **Dependencies:** EMS-001 through EMS-019
- **Acceptance Criteria:**
  - Comprehensive guide published covering setup, troubleshooting, and enterprise runbooks.
  - `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` fully updated.
  - Build passes clean (`npx tsc --noEmit` 0 errors, ESLint clean).
- **Verification Method:** Inspect generated documentation files and verify clean build status.
- **Estimated Complexity:** Medium

---

## Task Summary Table

| Task ID | Component / Area | Dependencies | Est. Complexity | Target Deliverable |
| :--- | :--- | :--- | :--- | :--- |
| **EMS-001** | Data Lakehouse ETL | None | Medium-High | Apache Arrow / Parquet Writer Utility (`parquet-writer.ts`) |
| **EMS-002** | Data Lakehouse ETL | EMS-001 | High | Multi-Tenant Incremental ETL Engine (`etl-engine.ts`) |
| **EMS-003** | Data Lakehouse ETL | EMS-001, EMS-002 | Medium | Schema Evolution Manager & Domain Schemas |
| **EMS-004** | Data Lakehouse ETL | EMS-002, EMS-003 | Medium | Lakehouse DB Tracking Schema & Admin API Routes |
| **EMS-005** | Data Lakehouse ETL | EMS-001..EMS-004 | Medium | Lakehouse Export Verification Test Suite |
| **EMS-006** | Identity Federation | None | High | SAML 2.0 SP Service & Metadata Parser (`saml-service.ts`) |
| **EMS-007** | Identity Federation | None | Medium-High | OIDC RP Service & PKCE Handler (`oidc-service.ts`) |
| **EMS-008** | Identity Federation | EMS-006, EMS-007 | Medium-High | Federated User Mapper & ABAC Engine |
| **EMS-009** | Identity Federation | EMS-006..EMS-008 | Medium | SAML 2.0 & OIDC SSO Route Handlers |
| **EMS-010** | Identity Federation | EMS-006..EMS-009 | Medium | Federation Security Audit Test Suite |
| **EMS-011** | DB Index Auto-Tuning | None | Medium-High | PostgreSQL Performance Analyzer (`index-analyzer.ts`) |
| **EMS-012** | DB Index Auto-Tuning | EMS-011 | High | Non-Blocking Concurrent Index Tuner (`index-auto-tuner.ts`) |
| **EMS-013** | DB Index Auto-Tuning | EMS-011, EMS-012 | Medium | Index Auto-Tuning Admin API Routes |
| **EMS-014** | DB Index Auto-Tuning | EMS-011..EMS-013 | Medium | Index Tuning Safety Guards Test Suite |
| **EMS-015** | Enterprise MDM | None | Medium | Intune & Apple MDM Profile Generator (`config-generator.ts`) |
| **EMS-016** | Enterprise MDM | EMS-015 | Medium | MDM Zero-Touch Enrollment & Verification API |
| **EMS-017** | Enterprise MDM | EMS-015, EMS-016 | Medium-High | Flutter Managed Configuration Client Service |
| **EMS-018** | Integration & Hardening | EMS-005,010,014,016 | Medium | Multi-Tenant Performance Benchmark Test Suite |
| **EMS-019** | Integration & Hardening | EMS-005,010,014,016 | Medium-High | Cross-Tenant Security Audit Test Suite |
| **EMS-020** | Documentation & Release| EMS-001..EMS-019 | Medium | Architecture Guide & Release Certification |

---

## Verification Plan & Test Strategy

### Automated Unit & Integration Tests

1. **Data Lakehouse Pipeline Tests (`data-lakehouse-integration.test.ts`):**
   - Verify stream serialization into valid Parquet files.
   - Assert partition directory structure matches `tenant_id={id}/domain={domain}/year={yyyy}/month={mm}/`.
   - Confirm incremental sync extracts only modified records since last execution watermark.

2. **Identity Federation Tests (`saml-oidc-security.test.ts`):**
   - Test SAML Response XML signature validation with valid and tampered certificates.
   - Test OIDC PKCE code exchange and ID token JWKS signature verification.
   - Assert JIT user creation assigns correct tenant ID and ABAC roles.

3. **Index Auto-Tuning Safety Tests (`index-tuning-safety.test.ts`):**
   - Confirm all generated DDL statements contain `CONCURRENTLY`.
   - Verify `lock_timeout = '2s'` aborts index creation gracefully under artificial lock contention.

4. **MDM Enrollment & Config Tests (`mdm-config-generator.test.ts`):**
   - Validate Microsoft Intune XML and Apple `.mobileconfig` output format.
   - Test Flutter MDM service parsing managed configuration payloads.

### Security Verification

- **Tenant Isolation Guard:** Verify zero data leakage across multi-tenant lakehouse partitions and federated login flows.
- **SAML XML Security:** Ensure XXE protection (disallow inline DTDs) and replay protection (nonce expiration).
- **RBAC API Protection:** Ensure all admin API routes (`/api/admin/lakehouse/*`, `/api/admin/database/index-tuning/*`) require explicit high-level permissions.

### Performance Verification

- **Export Throughput:** Parquet export pipeline must achieve >100 MB/s file writing throughput.
- **SSO Latency:** SAML and OIDC authentication flows must complete in under 2 seconds.
- **Index Creation Non-Blocking:** `CREATE INDEX CONCURRENTLY` must not cause blocked query timeouts on primary transactional endpoints.

---

## Risks & Mitigation Matrix

| Risk Scenario | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Parquet Memory Exhaustion** | High | Medium | Implement streaming chunk buffers (10,000 rows/slice) with backpressure controls. |
| **SAML XML Signature Malleability** | High | Low | Enforce strict schema validation and X.509 certificate chain validation using `xml-crypto`. |
| **PostgreSQL Lock Contention during Indexing** | Medium | Medium | Use `CREATE INDEX CONCURRENTLY` with `lock_timeout = '2s'` during low-traffic windows. |
| **MDM Platform Incompatibility** | Medium | Low | Generate standardized XML schemas compliant with Apple MC Specs & Intune AppConfig standard. |

---

## Rollback & Contingency Plan

1. **Data Lakehouse Pipeline:** If Parquet export pipeline encounters storage failures, the ETL job status transitions to `FAILED` in `data_lakehouse_jobs`, leaving existing operational database records completely untouched.
2. **Identity Federation:** If SAML/OIDC federation encounters IdP connectivity issues, standard email/password authentication remains active as fallback for authorized administrators.
3. **Database Index Auto-Tuning:** If a concurrently created index degrades query execution plans, the auto-tuner issues `DROP INDEX CONCURRENTLY idx_name` automatically without locking table writes.
4. **MDM Deployment:** If MDM configuration payload parsing fails on mobile devices, the app falls back to manual server URL entry with audit logging.

---

## Definition of Done

This sprint is certified **COMPLETE** when all the following AIOS v3.0 criteria are satisfied:

1. **Implementation Complete:** All 20 tasks (EMS-001 through EMS-020) implemented without placeholders or incomplete stubs.
2. **Build & Type Safety:** Clean compilation with zero TypeScript errors (`npx tsc --noEmit`) and zero ESLint errors.
3. **Test Suite Coverage:** All 5 new test suites pass with 100% pass rate, maintaining total codebase pass rate across all suites.
4. **Security & Performance:** Verified zero cross-tenant data leakage, SAML/OIDC security audit passed, and Parquet export throughput targets met.
5. **Documentation Updated:** `docs/enterprise-multi-tenant-lakehouse-guide.md`, `.ai/FEATURES.md`, `.ai/CHANGELOG.md`, and `.ai/PROJECT_STATUS.md` fully updated.
