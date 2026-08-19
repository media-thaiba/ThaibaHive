# Rate Limiting Configuration Guide

**Version:** 1.0 (Sprint-038)  
**Author:** Implementation Engineer  
**Classification:** Operational Runbook  

---

## 1. Overview

ThaibaHive employs a multi-dimensional, distributed sliding-window and token-bucket rate limiting engine.
Rate limiting rules operate on compound keys combining:
```
ratelimit:<tenantId>:<role>:<dpopThumbprint>:<userId/ip>:<routeTier>
```

---

## 2. Default Tier Quotas

| Tier | Window (ms) | Max Requests | Burst Allowance | Intended Routes |
| :--- | :--- | :--- | :--- | :--- |
| `public` | 60,000 | 60 | 15 | Unauthenticated landing, health endpoints |
| `auth` | 60,000 | 15 | 5 | Login, token exchange, WebAuthn assertions |
| `mutation` | 60,000 | 120 | 30 | POST / PUT / PATCH / DELETE business entities |
| `query` | 60,000 | 300 | 50 | Standard GET data queries |
| `export` | 60,000 | 10 | 2 | Large CSV / PDF / Parquet data exports |
| `admin` | 60,000 | 600 | 100 | Administrative management routes |

---

## 3. Role & Risk Multipliers

### Role Multipliers
- `super_admin`: 3.0x quota
- `admin`: 2.0x quota
- `principal`: 1.5x quota
- `hod`: 1.25x quota
- `staff`: 1.0x quota
- `anonymous`: 0.5x quota

### Adaptive Risk Modifiers
- **0–20 (Low Risk):** 100% quota
- **21–50 (Medium Risk):** 75% quota
- **51–80 (High Risk):** 25% quota
- **81–100 (Critical Risk):** 0% quota (instant block)

---

## 4. Route Decorator Usage

```typescript
import { withRateLimit } from "@/lib/security";

export const GET = withRateLimit(async (request: Request) => {
  return NextResponse.json({ data: [] });
}, { tier: "query" });
```

---

## 5. Standard Response Headers

| Header | Description |
| :--- | :--- |
| `RateLimit-Limit` | Total request quota allowed within the active window |
| `RateLimit-Remaining` | Remaining requests available before throttling |
| `RateLimit-Reset` | Unix timestamp (seconds) when the rate limit window resets |
| `Retry-After` | Seconds to wait before retrying (on HTTP 429) |
