# PRODUCT_PRINCIPLES.md — Tenets of Product Design

> **Specification Tier**: Strategic Governance Framework (AIOS 7.0)  
> **Source of Truth**: `.ai/governance/PRODUCT_PRINCIPLES.md`

1. **Human First, Database Second**: Design software for people executing daily intents, not as data entry interfaces for database tables.
2. **Experience Before Administration**: Prioritize role-based Workspaces over massive 60-link navigation menus.
3. **Ambient AI Assists, Humans Decide**: AI proposes pre-filled drafts and predictive alerts; humans approve irreversible financial or identity mutations.
4. **Never Surprise Users**: Ensure consistent UI patterns, clear loading skeletons, and non-destructive action confirmations across all screens.
5. **Privacy & Security by Default**: AES-256-GCM encrypted biometric vaults, httpOnly session tokens, and strict `institution_id` isolation.
6. **Universal Scalability**: Support schools, hostels, orphanages, and skill centers without breaking database schemas or introducing custom forks.

---

# ARCHITECTURE_GOVERNANCE.md — Architecture Review Board & ADR Standard

## 1. Architecture Review Board (ARB)
The ARB governs platform integrity, reviews proposals impacting DB schemas or auth flows, and maintains the AIOS knowledge base.

## 2. Architectural Decision Record (ADR) Process
Any modification altering monorepo package boundaries, database schema structures, or RBAC permission keys MUST submit a formal ADR entry to `.ai/08_DECISION_LOG.md`.

---

# CHANGE_MANAGEMENT.md — Enterprise Change Management Protocol

1. **Proposal**: Engineering team submits RFC defining business need, schema impact, and security review.
2. **ARB Review**: ARB evaluates proposal against AIOS 3.0–6.0 architectural rules.
3. **Dual Schema Migration**: Additive migrations executed in dual-schema format (`schema.ts` + `schema.pg.ts`).
4. **Verification**: 0 type errors (`pnpm typecheck`), 0 lint warnings (`pnpm lint`), 100% passing unit tests (`pnpm test`).
