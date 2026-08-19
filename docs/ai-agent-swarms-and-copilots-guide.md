# ThaibaHive v2.3.0 — AI Agent Swarms & Cross-Regional Copilots Architecture Guide

## Overview

ThaibaHive v2.3.0 introduces autonomous enterprise multi-agent copilot swarms, Redis-backed distributed state management, and time-series financial decomposition.

---

## 1. Copilot Swarm Architecture

The system features three specialized AI Copilot Agents operating under the `AgentSwarmOrchestrator` and `AgentReasoningEngine`:

1. **Academic Advisor Copilot Agent (`agent_academic_advisor`):** Evaluates exam score trajectories, attendance rates, and absenteeism alerts to generate personalized academic intervention plans.
2. **Financial Controller Copilot Agent (`agent_financial_controller`):** Monitors fee realization rates, unspent departmental funds, and revenue risks, generating budget reallocations and gating high-deficit recommendations (>15%) for human administrative review.
3. **Regional Compliance Auditor Copilot Agent (`agent_compliance_auditor`):** Validates campus compliance scorecards, WORM audit vault hash chain integrity, and staff privacy re-certifications.

---

## 2. Human-in-the-Loop Gating Thresholds

- **Confidence Score &ge; 0.85:** Automatically assigned `humanApprovalStatus: "AUTO_EXECUTE"`.
- **Confidence Score &lt; 0.85:** Assigned `humanApprovalStatus: "REQUIRES_HUMAN_APPROVAL"`, holding execution until explicit administrator review via Web UI or API.

---

## 3. Redis Distributed State & Resilient Fallbacks

State is managed by `RedisStateManager` with tenant key namespacing (`thaiba:tenant:<tenant_id>:*`).
- **Distributed Circuit Breakers:** Monitors failure counters for copilot features (`copilot_query`). Automatically trips to `OPEN` state upon 5 consecutive failures.
- **Request Deduplication:** Enforces unique request execution using atomic Redis keys.
- **Automatic Fallback:** Automatically switches to `InMemoryStateAdapter` in case of Redis cluster offline status or network degradation.

---

## 4. Time-Series Financial Decomposition

The `TimeSeriesDecompositionEngine` executes additive STL decomposition:
$$Y[t] = T[t] + S[t] + R[t]$$
- **$T[t]$ (Trend):** Centered moving-average trend extraction.
- **$S[t]$ (Seasonal):** Normalized periodic cycle pattern.
- **$R[t]$ (Residual):** Detrended noise monitored for 3-sigma statistical anomalies ($\ge 2.5\sigma$).

---

## 5. Web UI & Mobile Companion Workspaces

- **Main Copilot Workspace:** `/admin/ai-copilots`
- **Time-Series Analytics Center:** `/admin/ai-copilots/financial-decomposition`
- **Swarm Governance Hub:** `/admin/ai-copilots/swarm-governance`
- **Mobile Flutter Companion:** `CopilotRecommendationsScreen` in `thaibahive_mobile_app`.
