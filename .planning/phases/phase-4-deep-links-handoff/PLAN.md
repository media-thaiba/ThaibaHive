# Phase 4: Deep Links & Seamless Auth Handoff — "One Link, Any Screen"

**Milestone**: ThaibaHive Two-Tier Platform  
**Phase**: 4 of 5 (post-Freeze roadmap: 1 Capabilities & Nav → 2 Today & Action Center → 3 Media Queue & Offline → **4 Deep Links & Auth Handoff** → 5 Global Search)  
**Status**: Ready for Execution (Draft v2, post-review findings incorporated)  
**Estimated Duration**: 3-4 days  
**Dependencies**: Phase 1 (Capabilities & Nav), Phase 2 (Today & Action Center), Phase 3 (Media Queue & Offline) — all merged to `master`  

---

## 🎯 Executive Summary & Objective

In the ThaibaHive two-tier platform, staff navigate fluidly across two execution surfaces:
- **Mobile ("Do & Know")**: Native Flutter app optimized for high-frequency operations, offline punch & media staging, glanceable action cards, and notifications.
- **Web ("Manage & Analyse")**: Next.js desktop workspace for complex spreadsheets, batch timetable editors, ERP configuration, and comprehensive analytics.

**The Problem Today**:
1. **Broken Deep Links & Path Mismatch**: Phase 1.5 migrated the canonical web routes to workspace-scoped paths (`/my-work/*`, `/operations/*`, `/school/*`, `/admin/*`). However, the mobile `GoRouter`, `_allowedRoutePrefixes` in `FCMService`, and universal link manifests (`apple-app-site-association` and `assetlinks.json`) still point to flat legacy paths (`/tasks`, `/leaves`, `/assets`). When a user clicks a universal link `https://thaibahive.app/my-work/tasks/123` or opens a notification, the router fails or falls back to `/`.
2. **Fatal Nonce Mismatch & In-Memory Map Bug**: `mobile-nonce-service.ts` generated an in-memory random hex string (`mhn_<hex>`), while `POST /api/auth/mobile-handoff` expects an HMAC-signed JWT verified via `jwtVerify`. In production and serverless deployments, all handoff requests fail with 401 `invalid_nonce`.
3. **Edge Proxy Blocking Public Manifests (`.well-known`)**: In `src/proxy.ts`, `exactPublicPaths` and `prefixPublicPaths` omit `/.well-known/` and `/apple-app-site-association`, redirecting Apple CDN and Google Play verification bots to `/auth/login` and breaking Universal Links.
4. **WebView Cookie Handoff Bug**: In `WebViewHandoffScreen`, `_extractCookieValue(setCookieHeader)` returns `thaibahive_session=<token>` as the value string, which when passed to `WebViewCookie(name: 'thaibahive_session', value: ...)` results in a duplicated key `Cookie: thaibahive_session=thaibahive_session=<token>`, breaking session authentication on web pages.
5. **Universal Links Discarded on Mobile**: `FCMService.handleUriLink` checks `if (uri.scheme != 'thaibahive') return;`, immediately dropping all incoming `https://thaibahive.app/...` Universal/App Links.
6. **Tier-3 Web Handoff Actions Suppressed**: Phase 2 explicitly filtered out quick actions and action items marked `requiresWebHandoff: true`. In Phase 4, Tier 3 capabilities (e.g., Timetable management, Advanced Payroll, Fleet dispatch) must be exposed on mobile as authenticated seamless WebView handoffs.
7. **Nonce Cleanup Cron Failures**: The scheduled `Nonce Cleanup` workflow fails in CI due to missing environment variables and reliance on expired human tokens instead of machine `x-cron-secret`.

---

## 📐 Architecture & Key Design Decisions

### D1. Universal Link, App Link & Scheme Routing
```
Incoming URL (Universal Link / Scheme / FCM Notification)
  │
  ├─ URL Parser: Extract Path & Query (e.g. /my-work/tasks/123, /school/timetable, thaibahive://operations/assets/456)
  │
  ├─ Workspace Route Normalizer:
  │   ├─ Native Mobile Tier 1/2 Match:
  │   │    - /my-work/tasks/:id        ──►  /tasks/:id (Native Tasks Screen)
  │   │    - /my-work/tasks            ──►  /tasks (Native Tasks List)
  │   │    - /my-work/leaves/:id       ──►  /leaves/:id (Native Leaves Screen)
  │   │    - /my-work/leaves           ──►  /leaves (Native Leaves List)
  │   │    - /my-work/attendance       ──►  /attendance (Native Attendance Punch Screen)
  │   │    - /my-work/announcements/:id──►  /announcements/:id (Native Screen)
  │   │    - /my-work/approvals        ──►  /approvals (Native Approvals Screen)
  │   │    - /my-work/events/:id       ──►  /events/:id (Native Event Screen)
  │   │    - /my-work/expenses         ──►  /expenses (Native Expenses Screen)
  │   │    - /my-work/reports          ──►  /reports (Native Reports Screen)
  │   │    - /operations/assets/:id    ──►  /assets/:id (Native Asset Screen)
  │   │    - /operations/bookings/:id  ──►  /bookings/:id (Native Bookings Screen)
  │   │    - /operations/media-library  ──►  /media (Native Media Screen)
  │   │    - /operations/finance/purchases/:id ──► /finance/purchases/:id (Native Approval Screen)
  │   │    - /sync-status              ──►  /sync-status (Native Sync Status Screen)
  │   │
  │   └─ Web-Only Tier 3 Match:
  │        - /school/*                 ──►  WebViewHandoffScreen(targetPath: '/school/...', title: 'School Workspace')
  │        - /admin/*                  ──►  WebViewHandoffScreen(targetPath: '/admin/...', title: 'Admin Console')
  │        - /operations/fleet/*       ──►  WebViewHandoffScreen(targetPath: '/operations/fleet/...', title: 'Fleet')
  │        - /operations/finance/* (unhandled) ──► WebViewHandoffScreen(targetPath: '...', title: 'Finance Workspace')
```

### D2. Cryptographic Nonce Handoff Protocol
```
Mobile App (Authenticated)              Web Server (Next.js)                 Embedded WebView / Browser
   │                                           │                                         │
   │── 1. POST /api/auth/mobile-handoff/nonce ─►│                                         │
   │      (Bearer JWT, { targetUrl })          │                                         │
   │                                           │ Validate session, rate-limit,           │
   │                                           │ mint short-lived (60s) HMAC SHA-256 JWT │
   │                                           │ with jti, staffId, tokenVersion, exp    │
   │◄── 2. Returns { nonce, expiresAt } ───────│                                         │
   │                                           │                                         │
   │── 3. POST /api/auth/mobile-handoff ───────►│                                         │
   │      (Bearer <nonce>, ?redirect=<path>)   │                                         │
   │                                           │ Verify nonce JWT signature,             │
   │                                           │ check tokenVersion against DB,          │
   │                                           │ atomic insert into usedNonces (replay), │
   │                                           │ sanitize relative redirect path,        │
   │                                           │ mint session cookie & return 302        │
   │◄── 4. Set-Cookie + 302 Location Header ───│                                         │
   │                                                                                     │
   │── 5. Parse token from Set-Cookie, inject into WebViewCookieManager ────────────────►│
   │── 6. controller.loadRequest(targetUrl) with authenticated session ─────────────────►│ (Authenticated)
```

### D3. Tier-3 Action Center SDUI Serialization
- **`src/lib/mobile/mobile-serializer.ts`**:
  - Update `toActionCenterPayload` and `quickActions` serializer to include capabilities where `requiresWebHandoff(id) === true`.
  - Provide `requiresWebHandoff: true`, `route: "/handoff"`, and `handoffUrl: cap.webRoute`.
- **Flutter Action Center / QuickActionCard**:
  - Tapping a web-handoff card automatically opens `WebViewHandoffScreen(targetPath: action.handoffUrl, title: action.title)`.

---

## 📋 Implementation Steps (6 Commits)

### Commit 1: Server: Stateless HMAC Nonce Service & Endpoint Hardening (`feat(auth)`)
- **`src/lib/auth/mobile-nonce-service.ts`**:
  - Replace in-memory Map with stateless `SignJWT` HMAC SHA-256 token signed via `getJwtSecretBytes("session")` with 60-second expiration and unique `jti`.
- **`src/app/api/auth/mobile-handoff/nonce/route.ts`**:
  - Add rate limiting per user/IP using `checkDistributedRateLimit`.
  - Validate `targetUrl` format.
- **`src/app/api/auth/mobile-handoff/route.ts`**:
  - Ensure strict open-redirect sanitization against dummy origin (rejecting protocol injection `https:`, `//`, `\`, control chars).
  - Verify `usedNonces` atomic unique insert for replay defense.
- **`src/proxy.ts`**:
  - Add `/.well-known/` and `/apple-app-site-association` to public bypass list so Apple/Google bots receive HTTP 200 without redirecting to `/auth/login`.
- **Tests**:
  - `src/app/api/auth/__tests__/mobile-handoff.test.ts` (unit tests for nonce minting, JWT verification, replay rejection, open redirect blocking, rate limiting).

### Commit 2: Server: Universal Link Manifests & Nonce Cleanup Cron Fix (`feat(server)`)
- **`src/app/.well-known/apple-app-site-association/route.ts` & `src/app/apple-app-site-association/route.ts`**:
  - Update AASA paths to include all canonical workspaces: `/my-work/*`, `/operations/*`, `/school/*`, `/admin/*`, `/portal/*`, `/sync-status`, `/`.
- **`src/app/.well-known/assetlinks.json/route.ts`**:
  - Verify package name `com.thaiba.thaibahive` and production SHA-256 fingerprint array.
- **`.github/workflows/cleanup-nonces.yml`**:
  - Fix cron workflow to use machine secret `x-cron-secret: ${{ secrets.CRON_SECRET }}` rather than expiring human tokens.

### Commit 3: Mobile: GoRouter Workspace Route Aliases & Auth Guard Preservation (`feat(mobile)`)
- **`thaibahive_mobile_app/lib/app/router.dart`**:
  - Add canonical workspace route redirects:
    - `/my-work/tasks`, `/my-work/tasks/:id` $\to$ `/tasks`, `/tasks/:id`
    - `/my-work/leaves`, `/my-work/leaves/:id` $\to$ `/leaves`, `/leaves/:id`
    - `/my-work/attendance` $\to$ `/attendance`
    - `/my-work/announcements`, `/my-work/announcements/:id` $\to$ `/announcements`, `/announcements/:id`
    - `/my-work/approvals` $\to$ `/approvals`
    - `/my-work/events`, `/my-work/events/:id` $\to$ `/events`, `/events/:id`
    - `/my-work/expenses` $\to$ `/expenses`
    - `/my-work/reports` $\to$ `/reports`
    - `/operations/assets`, `/operations/assets/:id` $\to$ `/assets`, `/assets/:id`
    - `/operations/bookings`, `/operations/bookings/:id` $\to$ `/bookings`, `/bookings/:id`
    - `/operations/media-library` $\to$ `/media`
    - `/operations/finance/purchases/:id` $\to$ `/finance/purchases/:id`
  - Add web-only catchall routes `/school/*` and `/admin/*` routing to `WebViewHandoffScreen`.
  - Add named `/handoff` route with `path` and `title` query parameters.
  - Update `_authGuard`: Unauthenticated incoming links preserve destination as `/auth/login?redirect=${Uri.encodeComponent(target)}`.
- **`thaibahive_mobile_app/lib/features/auth/presentation/login_screen.dart`**:
  - On successful login, navigate to `redirect` param if present instead of default `/today`.

### Commit 4: Mobile: WebViewHandoffScreen Cookie Fix, PopScope & Error Resilience (`feat(mobile)`)
- **`thaibahive_mobile_app/lib/shared/screens/webview_handoff_screen.dart`**:
  - Fix `_extractCookieValue`: split on `=` to extract only the cookie token value.
  - Wrap scaffold in `PopScope` to support in-WebView back navigation (`controller.canGoBack()` $\to$ `controller.goBack()`).
  - Filter `onWebResourceError` to `error.isForMainFrame ?? true`.
  - Handle 401 by attempting token refresh or showing re-auth affordance.
  - Handle offline state with `AppErrorWidget` and retry.

### Commit 5: Mobile: Deep Linking & FCM Push Notification Routing (`feat(mobile)`)
- **`thaibahive_mobile_app/lib/core/services/fcm_service.dart`**:
  - Update `handleUriLink` to handle both `thaibahive://` and `https://` Universal Links.
  - Save `GoRouter` reference during app initialization to fix background notification tap routing.
  - Update `validateAndWhitelistRoute` to parse URL path with `Uri.parse(rawUrl).path` and support workspace prefixes (`/my-work`, `/operations`, `/school`, `/admin`, `/handoff`, `/sync-status`).
- **`thaibahive_mobile_app/lib/app/app.dart`**:
  - Pass initialized router to `FCMService`.

### Commit 6: Tier-3 Action Center SDUI Serialization & Verification (`feat(sdui)`)
- **`src/lib/mobile/mobile-serializer.ts`**:
  - Include `requiresWebHandoff: true` quick actions and action center items with their `handoffUrl`.
- **`thaibahive_mobile_app/lib/features/action_center/` & `quick_action_card.dart`**:
  - Handle tapping web-handoff items by routing to `/handoff`.
- **Tests**:
  - `test/app/deep_link_routing_test.dart` (workspace routes & handoff router tests).
  - `test/shared/webview_handoff_test.dart` (cookie extraction & PopScope tests).
  - `test/core/fcm_deep_link_test.dart` (URI & notification payload parser tests).

---

## 🧪 Verification Checklist (All Gates)

1. `pnpm exec tsc --noEmit` $\to$ 0 errors
2. `pnpm lint` $\to$ 0 errors
3. `pnpm exec jest` $\to$ All suites pass (including new `mobile-handoff.test.ts`)
4. `pnpm security:rbac` + `pnpm security:requireauth` $\to$ 100% routes covered
5. `pnpm security:tenants` $\to$ 100% tenant isolated
6. `pnpm build` $\to$ Clean production build
7. `flutter analyze` $\to$ 0 errors, 0 warnings
8. `flutter test` $\to$ 100% mobile test suites passing
