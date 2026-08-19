# 05_AI_RULES.md — The 100 Non-Negotiable Architectural Rules for AI Agents

> **Classification**: AI Agent Constitution & Immutable Development Rules  
> **Source of Truth**: `.ai/05_AI_RULES.md`  
> **Rule Count**: Exactly 100 Rules (Strictly Enforced)

---

## I. Architecture & System Scoping Rules (Rules 1–20)

1. **Rule 1 (Institution Isolation)**: Every API route, query, and background job MUST enforce row-level `institutionId` scoping.
2. **Rule 2 (No Code Duplication)**: AI agents MUST search existing helper functions in `src/lib/` before writing custom utilities.
3. **Rule 3 (No Schema Duplication)**: Every schema addition to `packages/db/schema.ts` MUST be mirrored in `packages/db/schema.pg.ts`.
4. **Rule 4 (No Raw HTML Controls)**: Client components MUST use UI primitives from `src/components/ui/` (`Button`, `Input`, `Select`, `Dialog`).
5. **Rule 5 (Single Identity Master)**: All human identity extensions (boarder, passenger, applicant) MUST link via FK to `students` or `staff`.
6. **Rule 6 (Monorepo Imports)**: Shared database schemas MUST be imported from `@thaiba/db` and shared auth from `@thaiba/auth`.
7. **Rule 7 (Stateless Session Guard)**: All protected API routes MUST be wrapped with `requireAuth(handler, "domain:permission")`.
8. **Rule 8 (Fresh Session Re-Verification)**: `verifySession()` MUST re-query DB `tokenVersion` and `isActive` on every request.
9. **Rule 9 (Soft Delete Pattern)**: Master entity tables MUST use `isActive` or `deletedAt` soft deletes instead of hard `DELETE` queries.
10. **Rule 10 (AES Encrypted Biometrics)**: Facial embeddings MUST be encrypted using AES-256-GCM prior to database persistence.
11. **Rule 11 (Audit Log Emission)**: All financial, grade, or security mutations MUST call `logActivity()` and write to `audit_log`.
12. **Rule 12 (No Unscoped Multi-Tenancy)**: Never query global tables (`staff`, `students`) without filtering by `institutionId` or user role.
13. **Rule 13 (No Inline CSS)**: All styling MUST use Tailwind utility classes or custom design tokens defined in `globals.css`.
14. **Rule 14 (No Dark Mode Hardcoding)**: Use semantic color tokens (`bg-background`, `text-foreground`) rather than fixed color values.
15. **Rule 15 (No Custom Overlays)**: Use the Radix-based `<Dialog>` component for all modal dialogs.
16. **Rule 16 (No Silent Exception Swallowing)**: Catch blocks in data fetches MUST update UI error state or display toast feedback via `sonner`.
17. **Rule 17 (Promise Catch Rules)**: All `useEffect` fetch calls MUST chain `.catch()` to prevent stuck loading states.
18. **Rule 18 (Array Null Safety)**: Import `ensureArray` from `@/lib/utils` instead of repeating `Array.isArray(x) ? x : []`.
19. **Rule 19 (No Hydration Thrashing)**: Client components using local storage or browser APIs MUST defer state initialization to `useEffect`.
20. **Rule 20 (Command Palette Integration)**: New navigable pages MUST be registered in `src/config/navigation.ts` for search indexing.

---

## II. Data Modeling & Database Rules (Rules 21–40)

21. **Rule 21 (UUID Primary Keys)**: All table primary keys MUST be text-based UUID v4 generated via `crypto.randomUUID()`.
22. **Rule 22 (ISO Date Formatting)**: All timestamp fields MUST be stored as ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
23. **Rule 23 (Explicit Indexing)**: Foreign key columns and search query targets MUST have explicit Drizzle indexes defined.
24. **Rule 24 (Composite Uniqueness)**: Uniqueness constraints spanning multiple columns (e.g., `institutionId` + `admissionNo`) MUST use `uniqueIndex`.
25. **Rule 25 (Normalized NFC Tags)**: NFC tag IDs MUST be normalized to uppercase hex strings before storage.
26. **Rule 26 (No Text Defaults for Arrays)**: JSON array columns MUST default to empty arrays or valid JSON strings in schema definitions.
27. **Rule 27 (Single Role Column)**: `staff.role` is a single string enum; multi-role logic MUST be managed via permission checks.
28. **Rule 28 (Junction Table Naming)**: M:N relationship tables MUST use camelCase TypeScript names and snake_case table names (`staff_departments`).
29. **Rule 29 (No Foreign Key Loops)**: Cyclic table foreign key references are strictly prohibited.
30. **Rule 30 (Numeric Balance Types)**: Financial amounts MUST use `real` or `decimal` numeric types, never raw unformatted strings.
31. **Rule 31 (Cascade Soft Delete Protection)**: Foreign keys referencing master entities MUST NOT use automatic cascade deletes if historical records exist.
32. **Rule 32 (Biometric Consent Check)**: Student biometric lookups MUST check for active consent in `student_biometric_consents`.
33. **Rule 33 (No Schema Modification for ERP)**: ERP features MUST add new extension tables rather than mutating stable existing schemas.
34. **Rule 34 (Drizzle Query Syntax)**: Prefer Drizzle relational query API or `eq()`, `and()`, `or()` builders over raw SQL template strings.
35. **Rule 35 (SQLite Mode Booleans)**: SQLite boolean columns MUST set `{ mode: "boolean" }` on `integer` fields.
36. **Rule 36 (Database Migration Verification)**: Never run `db:push` in production without generating a SQL migration script via `db:generate`.
37. **Rule 37 (Seed Script Safety)**: Seeding scripts (`src/db/seed.ts`) MUST execute upserts (`onConflictDoUpdate`) to remain idempotent.
38. **Rule 38 (Immutable Transaction Records)**: Posted records in `financial_transactions` CANNOT be updated; corrections require reversal entries.
39. **Rule 39 (NFC Card Inventory Guard)**: NFC tag binding MUST verify card availability in `nfc_cards` inventory table.
40. **Rule 40 (Explicit Nullability)**: Database schema columns MUST explicitly state `.notNull()` or be documented as optional.

---

## III. API & Route Handler Rules (Rules 41–60)

41. **Rule 41 (Zod Validation Mandatory)**: All POST/PATCH/PUT API handlers accepting request bodies MUST validate input using Zod schemas.
42. **Rule 42 (Standardized Error Response)**: Failed API requests MUST return `{ error: string }` with appropriate HTTP status codes (400, 401, 403, 404, 409, 500).
43. **Rule 43 (DELETE Existence Check)**: API DELETE handlers MUST check if the entity exists prior to deletion (return 404 if missing).
44. **Rule 44 (POST 201 Created)**: Successful resource creation handlers MUST return HTTP status `201 Created`.
45. **Rule 45 (Security Event Logging)**: Unauthorized access attempts in `requireAuth` MUST output structured JSON logs with timestamp and IP.
46. **Rule 46 (Rate Limiting Tiering)**: Write and auth API routes MUST be protected with `rateLimit()` middleware.
47. **Rule 47 (No Sensitive Data Exposure)**: API responses MUST exclude password hashes, secret keys, and raw encryption IVs.
48. **Rule 48 (Range Stream File Serving)**: File download routes MUST support HTTP Range requests for video/audio streaming.
49. **Rule 49 (Content-Type Verification)**: Route middleware MUST enforce `application/json` or `multipart/form-data` on write routes.
50. **Rule 50 (Pagination Defaults)**: List endpoints MUST enforce default pagination (`page=1`, `limit=20`) to prevent unbounded queries.
51. **Rule 51 (ERP API Namespace)**: All ERP API endpoints MUST reside under `/api/erp/[module]/`.
52. **Rule 52 (Async Background Execution)**: Heavy computational tasks (payroll runs, report generation) MUST run asynchronously.
53. **Rule 53 (Mobile Handoff Nonce Expiry)**: WebView handoff nonces MUST have a strict 60-second expiration window.
54. **Rule 54 (Single Token Revocation)**: Session revocation MUST increment `tokenVersion` to invalidate all active JWTs.
55. **Rule 55 (Response Header Hardening)**: API Route Handlers MUST NOT override global security headers set by `proxy.ts`.
56. **Rule 56 (No Internal Traceback Leakage)**: Production API 500 responses MUST return generic message `"Internal server error"` and log stack trace internally.
57. **Rule 57 (Explicit Return Types)**: API handlers MUST explicitly specify return response object types.
58. **Rule 58 (HTTP Method Idempotency)**: GET, PUT, and DELETE handlers MUST remain idempotent.
59. **Rule 59 (Search Parameter Sanitization)**: URL query strings used in `like()` SQL filters MUST escape special wildcard characters (`%`, `_`).
60. **Rule 60 (Bulk Mutation Summaries)**: Bulk API routes (e.g., bulk attendance) MUST return a summary object of affected rows.

---

## IV. UI, UX & Experience Layer Rules (Rules 61–80)

61. **Rule 61 (Workspace Over Menus)**: Users MUST be routed to intent-driven Workspaces (`/workspace/[role]`) upon login.
62. **Rule 62 (Skeleton Loading States)**: Loading states MUST use `<Skeleton>` components matching card layouts—never raw text "Loading...".
63. **Rule 63 (Semantic Badge Variants)**: Status badges MUST use semantic variants (`success`, `warning`, `destructive`, `info`, `secondary`).
64. **Rule 64 (Touch Target Minimum)**: All interactive UI controls MUST meet minimum `44px x 44px` touch targets on mobile viewports.
65. **Rule 65 (Reduced Motion Compliance)**: UI transitions MUST respect `prefers-reduced-motion` CSS rules.
66. **Rule 66 (Responsive Shell Navigation)**: Navigation MUST switch seamlessly between desktop sidebar and mobile bottom bar at `lg` breakpoint.
67. **Rule 67 (Command Palette Shortcut)**: `Cmd+K` MUST toggle global search overlay from any workspace screen.
68. **Rule 68 (Wizard Step Indicator)**: Task-driven wizards MUST display a visual step-progress indicator with back/next controls.
69. **Rule 69 (Toast Feedback Standard)**: User actions MUST trigger feedback toasts via `toast.success()` or `toast.error()`.
70. **Rule 70 (Form Field Accessibility)**: Every form input MUST be bound to an explicit `<Label>` with matching `htmlFor` and `id`.
71. **Rule 71 (Empty State Graphics)**: Empty data tables MUST display an icon, descriptive text, and a primary action button.
72. **Rule 72 (Universal Search Categorization)**: Search results MUST group returned entities by type (Students, Staff, Receipts, Assets).
73. **Rule 73 (Entity Timeline Display)**: Entity detail views SHOULD embed a chronological vertical timeline of lifecycle events.
74. **Rule 74 (Form Unsaved Changes Warning)**: Wizards and forms with modified state MUST warn users before tab closure or navigation away.
75. **Rule 75 (Table Sort Headers)**: Data tables SHOULD provide clickable column headers for sorting where applicable.
76. **Rule 76 (Consistent Modal Radius)**: Modals and cards MUST use standard CSS variable `--radius` (0.625rem).
77. **Rule 77 (Avatar Fallback Initials)**: Avatar components MUST display student/staff initials when `avatarUrl` is missing or broken.
78. **Rule 78 (Breadcrumb Hierarchy)**: Nested sub-pages MUST display clickable breadcrumb links back to parent workspace views.
79. **Rule 79 (Contrast Ratio Standards)**: Text colors MUST maintain WCAG 2.1 AA contrast standards against card backgrounds.
80. **Rule 80 (No Horizontal Scroll Thrashing)**: Tables on mobile viewports MUST be wrapped in responsive horizontal scroll containers (`overflow-x-auto`).

---

## V. AI, Realtime & System Integrity Rules (Rules 81–100)

81. **Rule 81 (Proactive AI Triggers)**: AI background routines MUST monitor event streams and generate draft tasks—never mutate financial or identity data directly.
82. **Rule 82 (SSE Connection Cleanup)**: SSE listeners MUST unregister connections upon stream closure or disconnect.
83. **Rule 83 (Debounced Presence Disconnect)**: Presence disconnect triggers MUST wait 5 seconds before broadcasting offline status.
84. **Rule 84 (Dead FCM Token Pruning)**: Push notifications returning `UNREGISTERED` tokens MUST immediately delete token from `staffDeviceTokens`.
85. **Rule 85 (No Plaintext Secrets)**: API keys, JWT secrets, and DB credentials MUST read from `process.env`—never hardcoded in source.
86. **Rule 86 (Clean Lint State)**: AI agents MUST verify code passes `pnpm lint` without creating new errors.
87. **Rule 87 (TypeScript Zero Error Mandate)**: Code changes MUST pass `pnpm typecheck` (`tsc --noEmit`) with 0 errors.
88. **Rule 88 (Unit Test Verification)**: AI agents editing utility functions MUST execute `pnpm test` to verify suite stability.
89. **Rule 89 (No Breaking API Changes)**: Function signatures on public shared utilities MUST retain backward compatibility.
90. **Rule 90 (ADR Creation Rule)**: Any architectural change impacting schema structure or auth flows MUST be logged as an ADR in `.ai/08_DECISION_LOG.md`.
91. **Rule 91 (Feature Flag Enforcement)**: Unreleased experimental features MUST be gated via `navigation.ts` or system config flags.
92. **Rule 92 (Modular Monolith Boundaries)**: Domain logic MUST NOT directly import private components from unrelated feature modules.
93. **Rule 93 (Idempotent DB Migrations)**: SQL migration scripts MUST use `IF NOT EXISTS` constructs to allow safe re-execution.
94. **Rule 94 (Flutter Keystore Token Storage)**: Mobile apps MUST store JWT session tokens in hardware-backed secure storage.
95. **Rule 95 (Zero Third-Party DOM Mutation)**: React code MUST NOT mutate private DOM nodes directly outside React refs.
96. **Rule 96 (Local State Scoping)**: Transient draft state MUST be kept within local component state until form submission.
97. **Rule 97 (Strict Imports Formatting)**: Standard React/Next imports first, followed by third-party packages, monorepo packages, and relative imports.
98. **Rule 98 (Production Build Verification)**: Complex refactors MUST verify build viability via `pnpm build`.
99. **Rule 99 (Document Before Implement)**: Major features MUST have technical specifications documented in `.ai/` prior to code edits.
100. **Rule 100 (The Institution OS Principle)**: Always design features as part of a human-centered, universal campus operating system—never as isolated administrative software.
