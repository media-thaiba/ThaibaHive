# AI_OPERATING_SYSTEM.md — The AI Operating System Architecture (AIOS X.0)

> **Specification Tier**: Meta-Architecture System Layer (AIOS X.0)  
> **Source of Truth**: `.ai/meta/AI_OPERATING_SYSTEM.md`  
> **System Classification**: Self-Evolving AI Engineering Knowledge Architecture

---

## 1. Executive Definition & Purpose

**AIOS X.0 (The Self-Evolving AI Knowledge System)** is the permanent meta-layer governing all present and future AI coding agents (Claude, Gemini, Qoder, Antigravity, Copilot, ChatGPT, etc.) working on **ThaibaHive Institution OS**.

It operates as an *Operating System for AI Agents*, providing:
1. **Deterministic Context Loading**: Standardized, deterministic retrieval of exact specification files required for any engineering task.
2. **Authority Hierarchy & Precedence**: Clear rules resolving conflicts between business rules, engineering standards, and ADRs.
3. **Self-Evolving Knowledge Memory**: Safe, governed mechanisms to incorporate postmortems, ADRs, and lessons learned into `.ai/` without breaking existing architecture.
4. **Zero Architectural Drift**: Guaranteeing that every code commit, PR, refactor, and release remains 100% compliant with AIOS 3.0–9.0 specifications.

---

## 2. Knowledge Layer Precedence & Decision Hierarchy

When an AI agent encounters ambiguous requirements or competing implementation choices, decisions MUST adhere strictly to the following **Precedence Hierarchy**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LEVEL 1: AIOS 3.0 & 05_AI_RULES.md (CONSTITUTION)              │
│  - 100 Non-negotiable architectural rules, core vision, security & privacy mandates    │
└───────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LEVEL 2: AIOS 8.0 & 08_DECISION_LOG.md (ADRs & DOD)              │
│  - Recorded ADR decisions, engineering standards, Definition of Done                  │
└───────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LEVEL 3: AIOS 4.0 & AIOS 5.0 (DOMAINS & DATABASE/APIS)          │
│  - Domain business specifications, table schemas, REST API contracts, permissions     │
└───────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LEVEL 4: AIOS 6.0 & AIOS 7.0 (IMPLEMENTATION & GOVERNANCE)      │
│  - Monorepo package boundaries, shared services, product roadmaps, quality gates      │
└───────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LEVEL 5: AIOS 9.0 & AIOS X.0 (QUALITY & META-LEARNING)          │
│  - Certification scorecards, lessons learned, postmortem library, pattern catalog     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# KNOWLEDGE_ARCHITECTURE.md — Knowledge Dependency & Cross-Reference Structure

> **Specification Tier**: Meta-Architecture System Layer (AIOS X.0)  
> **Source of Truth**: `.ai/meta/KNOWLEDGE_ARCHITECTURE.md`

---

## 1. Knowledge Layer Mapping

```
AIOS 3.0 (Foundation) ───────► AIOS 3.1 (Operational Intelligence)
         │                                   │
         ▼                                   ▼
AIOS 4.0 (Enterprise ERP Bible) ───► AIOS 5.0 (Physical Database & APIs)
         │                                   │
         ▼                                   ▼
AIOS 6.0 (Implementation Blueprint)► AIOS 7.0 (Governance & Evolution)
         │                                   │
         ▼                                   ▼
AIOS 8.0 (Engineering Playbooks) ──► AIOS 9.0 (Validation & Certification)
                                             │
                                             ▼
                                  AIOS X.0 (Meta-Architecture System)
```

## 2. Cross-Reference Integrity Rules
* AI agents MUST NOT cite informal chat history or external assumptions when an explicit `.ai/` document exists.
* All PR descriptions, ADRs, and technical plans MUST explicitly cite source file paths (e.g., `Ref: .ai/domains/07-fee-management.md`).
