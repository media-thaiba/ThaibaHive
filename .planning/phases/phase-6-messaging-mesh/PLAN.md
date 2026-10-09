# Phase 6: Real-Time Push & Bi-Directional Messaging Mesh (Draft v2 - Post-Review)

**Milestone**: ThaibaHive v3.36.0 — Real-Time Communication Layer  
**Branch**: `feat/phase-6-messaging-mesh`  
**Base**: `v3.35.0` (Two-Tier Platform complete: Capabilities, Today Hub, Media Offline, Deep Links, Global Search)  
**Status**: APPROVED & READY FOR IMPLEMENTATION  
**Review Sign-Off**:
- [x] Security & Backend Reviewer (`SECURITY_REVIEW.md`)
- [x] Mobile & Real-Time Sync Reviewer (`MOBILE_UX_REVIEW.md`)
- [x] Web & Frontend Architecture Reviewer (`WEB_FRONTEND_REVIEW.md`)

---

## 1. Executive Summary

Phase 6 introduces a fully resilient, multi-tenant **bi-directional messaging mesh** with persistent channels, thread history, read receipts, real-time WebSocket/SSE streaming, and cross-platform parity across Web (Next.js 16) and Mobile (Flutter Companion).

### Core Features & Values
- **Multi-Tenant Scoping**: All messages, channels, members, and receipts enforce `institution_id` boundaries with zero-leak isolation.
- **WebSocket Handshake Security**: JWT signature and revocation verified *during* HTTP upgrade handshake with fallback to SSE.
- **Optimistic UI & Offline Outbox**: Local client echo with temporary UUIDs transitioning to server IDs; Flutter `ChatOutbox` drained via `SyncCoordinator`.
- **FCM Aggregation & Deep Links**: Grouped notifications with payload routing (`thaibahive://chat/:id`).
- **Web & Mobile UX**: Virtualized feeds, `@` mentions, read receipts (`✓`, `✓✓`, blue `✓✓`), presence and typing indicators.

---

## 2. Work Breakdown & Commit Waves

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PHASE 6 EXECUTION WAVES                       │
├─────────────────────────────────────────────────────────────────────────┤
│ Wave 1 (Commit 1): Database Schema, Parity Migrations & RBAC Matrix    │
│ Wave 2 (Commit 2): Real-Time WebSocket/SSE Mesh & Pub/Sub Broker       │
│ Wave 3 (Commit 3): REST API Route Handlers, Zod Validation & Guards     │
│ Wave 4 (Commit 4): FCM Multicast Engine, Aggregation & Deep Linking    │
│ Wave 5 (Commit 5): Web Chat Center (Drawer, Virtualized List, Mentions) │
│ Wave 6 (Commit 6): Flutter Mobile Chat, Hive Outbox & SyncCoordinator   │
│ Wave 7 (Commit 7): End-to-End Test Verification, A11y & Release Docs    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Wave Details & Deliverables

### Wave 1: Database Schemas, Migrations & RBAC (Commit 1)
- **Files**:
  - `packages/db/schema.ts` (SQLite)
  - `packages/db/schema.pg.ts` (PostgreSQL)
  - `packages/auth/roles.ts`
  - `packages/db/__tests__/schema-drift.test.ts`
- **Tables**:
  - `chatChannels`: `id`, `institutionId` (FK), `name`, `type` (`direct`|`group`|`announcement`), `createdBy`, `avatarUrl`, `isActive`, `createdAt`, `updatedAt`
  - `chatMembers`: `id`, `channelId` (FK), `staffId` (FK), `role` (`owner`|`admin`|`member`), `joinedAt`, `lastReadAt`, `mutedUntil`
  - `chatMessages`: `id`, `institutionId` (FK), `channelId` (FK), `senderId` (FK), `clientMessageId`, `content`, `type` (`text`|`image`|`file`|`system`), `replyToId`, `attachmentUrl`, `editedAt`, `deletedAt`, `createdAt`
  - `chatReceipts`: `id`, `messageId` (FK), `staffId` (FK), `status` (`sent`|`delivered`|`read`), `deliveredAt`, `readAt`
- **Indexes**:
  - Composite `(institution_id, type, is_active)` on `chat_channels`
  - Composite `(institution_id, channel_id, created_at DESC)` on `chat_messages`
  - Composite `(channel_id, staff_id)` unique constraint on `chat_members`
  - Composite `(sender_id, client_message_id)` on `chat_messages`
- **RBAC Permissions**:
  - `chat:channels:create`, `chat:channels:view`, `chat:channels:moderate`, `chat:messages:send`, `chat:messages:read`, `chat:messages:delete_own`, `chat:admin:moderate`, `chat:presence:read` mapped across all 5 tiers + `accounts`/`purchase`.

### Wave 2: Real-Time Transport & Pub/Sub Mesh (Commit 2)
- **Files**:
  - `src/lib/chat/ws-server.ts`
  - `src/lib/chat/pubsub-broker.ts`
  - `src/lib/chat/presence-engine.ts`
  - `src/app/api/chat/ws/route.ts`
  - `src/app/api/chat/sse/route.ts`
- **Features**:
  - Handshake JWT verification via `getJwtSecretBytes("session")`.
  - Channel subscription and fan-out via in-memory/Redis Pub/Sub broker.
  - Heartbeat (30s) + disconnect detection (60s timeout).
  - Mutual-channel presence scoping and typing indicator debouncing.

### Wave 3: REST API Route Handlers & Security Guards (Commit 3)
- **Files**:
  - `src/app/api/chat/channels/route.ts`
  - `src/app/api/chat/channels/[id]/route.ts`
  - `src/app/api/chat/channels/[id]/members/route.ts`
  - `src/app/api/chat/channels/[id]/messages/route.ts`
  - `src/app/api/chat/messages/[id]/route.ts`
  - `src/app/api/chat/messages/[id]/read/route.ts`
  - `src/app/api/chat/presence/route.ts`
  - `src/lib/validation/schemas.ts`
- **Security Controls**:
  - Wrapped with `requireAuth(handler, "chat:...")`.
  - Multi-tenant query enforcement using `resolveScopedInstitutionId(session, request)`.
  - Member verification against `staffInstitutions`.
  - Message edit limited to 15-minute window for author.
  - Soft-delete redacts payload to `"[Message deleted]"`.

### Wave 4: FCM Multicast Engine (Commit 4)
- **Files**:
  - `src/lib/notifications/fcm-chat-notifier.ts`
  - `src/app/api/chat/channels/[id]/messages/route.ts` (trigger hook)
- **Features**:
  - Multicast push to active channel members (excluding sender).
  - 30-second aggregation buffer to prevent push spam.
  - Deep-link payload formatting: `thaibahive://chat/{channelId}`.

### Wave 5: Web Chat Center (Commit 5)
- **Files**:
  - `src/components/chat/chat-drawer.tsx`
  - `src/components/chat/channel-list.tsx`
  - `src/components/chat/message-thread.tsx`
  - `src/components/chat/message-input.tsx`
  - `src/components/chat/read-receipt-badge.tsx`
  - `src/lib/hooks/use-chat.ts`
- **Features**:
  - Drawer integrated into `ActionCenter` / App Shell.
  - Virtualized message stream with sticky bottom scroll.
  - `@` mention autocomplete & optimistic local echo.
  - Keyboard shortcuts (`Cmd+K`, `Enter`, `Esc`, `Shift+Enter`).

### Wave 6: Flutter Mobile Chat Module (Commit 6)
- **Files**:
  - `thaibahive_mobile_app/lib/features/chat/domain/channel_model.dart`
  - `thaibahive_mobile_app/lib/features/chat/domain/message_model.dart`
  - `thaibahive_mobile_app/lib/features/chat/data/chat_outbox.dart`
  - `thaibahive_mobile_app/lib/features/chat/presentation/channel_list_screen.dart`
  - `thaibahive_mobile_app/lib/features/chat/presentation/chat_screen.dart`
  - `thaibahive_mobile_app/lib/core/services/sync_coordinator.dart` (drain step 3)
  - `thaibahive_mobile_app/lib/app/router.dart` (route `/chat` and `/chat/:id`)
- **Features**:
  - Reverse `ListView.builder` scroll anchoring.
  - Hive caching (`chat_channels`, `chat_messages`, `chat_outbox`).
  - Optimistic `tempId` -> `serverId` replacement.
  - 15s background lifecycle grace timer before disconnect.
  - FCM tap routing via `GoRouter`.

### Wave 7: Verification, A11y & Release Documentation (Commit 7)
- **Files**:
  - `src/lib/chat/__tests__/*.test.ts`
  - `thaibahive_mobile_app/test/features/chat/*.dart`
  - `CHANGELOG.md`
  - `docs/api/chat-messaging.md`
- **Validation**:
  - Run all 14 Quality Gates.

---

## 4. Quality & Security Verification Gates

| # | Gate | Verification Command | Target |
|---|------|----------------------|--------|
| 1 | TypeScript | `pnpm typecheck` | 0 errors |
| 2 | ESLint | `pnpm lint` | 0 errors |
| 3 | Jest Unit Tests | `pnpm test` | 100% pass |
| 4 | RBAC Audit | `pnpm security:rbac` | 100% mapped (0 unmapped) |
| 5 | RequireAuth Audit | `pnpm security:requireauth` | 0 naked handlers |
| 6 | Tenant Isolation | `pnpm security:tenants` | 100% isolated, 0 leaks |
| 7 | Schema Parity & Drift | `pnpm test packages/db/__tests__/schema-drift.test.ts` | 100% table & column match |
| 8 | Flutter Analyze | `cd thaibahive_mobile_app && flutter analyze` | 0 errors, 0 warnings |
| 9 | Flutter Tests | `cd thaibahive_mobile_app && flutter test` | 100% pass |
| 10 | Next.js Build | `pnpm build` | Clean standalone build |
| 11 | Accessibility Audit | `pnpm a11y:audit` | WCAG 2.1 AA compliant |