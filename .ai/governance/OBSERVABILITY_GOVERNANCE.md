# OBSERVABILITY_GOVERNANCE.md — Telemetry & Logging Policy

> **Specification Tier**: Strategic Governance Framework (AIOS 7.0)  
> **Source of Truth**: `.ai/governance/OBSERVABILITY_GOVERNANCE.md`

* **Structured Logging**: API errors and security violations output structured JSON logs with event names, timestamps, and IP addresses.
* **Telemetry Diagnostics**: Health checks and version info exposed via `/api/telemetry` and `/api/system`.

---

# RELEASE_GOVERNANCE.md — Release Train & Versioning Policy

* **Semantic Versioning**: Standard SemVer (`MAJOR.MINOR.PATCH`).
* **Release Trains**: Sprint releases deployed bi-weekly following full CI automation validation.

---

# EXTENSION_POLICY.md — Module Extension & Monorepo Policy

* **Additive Extensions**: New modules MUST be added as additive extension tables or route modules within `src/app/(shell)/(erp)/`.
* **Zero Modification of Locked Schemas**: Stable core schemas MUST NOT be mutated directly.

---

# MARKETPLACE_POLICY.md — Marketplace App Certification Policy

* **Application Verification**: Custom workspace extensions MUST undergo security review, RBAC permission auditing, and ARB certification before inclusion in `marketplace_apps`.

---

# OPEN_API_STRATEGY.md — Developer Portal & Third-Party API Strategy

* **OpenAPI 3.1 Specification**: Auto-generated spec file served at `/api/openapi.json`.
* **Partner Webhooks**: External systems receive signed HTTP webhooks on events (`FeePaid`, `StudentAdmitted`).
