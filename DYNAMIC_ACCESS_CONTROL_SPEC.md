# Architecture Specification: Dynamic Access Control & Onboarding Workflow

> **Status**: FINAL — Post Peer Review (Qwen 2.5 Coder · OpenCode · Security Architect)
> **Source**: ChatGPT spec + Antigravity peer review
> **Date**: 2026-07-14

---

## Executive Summary

This spec defines three interconnected systems for ThaibaHive:

1. **Day One Onboarding** — New users get instant access to universal modules + marketplace discovery
2. **Dynamic Access Control** — Self-service cross-department access requests with approval routing
3. **Account Revocation & Data Lifecycle** — Dual-action security protocol for removing user access

### Decisions Made (from Peer Review)

| Question | Decision |
|----------|----------|
| **Real-time revocation** | Lazy Invalidation (API gate, tokenVersion) + SSE (client cache wipe) + 5-min polling fallback |
| **Child app hosting** | Route-first for Phase 1; subdomains deferred to Phase 2 |
| **Mobile strategy** | Native Flutter Tier 1; WebView Tier 2 (Phase 2) |
| **Cookie domain** | `COOKIE_DOMAIN` env var; 24h default + 7-day "Remember Me" |
| **App registry** | `category = 'instant'` is the trigger (no `isDefault` column) |
| **Navigation gating** | Static `navGroups` Phase 1; dynamic sidebar Phase 2 |

---

## Pre-Implementation: Critical Security Fixes

> **MUST complete before any Phase 0-7 work.**

### C1: JWT Token Version (Server-Side Invalidation)

**Problem**: Deactivated user's 7-day JWT remains cryptographically valid.

**Fix** — Add to `src/db/schema.ts`:
```typescript
export const staff = sqliteTable("staff", {
  // ... existing columns ...
  tokenVersion: integer("token_version").notNull().default(0),  // ← NEW
  isFirstLogin: integer("is_first_login", { mode: "boolean" }).notNull().default(true),  // ← NEW
  onboardingCompletedAt: text("onboarding_completed_at"),  // ← NEW
});
```

**Fix** — Embed in JWT payload (`src/lib/auth/session.ts`):
```typescript
export type SessionPayload = {
  staffId: string;
  email: string;
  role: string;
  employeeId: string;
  name: string;
  tokenVersion: number;  // ← NEW
};
```

**Fix** — Check in `verifySession()`:
```typescript
const user = await db
  .select({ isActive: staff.isActive, tokenVersion: staff.tokenVersion })
  .from(staff)
  .where(eq(staff.id, session.staffId))
  .get();

if (!user || !user.isActive) return null;
if (user.tokenVersion !== session.tokenVersion) return null;  // ← NEW
```

**Fix** — Mobile Express API (`thaibahive_mobile_app/api/src/middleware/auth.ts`):
```typescript
// MUST add DB check — currently only verifies JWT signature
const user = await db.select({ isActive: staff.isActive, tokenVersion: staff.tokenVersion })
  .from(staff).where(eq(staff.id, decoded.staffId)).get();
if (!user?.isActive || user.tokenVersion !== decoded.tokenVersion) {
  return res.status(401).json({ error: 'Session invalid' });
}
```

### C2: Rate Limiting on Login

**Problem**: No brute-force protection on `POST /api/auth/login`.

**Fix** — Add rate limiter (e.g., `@upstash/ratelimit` or in-memory):
```typescript
// src/app/api/auth/login/route.ts
const ratelimit = new Ratelimit({ /* 5 requests per 60s per IP */ });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await ratelimit.limit(ip);
  if (!success) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  // ... existing login logic
}
```

### C3: Mobile Signup Privilege Escalation

**Problem**: Mobile signup accepts `role` from request body — allows self-assignment of `super_admin`.

**Fix** — `thaibahive_mobile_app/api/src/routes/auth/index.ts`:
```typescript
// Hardcode role to 'staff' — ignore any role from request body
const role = 'staff'; // NOT: const role = req.body.role;
```

### C4: Mobile PII Logging

**Problem**: `LogInterceptor(requestBody: true, responseBody: true)` logs all PII, tokens, financial data.

**Fix** — `thaibahive_mobile_app/lib/core/network/api_client.dart`:
```dart
if (kDebugMode) {
  dio.interceptors.add(LogInterceptor(requestBody: true, responseBody: true));
}
```

### C5: Hardcoded localhost in Flutter

**Problem**: `constants.dart:7` uses `http://localhost:4000` — plain HTTP in production.

**Fix** — Use `flutter_dotenv` or `--dart-define`:
```dart
// constants.dart
static final String apiBaseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: 'http://localhost:4000/api');
```

### C6: Cookie Domain Configuration

**Problem**: `session.ts` sets no `domain` — subdomain apps get 401s.

**Fix** — `src/lib/auth/session.ts`:
```typescript
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 1, // 24h default
};

// "Remember Me" from login
if (extendSession) {
  cookieOptions.maxAge = 60 * 60 * 24 * 7;
}

// Subdomain sharing
if (process.env.COOKIE_DOMAIN) {
  (cookieOptions as any).domain = process.env.COOKIE_DOMAIN;
}
```

**Add to `.env` / `.env.example`**:
```bash
COOKIE_DOMAIN=             # Empty for localhost; .thaibahive.com for prod
AUTH_JWT_SECRET=           # Minimum 64 chars
```

---

## Phase 0: Monorepo Restructuring (Foundation)

> **Goal**: Extract shared packages so web + mobile share auth/db logic
> **Effort**: Medium | **Risk**: Medium

### Target Structure
```
packages/
├── db/                      # @thaiba/db
│   ├── package.json
│   ├── schema.ts           # Shared Drizzle schema
│   ├── index.ts
│   └── migrations/
└── auth/                    # @thaiba/auth
    ├── package.json
    ├── config.ts
    ├── session.ts
    ├── password.ts
    ├── roles.ts
    └── institution-scope.ts
```

### Steps
1. Create `packages/db/` and `packages/auth/` with `package.json` files
2. Move `src/db/schema.ts` → `packages/db/schema.ts`
3. Move `src/lib/auth/*` → `packages/auth/`
4. Update `pnpm-workspace.yaml` to include `packages/*`
5. Add TypeScript path aliases in `tsconfig.json`
6. Update all imports (`@/db` → `@thaiba/db`, `@/lib/auth` → `@thaiba/auth`)
7. Verify: `pnpm install && pnpm typecheck && pnpm build`

### Critical: Prevent Schema Drift
The mobile Express API (`thaibahive_mobile_app/api/`) duplicates the Drizzle schema. Once `@thaiba/db` exists, both Next.js and Express must import from it — never maintain two copies.

---

## Phase 1: Database Schema Extensions

> **Goal**: Add tables for marketplace, access requests, user app assignments
> **Effort**: Medium | **Risk**: Low (additive only)

### New Tables

#### `marketplace_apps`
```sql
CREATE TABLE marketplace_apps (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  icon            TEXT,                       -- Lucide icon name
  category        TEXT NOT NULL,              -- "instant" | "restricted"
  department_id   TEXT REFERENCES departments(id),
  subdomain       TEXT,                       -- e.g. "mediahive"
  route_prefix    TEXT,                       -- e.g. "/media"
  is_active       INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (current_timestamp),
  updated_at      TEXT NOT NULL DEFAULT (current_timestamp),
  -- ENFORCE: must have route_prefix OR subdomain, never neither
  CHECK (route_prefix IS NOT NULL OR subdomain IS NOT NULL)
);
```

#### `app_default_roles`
```sql
CREATE TABLE app_default_roles (
  id              TEXT PRIMARY KEY,
  app_id          TEXT NOT NULL REFERENCES marketplace_apps(id),
  role_name       TEXT NOT NULL,              -- "contributor" | "viewer" | "guest"
  permissions     TEXT NOT NULL,              -- JSON array of permission strings
  is_default      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (current_timestamp)
);
```

#### `user_app_assignments`
```sql
CREATE TABLE user_app_assignments (
  id              TEXT PRIMARY KEY,
  staff_id        TEXT NOT NULL REFERENCES staff(id),
  app_id          TEXT NOT NULL REFERENCES marketplace_apps(id),
  role_id         TEXT NOT NULL REFERENCES app_default_roles(id),
  status          TEXT NOT NULL DEFAULT 'active',  -- "active" | "revoked"
  installed_at    TEXT NOT NULL DEFAULT (current_timestamp),
  revoked_at      TEXT,
  revoked_by_id   TEXT REFERENCES staff(id),
  revoked_reason  TEXT,
  UNIQUE(staff_id, app_id)
);
```

#### `access_requests`
```sql
CREATE TABLE access_requests (
  id              TEXT PRIMARY KEY,
  staff_id        TEXT NOT NULL REFERENCES staff(id),
  app_id          TEXT NOT NULL REFERENCES marketplace_apps(id),
  status          TEXT NOT NULL DEFAULT 'pending',  -- "pending" | "approved" | "rejected"
  reason          TEXT,
  assigned_role_id TEXT REFERENCES app_default_roles(id),
  routed_to_id    TEXT REFERENCES staff(id),
  reviewed_at     TEXT,
  review_notes    TEXT,
  created_at      TEXT NOT NULL DEFAULT (current_timestamp),
  updated_at      TEXT NOT NULL DEFAULT (current_timestamp)
);
```

#### `staff` table additions
```sql
ALTER TABLE staff ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE staff ADD COLUMN is_first_login INTEGER NOT NULL DEFAULT 1;
ALTER TABLE staff ADD COLUMN onboarding_completed_at TEXT;
```

### Seed: Complete Instant Apps

```typescript
// src/db/seed.ts — separate seedMarketplace() function with own guard
async function seedMarketplace() {
  const existing = await db.select().from(marketplaceApps).limit(1).get();
  if (existing) { console.log('Marketplace already seeded.'); return; }

  await db.insert(marketplaceApps).values([
    // Instant Utility Extensions (auto-activated on first login)
    { id: uuid(), name: 'Digital Profile',    slug: 'profile',       category: 'instant', routePrefix: '/staff' },
    { id: uuid(), name: 'Attendance',          slug: 'attendance',    category: 'instant', routePrefix: '/attendance' },
    { id: uuid(), name: 'Leave Management',    slug: 'leaves',        category: 'instant', routePrefix: '/leaves' },
    { id: uuid(), name: 'Task Management',     slug: 'tasks',         category: 'instant', routePrefix: '/tasks' },
    { id: uuid(), name: 'Daily Reports',       slug: 'reports',       category: 'instant', routePrefix: '/reports' },
    { id: uuid(), name: 'Approvals',           slug: 'approvals',     category: 'instant', routePrefix: '/approvals' },
    { id: uuid(), name: 'Notifications',       slug: 'notifications', category: 'instant', routePrefix: '/notifications' },
    { id: uuid(), name: 'Staff Directory',     slug: 'staff-directory', category: 'instant', routePrefix: '/staff' },
    { id: uuid(), name: 'Help Desk',           slug: 'help-desk',     category: 'instant', routePrefix: '/help-desk' },
    { id: uuid(), name: 'Canteen',             slug: 'canteen',       category: 'instant', routePrefix: '/canteen' },

    // Restricted Department Portals (require approval)
    { id: uuid(), name: 'MediaHive',     slug: 'mediahive',  category: 'restricted', departmentId: 'media-it-dept', subdomain: 'mediahive' },
    { id: uuid(), name: 'Accounts',      slug: 'accounts',   category: 'restricted', departmentId: 'accounts-dept', routePrefix: '/accounts' },
    { id: uuid(), name: 'Vehicles',      slug: 'vehicles',   category: 'restricted', departmentId: 'admin-dept', routePrefix: '/vehicles' },
    { id: uuid(), name: 'Assets',        slug: 'assets',     category: 'restricted', departmentId: 'admin-dept', routePrefix: '/assets' },
    { id: uuid(), name: 'Purchases',     slug: 'purchases',  category: 'restricted', departmentId: 'accounts-dept', routePrefix: '/purchases' },
  ]);

  // Seed default roles — tasks:read ONLY for staff (not tasks:create, that's HOD+ per RBAC)
  // ... role seeding logic
}
```

---

## Phase 2: Marketplace System

> **Goal**: Build marketplace UI and app installation/request flows
> **Effort**: High | **Risk**: Medium

### 2.1 Phase 1 vs Phase 2 Scope

| Feature | Phase 1 | Phase 2 |
|---------|---------|---------|
| Static `navGroups` in sidebar | ✅ | Replaced by dynamic |
| Marketplace page | ✅ | ✅ |
| Instant install | ✅ | ✅ |
| Request access flow | ✅ | ✅ |
| Dynamic sidebar filtering | ❌ | ✅ |
| Subdomain apps | ❌ | ✅ |
| CORS for subdomains | ❌ | ✅ |
| `src/middleware.ts` auth guard | ❌ | ✅ |

### 2.2 Marketplace Page

**Route**: `/marketplace`

**Components**:
- `AppCard` — Shows app icon, name, status (Install/Request/Pending/Installed)
- `MarketplaceGrid` — Category tabs (All, Instant, Restricted, Installed)
- `AccessRequestDialog` — Modal for requesting restricted app access

### 2.3 API Endpoints

```
GET    /api/marketplace/apps                    # List apps + user's assignment status
POST   /api/marketplace/install                 # Instant install (category = 'instant')
DELETE /api/marketplace/uninstall               # Remove assignment (revocation)
POST   /api/marketplace/access-requests         # Submit access request
GET    /api/marketplace/access-requests/pending # (Dept Head) pending for my apps
PUT    /api/marketplace/access-requests/:id     # Approve or reject
```

### 2.4 Subdomain Validation (on insert)

```typescript
if (!body.routePrefix && !body.subdomain) {
  return NextResponse.json({ error: 'App must have route_prefix or subdomain' }, { status: 400 });
}
if (body.subdomain) {
  const allowedPattern = /^[a-z0-9-]+$/;
  if (!allowedPattern.test(body.subdomain)) {
    return NextResponse.json({ error: 'Invalid subdomain' }, { status: 400 });
  }
}
```

---

## Phase 3: Access Request & Approval Routing

> **Goal**: Route requests to department heads, assign granular roles
> **Effort**: High | **Risk**: Medium

### 3.1 Routing Logic

```typescript
export async function routeAccessRequest(appId: string) {
  const app = await db.select().from(marketplaceApps)
    .where(eq(marketplaceApps.id, appId)).get();

  if (!app?.departmentId) return { routedTo: null, requiresSuperAdmin: true };

  const dept = await db.select().from(departments)
    .where(eq(departments.id, app.departmentId)).get();

  if (!dept?.headUserId) return { routedTo: null, requiresAdmin: true };

  // Check for active delegation
  const delegation = await db.select().from(approvalDelegations)
    .where(and(
      eq(approvalDelegations.delegatorId, dept.headUserId),
      eq(approvalDelegations.isActive, true),
    )).get();

  return { routedTo: delegation?.delegateId || dept.headUserId, requiresSuperAdmin: false };
}
```

### 3.2 Approval (Minimal Default Scope)

On approval, assign **Contributor/Guest/Viewer** — never blanket admin:

```typescript
const defaultRoles = {
  mediahive: { name: "Contributor", permissions: ["media:view", "media:upload", "media:comment"] },
  accounts:  { name: "Viewer",      permissions: ["finance:view_reports"] },
  vehicles:  { name: "Guest",       permissions: ["vehicles:view", "vehicles:request_booking"] },
};
```

### 3.3 Super Admin Override

- Approve any pending request directly
- Bypass department head routing
- Manually assign any role to any user
- View all pending requests across departments

---

## Phase 4: Onboarding System

> **Goal**: First-time user experience with auto-activated modules
> **Effort**: Medium | **Risk**: Low

### 4.1 Default Module Activation

On first login (`isFirstLogin = true`), auto-assign all `category = 'instant'` apps:

```typescript
export async function activateDefaultModules(staffId: string) {
  const instantApps = await db.select().from(marketplaceApps)
    .where(eq(marketplaceApps.category, "instant")).all();

  for (const app of instantApps) {
    const defaultRole = await db.select().from(appDefaultRoles)
      .where(and(eq(appDefaultRoles.appId, app.id), eq(appDefaultRoles.isDefault, true))).get();

    if (defaultRole) {
      await db.insert(userAppAssignments).values({
        id: crypto.randomUUID(), staffId, appId: app.id,
        roleId: defaultRole.id, status: "active",
      }).onConflictDoNothing();
    }
  }

  await db.update(staff).set({
    isFirstLogin: 0,
    onboardingCompletedAt: new Date().toISOString(),
  }).where(eq(staff.id, staffId));
}
```

### 4.2 UI Flow

```
First login → Welcome modal → "Here's what you have access to:"
  → List of auto-activated modules → "Visit Marketplace" CTA
  → "Complete your profile" → Dismiss → Onboarding complete
```

---

## Phase 5: Account Revocation & Data Lifecycle

> **Goal**: Dual-action security protocol
> **Effort**: High | **Risk**: HIGH (security-critical)

### 5.1 Server-Side: Status Transition (Never Delete Data)

```typescript
export async function revokeAppAccess(staffId: string, appId: string, revokedBy: string, reason?: string) {
  // 1. Update assignment status
  await db.update(userAppAssignments).set({
    status: "revoked",
    revokedAt: new Date().toISOString(),
    revokedById: revokedBy,
    revokedReason: reason,
  }).where(and(eq(userAppAssignments.staffId, staffId), eq(userAppAssignments.appId, appId)));

  // 2. Increment tokenVersion to invalidate active JWTs
  await db.update(staff).set({
    tokenVersion: sql`${staff.tokenVersion} + 1`,
  }).where(eq(staff.id, staffId));

  // 3. Audit log
  await db.insert(auditLog).values({
    id: crypto.randomUUID(), staffId: revokedBy,
    action: "app_access_revoked",
    entityType: "user_app_assignment",
    entityId: `${staffId}:${appId}`,
    details: { reason, targetStaffId: staffId, appId, recordsPreserved: true },
  });
}
```

### 5.2 Client-Side: SSE Cache Wipe

**SSE Endpoint** (`src/app/api/realtime/notifications/route.ts`):
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await verifySession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Heartbeat every 25s to prevent proxy timeout
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 25_000);

      // Listen for revocation events (via DB poll or pub/sub)
      const checkInterval = setInterval(async () => {
        const events = await getRevocationEvents(session.staffId);
        for (const event of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      }, 5_000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        clearInterval(checkInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'Connection': 'keep-alive',
    },
  });
}
```

**Client Handler** (`src/hooks/use-revocation-listener.ts`):
```typescript
export function useRevocationListener() {
  const { staff } = useAuth();

  useEffect(() => {
    if (!staff) return;

    const eventSource = new EventSource('/api/realtime/notifications');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'app_revoked') {
        // 1. Grace period toast
        toast.info("Session updating in 5s...", { duration: 5000 });

        // 2. After grace period, clear everything
        setTimeout(() => {
          queryClient.clear();
          window.location.href = '/';
        }, 5000);
      }
    };

    return () => eventSource.close();
  }, [staff]);
}
```

**Fallback**: 5-min polling with exponential backoff:
```typescript
useQuery({
  queryKey: ['session'],
  queryFn: fetchSession,
  refetchInterval: 300_000,
  refetchIntervalInBackground: false,
  retry: (failureCount) => Math.min(failureCount * 2, 30),
});
```

### 5.3 Subdomain Invalidation (Server-Side)

Do NOT use client-side `fetch` to subdomain (easily bypassed). Instead:

```typescript
// On revocation, write to a server-side table
// Each subdomain's API checks this table on every authenticated request
// SELECT * FROM user_app_assignments WHERE staff_id = ? AND app_id = ? AND status = 'active'
```

---

## Phase 6: Subdomain Session Sharing

> **Goal**: Seamless auth across `*.thaibahive.com`
> **Effort**: Medium | **Risk**: Medium

### 6.1 Wildcard SSL

- Configure `*.thaibahive.com` via certbot + Nginx
- Required before any subdomain app goes live

### 6.2 CORS Configuration

```typescript
// next.config.ts
module.exports = {
  async headers() {
    return [{
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://*.thaibahive.com' },
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
      ],
    }];
  },
};
```

### 6.3 Middleware Auth Guard

Create `src/middleware.ts` to protect unauthenticated subdomain access:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('thaibahive_session');
  if (!token && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}
```

---

## Phase 7: Flutter Mobile Updates

> **Goal**: Dynamic child app loading in Flutter shell
> **Effort**: High | **Risk**: Medium

### 7.1 Immediate Fixes (Before Phase 1)

```yaml
# pubspec.yaml additions
dependencies:
  nfc_manager: ^3.3.0         # NFC attendance
  hive_flutter: ^1.1.0        # Offline attendance queue
  flutter_dotenv: ^5.1.0      # Env-driven base URL
  webview_flutter: ^4.4.0     # Tier 2 WebView (Phase 2)

# Remove from pubspec.yaml
# - LogInterceptor hardcoded logging
```

### 7.2 Mobile Auth Handoff (Phase 2)

```typescript
// POST /api/auth/mobile-handoff
// Accepts short-lived (60s) signed nonce
// Issues WebView-scoped session cookie
// Flutter passes nonce to WebView via initialHeaders
// Never expose full 7-day JWT to WebView JS context
```

### 7.3 QR Anti-Replay

```typescript
// Server validates QR payload with HMAC-TOTP
const expectedCode = createHmac('sha256', QR_SECRET)
  .update(`${staffId}:${Math.floor(Date.now() / 300000)}`)
  .digest('hex').slice(0, 8);
```

---

## Implementation Order

```
PRE-IMPLEMENTATION (Security Fixes C1-C6)
    │
    ▼
Phase 0: Monorepo ──→ Phase 1: Schema ──→ Phase 2: Marketplace
                                              ├→ Phase 3: Access Routing ──→ Phase 5: Revocation
                                              ├→ Phase 4: Onboarding
                                              └→ Phase 6: Subdomain Sessions
                                         Phase 7: Flutter (needs all backend)
```

---

## Testing Strategy

### Unit Tests
- `packages/auth/session.test.ts` — JWT creation/verification + tokenVersion
- `packages/db/schema.test.ts` — Schema validation
- `src/lib/access-control/routing.test.ts` — Routing logic
- `src/lib/onboarding/activate-defaults.test.ts` — Default activation

### Integration Tests
- `POST /api/marketplace/install` → Assignment created
- `POST /api/marketplace/access-requests` → Routes to dept head
- `PUT /api/marketplace/access-requests/:id` → Role assigned (minimal scope)
- `DELETE /api/marketplace/uninstall` → Revocation + tokenVersion increment

### E2E Tests (Playwright)
1. First login → Welcome modal → Instant apps auto-installed
2. Request access → Dept head dashboard shows pending → Approve → User sees "Installed"
3. Revoke access → App removed, session invalidated, cache cleared

---

## Success Criteria

- [ ] tokenVersion in all JWTs, checked in verifySession() on web + mobile
- [ ] Login rate-limited (5 attempts / 60s per IP)
- [ ] Mobile signup hardcodes role to "staff"
- [ ] Cookie domain configurable via COOKIE_DOMAIN env
- [ ] New user sees 10 instant modules active on first login
- [ ] Marketplace shows correct categories (instant/restricted)
- [ ] Instant apps install in < 2 seconds
- [ ] Restricted apps route to correct department head
- [ ] Approval assigns minimal default role (not blanket admin)
- [ ] Revocation increments tokenVersion → JWT invalid within 5s
- [ ] SSE sends revocation event → client clears cache in 5s
- [ ] Server-side data never deleted on revocation
- [ ] Audit log captures all access changes
- [ ] Cross-subdomain sessions work on `*.thaibahive.com`

---

## Critical Issues Registry

### 🔴 Fix Before Any Production Deployment

| # | Issue | File | Fix |
|---|-------|------|-----|
| C1 | No tokenVersion for JWT invalidation | `src/db/schema.ts` | Add column + verify in session.ts |
| C2 | No rate limiting on login | `src/app/api/auth/login/route.ts` | Add @upstash/ratelimit |
| C3 | Mobile signup accepts role from body | `thaibahive_mobile_app/api/src/routes/auth/index.ts` | Hardcode "staff" |
| C4 | LogInterceptor logs PII in production | `thaibahive_mobile_app/lib/core/network/api_client.dart` | Gate with kDebugMode |
| C5 | Hardcoded localhost URL | `thaibahive_mobile_app/lib/core/constants.dart` | Use flutter_dotenv |
| C6 | No cookie domain configuration | `src/lib/auth/session.ts` | Add COOKIE_DOMAIN env |

### 🟠 Fix Before Multi-Subdomain Launch

| # | Issue | Fix |
|---|-------|-----|
| H1 | No security headers (CSP, HSTS) | Add to next.config.ts headers() |
| H2 | No src/middleware.ts | Create auth redirect middleware |
| H3 | PII in plaintext (Aadhaar, PAN) | AES-256-GCM encryption before prod |
| H4 | CORS not configured | Add *.thaibahive.com allow-origin |
| H5 | Mobile Express exposes stack traces | Generic error message in production |

### 🟡 Plan for Phase 2

| # | Issue | Fix |
|---|-------|-----|
| M1 | 7-day cookie too long | 24h default + "Remember Me" option |
| M2 | QR code replay attacks | HMAC-TOTP 5-min rotating codes |
| M3 | NFC offline queue missing | Add Hive local queue |
| M4 | Schema drift (Next.js vs Express) | Shared @thaiba/db package |
