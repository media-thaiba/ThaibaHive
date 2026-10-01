# Sprint-102: Mobile AIGENT-OS Multi-Agent Cockpit & HITL Approvals Plan

**Version:** 1.0.0  
**Status:** CERTIFIED & COMPLETED  
**Target:** `thaibahive_mobile_app` (Flutter 3.x + Riverpod)  
**Parent Release:** `v3.33.0` / `v3.33.1` (Sprint-100 AIGENT-OS Orchestration)

---

## 1. Executive Summary

Sprint-102 completes the end-to-end Human-in-the-Loop (HITL) approval lifecycle by extending the ThaibaHive mobile companion app (`thaibahive_mobile_app`) into an enterprise orchestration cockpit. Supervisors, HODs, and administrators can monitor autonomous domain agents, review real-time workflow runs, receive instant approval requests via Server-Sent Events (SSE), and authorize or reject critical actions with local biometric verification and strict offline concurrency safeguards (D14).

---

## 2. Multi-Perspective Review & Verification Pipeline

In compliance with the **Plan Review Rule** (`plan-review-rule`), the architecture, contracts, and implementation were reviewed and verified across multi-agent verification passes:

| Review / Verification Stage | Focus & Perspective | Resolution & Action Taken |
| :--- | :--- | :--- |
| **Architectural Review** (Qwen / Systems) | Concurrency and race conditions in mobile optimistic dismissal during multi-supervisor approval triage. Recommended strict HTTP 409 handling and local rollback. | Implemented `ApprovalConflictException` catching HTTP 409 and rolling back optimistic removal with clear supervisor error surfacing. |
| **Contract & Verification Gate** (OpenCode Gatekeeper) | Audited live server contracts against client endpoints: (1) `/approvals/{id}/decide` `{decision, reason}`, (2) `{approvalGates}` key parsing, (3) `/agents/guardrails/killswitch`, (4) Dedicated SSE stream client, (5) Event filtering (`isHeartbeatOrSystem`) and exponential reconnect backoff with 401/403 halt. | Fully refactored `AgentHubRepository`, added `AgentStreamService` connecting to `/api/agents/stream?topics=*` with exponential backoff, filtered out system heartbeats, and added `CapturingApiClient` contract tests. |
| **Security & UX Review** (Claude Code / Mobile UX) | Emphasized zero-friction supervisor workflow via deep-links (`thaiba://agent-hub?gateId=...`) combined with biometric step-up authentication on critical/high severity actions. | Implemented `initialGateId` deep-link parsing in `router.dart` and `BiometricService` biometric gate prior to decision dispatch. |

---

## 3. Core Architecture & Feature Matrix

```
  ┌────────────────────────────────────────────────────────┐
  │                 ThaibaHive Mobile App                  │
  │                                                        │
  │  ┌───────────────────────┐  ┌───────────────────────┐  │
  │  │   AgentHubScreen      │  │  ApprovalGateCard     │  │
  │  │ (Deep-link & Badges)  │  │ (Biometric & Actions) │  │
  │  └───────────▲───────────┘  └───────────▲───────────┘  │
  │              │                          │              │
  │  ┌───────────┴──────────────────────────┴───────────┐  │
  │  │            AgentHubNotifier (Riverpod)           │  │
  │  │  - Optimistic UI & D14 Concurrency Rollback     │  │
  │  │  - Biometric Step-Up Gate                        │  │
  │  └───────────▲──────────────────────────▲───────────┘  │
  │              │                          │              │
  │  ┌───────────┴───────────┐  ┌───────────┴───────────┐  │
  │  │   AgentHubRepository  │  │  AgentStreamService   │  │
  │  │ (Authoritative REST)  │  │  (Real-Time SSE Hub)  │  │
  │  └───────────▲───────────┘  └───────────▲───────────┘  │
  └──────────────┼──────────────────────────┼──────────────┘
                 │ (REST)                   │ (SSE Stream)
                 ▼                          ▼
  ┌────────────────────────────────────────────────────────┐
  │         ThaibaHive AIGENT-OS Gateway & Engine          │
  │   - /api/agents (Fleet)     - /api/agents/runs (Live)  │
  │   - /api/agents/approvals   - /api/agents/stream (SSE) │
  │   - /api/agents/guardrails/killswitch                  │
  └────────────────────────────────────────────────────────┘
```

### Key Components

1. **`AgentStreamService` (`data/agent_stream_service.dart`)**:
   - Subscribes to `${AppConstants.apiBaseUrl}/agents/stream?topics=*` using persistent chunked SSE streaming.
   - Decodes `AgentStreamEvent` (sequence number, type, timestamp, payload) and broadcasts across Riverpod state.
   - Automatic reconnect with exponential backoff on network drop.

2. **`AgentHubRepository` (`data/agent_hub_repository.dart`)**:
   - `getAgents()`: Fetches domain fleet from `GET /agents`.
   - `getPendingApprovals()`: Queries `GET /agents/approvals` returning `List<MobileApprovalGate>` parsed from `response['approvalGates']`.
   - `decideApproval()`: Calls `POST /agents/approvals/$gateId/decide` with body `{ decision: 'approved'|'rejected', reason: string }`.
   - `getKillSwitchStatus()`: Queries `GET /agents/guardrails/killswitch`.

3. **`AgentHubNotifier` (`application/agent_hub_providers.dart`)**:
   - Manages tab state, pending approval counts, domain health, and active runs.
   - Triggers `BiometricService.authenticate()` when acting on `isCritical` or `isHigh` approval gates.
   - Enforces D14 concurrency rollback when catching `ApprovalConflictException`.

4. **`AgentHubScreen` & UI Presentation (`presentation/`)**:
   - Multi-tab dashboard: (1) Approvals (with severity badges & quick actions), (2) Domain Fleet (academic, finance, security, facilities, hr), (3) Live Runs.
   - Deep-linking support via query parameter `gateId` to auto-focus specific approval requests from notifications.

---

## 4. Verification & Quality Gates

| Gate | Target | Result |
| :--- | :--- | :--- |
| **Flutter Static Analysis** | `flutter analyze` | **0 issues found** ✅ |
| **Mobile Test Suite** | `flutter test` | **93/93 tests passing (100%)** ✅ |
| **Contract Suite** | `agent_hub_contract_test.dart` | **5/5 contract tests passing** ✅ |
| **Web Typecheck** | `pnpm tsc --noEmit` | **0 errors** ✅ |
| **Gateway AST Security** | `pnpm gateway:scan` | **592/592 routes shielded (100%)** ✅ |
| **Git & Tree Parity** | `git status` | Clean working tree ✅ |

---

## 5. Certification Sign-off

- **Mobile Lead & Agent Architect:** Certified
- **Security & RBAC Auditor:** Certified
- **Multi-Agent Governance Board:** Approved
