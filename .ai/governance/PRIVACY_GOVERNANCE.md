# PRIVACY_GOVERNANCE.md — Privacy, Consent & Biometric Protection Policy

> **Specification Tier**: Strategic Governance Framework (AIOS 7.0)  
> **Source of Truth**: `.ai/governance/PRIVACY_GOVERNANCE.md`

---

## 1. Biometric Consent & GDPR/DPDP Rules
* **Explicit Parental Consent**: Student facial recognition and NFC card tracking require signed or digital consent in `student_biometric_consents`.
* **Right to Revocation**: Revoking consent immediately deactivates facial vector matching and reverts student to manual register marking.
* **No Raw Image Storage**: The system stores ONLY AES-256-GCM encrypted 512-dimensional vector arrays (`facenet-512d-v1`)—never raw photos.

---

# API_GOVERNANCE.md — API Standards & Lifecycle Policy

* **Stripe REST Convention**: All endpoints follow standard REST patterns (`GET`, `POST`, `PATCH`, `DELETE`) returning standardized JSON response envelopes.
* **Deprecation Notice**: Breaking API changes require a 6-month deprecation window with `Sunset` HTTP headers before endpoint retirement.

---

# UX_GOVERNANCE.md — Design System & Experience Standards

* **Workspace-First Rule**: Users MUST enter personalized Workspaces rather than raw table menus.
* **Design Token Source**: CSS variables in `src/app/globals.css` act as single source of truth for color, spacing, and radius tokens.

---

# ACCESSIBILITY_GOVERNANCE.md — WCAG 2.1 AA Compliance Standard

* **Keyboard Navigation**: All interactive UI elements (buttons, inputs, modals, command palette) MUST be accessible via `Tab`, `Enter`, `Escape`, and `Space`.
* **Touch Targets**: Minimum `44px x 44px` touch targets enforced on mobile viewports (`pointer: coarse`).
* **Screen Reader Labels**: Form inputs bound to explicit `<Label>` elements; icon buttons include `aria-label`.

---

# PERFORMANCE_GOVERNANCE.md — Performance Budgets & SLA Monitoring

* **Latency Budgets**: Auth verification < 15ms, Workspace rendering < 40ms, Cmd+K search < 35ms.
* **Bundle Budget**: Initial JS payload budget < 120 KB (gzipped); Command Palette lazy-loaded on demand.
