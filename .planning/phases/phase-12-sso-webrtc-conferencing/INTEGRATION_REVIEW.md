# Phase 12 — Integration & Multi-Platform Review (Track 3A)

**Target Platforms**: Next.js 16 Web (React 19 App Router), Flutter Mobile (Riverpod + GoRouter), Drizzle ORM (SQLite / PostgreSQL)  
**Status**: CONVERGED & APPROVED

---

## 1. Web & Mobile Integration Review

### A. Next.js Web Architecture
1. **Workspace Alignment**:
   - SSO Configuration lands in **🛡️ Administration & Governance** workspace (`/admin/sso`), restricted to `super_admin`, `admin`, and `principal` roles.
   - WebRTC Conferencing lands in **💼 Operations** workspace (`/operations/conferencing`), accessible by all authorized staff, teachers, and coordinators.
2. **Edge Middleware & Session Handshake**:
   - Both SAML ACS (`POST /api/auth/saml/acs`) and OIDC Callback (`GET /api/auth/oidc/callback`) emit standard `auth_token` HTTP-only session cookies signed via `createSessionToken()` from `@thaiba/auth/session`.
   - Edge Middleware verifies the signature via WebCrypto (`jose.jwtVerify`) with zero custom bypasses.
3. **Real-Time Conferencing UI**:
   - Video tile grid with CSS container queries and dynamic active speaker highlighting.
   - WebRTC insertable streams (SFrame) API with fallback to WebRTC DTLS-SRTP when insertable streams are unsupported by legacy browsers.
   - Server-Sent Events client (`useConferenceStream`) with auto-reconnection and heartbeat ping watchdog.

### B. Flutter Mobile Architecture
1. **Enterprise SSO Login Flow**:
   - In-app login screen displays "Sign in with Google" and "Sign in with Microsoft / SAML" buttons.
   - Tapping an SSO provider initiates an authenticated Custom Tab session pointing to `/api/auth/oidc/login?providerId=...&mobile=true`.
   - On successful IdP callback, the server redirects to `/auth/mobile-handoff?nonce=...`.
   - Flutter catches the deep link (`thaibahive://auth/handoff?nonce=...`), exchanges the nonce for the signed JWT via `/api/auth/mobile-handoff/nonce`, and stores the token in `FlutterSecureStorage`.
2. **Mobile Conference Screen (`ConferenceRoomScreen`)**:
   - Built with `flutter_riverpod` state management.
   - Optimized for mobile viewports: 1-on-1 vertical split or multi-peer carousel with floating local preview.
   - Hardware controls: Front/rear camera toggle, mic mute, speakerphone routing, and clean room leave button.

---

## 2. Multi-Campus Federation & Regional Identity Sync

1. **JIT Mapping to Regional Access Grants**:
   - When an external user authenticates via SSO, the mapper checks their institutional domain and group claims.
   - If the user belongs to an affiliated campus in an `institutionCluster` (e.g. Regional Inspector or Visiting Professor), the engine checks `regionalAccessGrants`.
   - If granted, a federated session is established with cross-campus capabilities, allowing instant campus switching without re-authenticating externally.
2. **Security & Boundary Enforcement**:
   - Negative boundary enforcement: External IdP cannot grant permissions beyond the tenant's configured mapping matrix.
   - Multi-tenant IDOR protection: A provider configured for Institution A cannot be invoked with a callback from Institution B.

---

## 3. AST Scanner & Quality Gate Verification

| Scanner | Target | Required Status |
|---|---|---|
| `pnpm typecheck` | Web, Mobile types, DB packages | 0 errors |
| `pnpm lint` | Next.js & TypeScript | 0 errors, 0 warnings |
| `pnpm security:rbac` | `packages/auth/roles.ts` | 7 new keys 100% mapped |
| `pnpm security:requireauth` | All new `/api/**` handlers | 0 naked handlers |
| `pnpm security:tenants` | All new/modified tables | 100% tenant isolated, 0 leaks |
| `schema-drift.test.ts` | SQLite vs PG parity | 100% table and column match |
| `pnpm conference:simulate` | E2E 8-stage harness | 8/8 stages green |
