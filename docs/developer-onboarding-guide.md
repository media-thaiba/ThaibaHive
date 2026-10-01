# ThaibaHive Developer & Architecture Onboarding Guide

**Version:** 3.31.0  
**Target Audience:** Core Engineers, Platform Architects, and New Contributors

---

## 1. Monorepo & System Architecture

ThaibaHive is an enterprise-grade multi-tenant Campus Management, Learning (LMS), and Resource Planning (ERP) platform built with **Next.js 16 (App Router)**, **React 19**, **TypeScript 5+**, and **Drizzle ORM**.

```
ThaibaHive/
├── apps/
│   └── mobile/              # Flutter mobile client (Riverpod, GoRouter, SecureStorage)
├── packages/
│   ├── auth/                # Central auth package (@thaiba/auth: RBAC, DPoP, JWT, permissions)
│   └── db/                  # Central database schema & client (@thaiba/db: Drizzle schemas)
├── src/
│   ├── app/
│   │   ├── (shell)/         # Authenticated platform pages (Dashboard, Staff, Tasks, etc.)
│   │   ├── api/             # Secure REST route handlers protected by requireAuth / withDPoP
│   │   └── auth/            # Authentication screens (Login, Signup, Passkeys, SSO)
│   ├── components/          # Reusable UI primitives and domain feature components
│   ├── contexts/            # Global React contexts (AuthContext, ThemeContext)
│   ├── lib/                 # Core utilities, API client, security scanners, validation
│   ├── providers/           # App-level providers (QueryProvider, ThemeProvider, ToastProvider)
│   └── stores/              # Zustand centralized state stores (useMediaStore, etc.)
├── scripts/                 # Security scanners, database orchestration, simulation runners
└── docs/                    # Architectural guidelines, security specifications, and SOPs
```

---

## 2. Quickstart & Local Setup

### Prerequisites
- **Node.js**: >= 20.x
- **pnpm**: >= 9.x
- **Flutter**: >= 3.24.x (for mobile development)

### Initial Setup
```bash
# 1. Install workspace dependencies
pnpm install

# 2. Configure environment variables
cp .env.example .env.local

# 3. Seed database
pnpm db:push
pnpm db:seed

# 4. Start local development server
pnpm dev
```

Platform will be live at `http://localhost:3000`.

---

## 3. State Management & Data Fetching Architecture

ThaibaHive employs a two-tier state management paradigm:

### Tier 1: Server State & API Caching (TanStack React Query)
- Handled through domain hooks under `src/lib/hooks/` (`useStaffList`, `useTodayAttendance`, `useTasks`, `useVehicles`).
- Configured with global defaults:
  - `staleTime`: 1 minute (`60_000ms`)
  - `gcTime`: 5 minutes (`300_000ms`)
  - `refetchOnWindowFocus`: `false`
- Automatically synchronizes with optimistic cache updates and server mutations.

### Tier 2: Interactive Client State (Zustand Stores)
- Centralized under `src/stores/` and exported via `src/stores/index.ts`:
  - `useMediaStore`: Active folder, search filter, drawer states, preview selection.
  - `useVehicleStore`: Fleet tabs, filter criteria, log modals.
  - `useCircularStore`: Feed filters, category tabs, publish form modal.
  - `useGrievanceStore`: Tab switching, submit dialog, detail drawer state.
  - `useAccountsStore`: Institution filters, date ranges, transaction and export dialogs.
  - `usePurchasesStore`: Budget tabs, approval filter, purchase modals.

---

## 4. Coding & Security Conventions

### 4.1. API Route Protection
Every route handler in `src/app/api/` **MUST** be wrapped in `requireAuth` or `withDPoP` and validated with Zod:
```typescript
import { requireAuth } from "@/lib/auth";
import { transactionSchema } from "@/lib/validation/schemas";

export const POST = requireAuth(async (req, user) => {
  const body = await req.json();
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Tenant-scoped database query
  // ...
}, "accounts:write");
```

### 4.2. UI Components & Accessibility
- Always use UI primitives from `src/components/ui/` (`<Button>`, `<Input>`, `<Select>`, `<Dialog>`, `<Skeleton>`, `<Badge>`).
- Follow **WCAG 2.1 Level AA**:
  - Explicit `<label htmlFor="...">` and `id="..."` pairing.
  - `aria-live="polite"` for dynamic result counts and status changes.
  - Visible focus rings with `focus-visible:ring-2 focus-visible:ring-primary`.
  - Semantic list elements (`<ul role="list">`, `<li>`) for card grids.

### 4.3. Dynamic Code-Splitting
Heavy modals, interactive dialogs, and large third-party libraries (e.g. Recharts, @dnd-kit) must be loaded dynamically:
```typescript
import dynamic from "next/dynamic";

const TransactionFormDialog = dynamic(
  () => import("@/components/accounts/transaction-form-dialog").then((m) => m.TransactionFormDialog),
  { ssr: false }
);
```

---

## 5. Security & Verification Pipeline

Before committing or submitting a PR, run the full verification pipeline:

```bash
# 1. Strict TypeScript type check
pnpm tsc --noEmit

# 2. Gateway AST Security Coverage Scanner (100% routes shielded)
pnpm gateway:scan

# 3. Cross-Tenant Isolation Scanner (Zero leaks across source files)
pnpm security:tenants

# 4. Identity & DPoP Verification Scan
pnpm identity:scan

# 5. RBAC Route-to-Role Mapping Audit
pnpm security:rbac

# 6. Accessibility and Unit Test Suites
pnpm test:a11y
pnpm test
```

All scanners must pass with **0 errors and 0 unshielded endpoints**.
