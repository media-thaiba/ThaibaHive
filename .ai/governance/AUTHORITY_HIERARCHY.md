# AUTHORITY_HIERARCHY.md — Official Precedence & Conflict Resolution Decision Tree

> **Specification Tier**: Final Governance Pass & Consolidation  
> **Source of Truth**: `.ai/governance/AUTHORITY_HIERARCHY.md`

---

## 1. Official Precedence Decision Tree

When two specification documents appear to conflict, AI agents and human engineers MUST resolve the conflict using the following decision tree:

```
                               ┌────────────────────────────────────────┐
                               │     CONFLICT EVALUATION INITIATED      │
                               └───────────────────┬────────────────────┘
                                                   │
                                                   ▼
                               ┌────────────────────────────────────────┐
                               │ Is the conflict governed by Level 1    │
                               │ Constitution (.ai/05_AI_RULES.md)?     │
                               └─────────┬────────────────────┬─────────┘
                                         │ YES                │ NO
                                         ▼                    ▼
                           ┌────────────────────────┐  ┌────────────────────────────────────────┐
                           │ LEVEL 1 PREVAILS       │  │ Is the conflict governed by Level 2    │
                           │ (.ai/05_AI_RULES.md)   │  │ ADRs (.ai/08_DECISION_LOG.md)?         │
                           └────────────────────────┘  └─────────┬────────────────────┬─────────┘
                                                                 │ YES                │ NO
                                                                 ▼                    ▼
                                                   ┌────────────────────────┐  ┌────────────────────────────────────────┐
                                                   │ LEVEL 2 PREVAILS       │  │ Does it involve DB/API Physical Real? │
                                                   │ (.ai/08_DECISION_LOG)  │  └─────────┬────────────────────┬─────────┘
                                                   └────────────────────────┘            │ YES                │ NO
                                                                                         ▼                    ▼
                                                                           ┌────────────────────────┐  ┌────────────────────────┐
                                                                           │ LEVEL 3 PREVAILS       │  │ LEVEL 4/5 PREVAILS      │
                                                                           │ (.ai/database & apis)  │  │ (Implementation/Quality│
                                                                           └────────────────────────┘  └────────────────────────┘
```

---

# CANONICAL_SOURCE_REGISTRY.md — Single Source of Truth Registry

| Architectural Concept | Canonical Source Document | Owner Domain |
| :--- | :--- | :--- |
| **Authentication & Tokens** | `.ai/apis/identity.md` & `@thaiba/auth` | Security |
| **RBAC Permissions Matrix** | `.ai/permissions.md` & `packages/auth/roles.ts` | Security |
| **Institution Scoping** | `.ai/database/TENANCY_MODEL.md` | Architecture |
| **Biometric Encryption** | `.ai/domains/01-identity.md` & `.ai/security/database-security.md` | Security |
| **Fee Collection & Receipts**| `.ai/domains/07-fee-management.md` & `.ai/apis/fees.md` | Finance |
| **Attendance Registers** | `.ai/domains/05-attendance.md` & `.ai/events/attendance.events.md` | Academics |
| **100 Automation Recipes** | `.ai/automation/recipes.md` | Engineering |
| **UI Design System Tokens** | `.ai/07_DESIGN_SYSTEM.md` & `src/app/globals.css` | UX |
| **Engineering DoD** | `.ai/engineering/DEFINITION_OF_DONE.md` | Engineering |
| **Meta AI Reasoning** | `.ai/meta/AI_REASONING_MODEL.md` | AI |

---

# DOCUMENT_OWNERSHIP.md & CROSS_REFERENCE_INDEX.md

* **Document Owners**: Architecture Review Board (Architecture), Chief Product Officer (Product), Lead Software Architect (Engineering), Chief Information Security Officer (Security), UX Director (UX), AI Systems Lead (AI).
* **Cross-Reference Integrity**: All concept definitions resolve to their exact canonical source file listed in `CANONICAL_SOURCE_REGISTRY.md`.
