# Operational Runbook: RFC 8594 Legacy Token Sunset & DPoP Migration

## Overview
ThaibaHive is deprecating legacy static Bearer JWT tokens in favor of cryptographically bound DPoP (RFC 9449) tokens with sender-constraining proofs.

## Deprecation Enforcement Stages
1. **WARN (Phase 1)**:
   - All legacy tokens accepted.
   - HTTP responses attach RFC 8594 headers:
     - `Deprecation: true`
     - `Sunset: <ISO-8601-Date>`
     - `Link: <https://thaibahive.edu/docs/dpop-migration>; rel="sunset"`
2. **SOFT_ENFORCE (Phase 2)**:
   - Read requests (`GET`, `HEAD`) succeed with deprecation headers.
   - Write mutations (`POST`, `PUT`, `PATCH`, `DELETE`) return HTTP `401 Unauthorized` problem details (`type: "https://thaibahive.edu/errors/legacy-token-deprecated"`).
3. **STRICT (Phase 3)**:
   - All requests lacking DPoP key binding proof are rejected with HTTP 401.

## Administration
- **UI Dashboard**: `/admin/security/identity` provides live session distribution charts and toggle buttons to advance sunset stages.
- **API Control**: `POST /api/admin/security/identity/deprecation-stats` with payload `{ "mode": "SOFT_ENFORCE" | "STRICT" }`.
