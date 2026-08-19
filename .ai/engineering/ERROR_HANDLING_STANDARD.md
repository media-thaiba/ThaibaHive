# ERROR_HANDLING_STANDARD.md — Error Handling & Taxonomy Standard

> **Specification Tier**: Engineering Operations Manual (AIOS 8.0)  
> **Source of Truth**: `.ai/engineering/ERROR_HANDLING_STANDARD.md`

---

## 1. Error Response Taxonomy

| Error Type | HTTP Status | Response Schema | UI Handling |
| :--- | :---: | :--- | :--- |
| **Authentication Error**| `401` | `{ "error": "Not authenticated" }` | Redirect to `/auth/login` |
| **Permission Forbidden** | `403` | `{ "error": "Forbidden" }` | Display Toast Error / Access Denied Alert |
| **Validation Error** | `400` | `{ "error": "Field validation details" }` | Highlight form field errors |
| **Conflict Error** | `409` | `{ "error": "Resource already exists" }` | Display Toast Alert |
| **Internal Server Error**| `500` | `{ "error": "Internal server error" }` | Display Toast Error & log stack internally |

---

# SECURE_CODING_STANDARD.md — Secure Coding Standards

1. **Input Validation**: All API bodies validated via Zod schemas (`safeParse`).
2. **Output Encoding**: React automatically escapes rendered strings against XSS attacks.
3. **Session Cookie Hardening**: `thb_session` cookie enforces `httpOnly: true`, `secure: true` (prod), `sameSite: lax`.
4. **SQL Injection Prevention**: All queries use Drizzle ORM parameterized query builders (`eq`, `and`, `or`, `sql`).
5. **Biometric Vault Protection**: Facial feature vectors encrypted via AES-256-GCM (`iv:authTag:ciphertext`).
6. **Replay Protection**: Mobile handoff nonces validated and deleted upon use (`used_nonces` table).

---

# PERFORMANCE_CHECKLIST.md — Pre-Merge Performance Verification Checklist

- [ ] API p95 latency verification meets SLA targets (< 15ms auth, < 40ms workspace stats).
- [ ] No N+1 database query patterns in list endpoints (joins used).
- [ ] Images optimized via Next.js `Image` component.
- [ ] Heavy overlays (e.g. Command Palette) lazy-loaded via `React.lazy()`.
- [ ] List views implement server-side pagination (`limit=20`).
