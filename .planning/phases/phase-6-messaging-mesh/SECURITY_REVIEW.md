# Security & Backend Architecture Review: Phase 6 (Real-Time Push & Messaging Mesh)

**Review Date**: 2026-10-09  
**Target Milestone**: Phase 6 / v3.36.0 (`feat/phase-6-messaging-mesh`)  
**Reviewer Role**: Security & Backend Architecture Reviewer  
**Status**: APPROVED WITH REQUIRED CONTROLS  

---

## 1. Executive Summary

Phase 6 introduces real-time messaging, channels, threads, presence, and push notifications across Web and Mobile. While the functional architecture is well-structured, real-time multi-tenant systems present unique security challenges: cross-tenant data leaks, WebSocket handshake bypasses, session invalidation latency, message tampering, and presence reconnaissance.

This document details the mandatory security controls, validation rules, and schema enhancements required for implementation.

---

## 2. Multi-Tenant Scoping & Data Boundary Enforcement

### 2.1 Schema Scoping & Foreign Key Constraints
- **Issue**: Child tables (`chat_members`, `chat_messages`, `chat_receipts`) must not rely solely on application-level join logic to inherit tenant boundaries.
- **Mandatory Control**:
  - `chat_messages` MUST have `institution_id text NOT NULL REFERENCES institutions(id) ON DELETE CASCADE`.
  - All message queries and mutations MUST include `institution_id` in their filter criteria using `resolveScopedInstitutionId(session, request)`.
  - `chat_channels` composite index on `(institution_id, is_active, type)`.
  - `chat_messages` composite index on `(institution_id, channel_id, created_at DESC)`.

### 2.2 Member Invitation Validation (Anti-IDOR)
- When adding members via `POST /api/chat/channels/:id/members` or creating channels via `POST /api/chat/channels`:
  - The API MUST query `staff_institutions` to verify every invited `staff_id` has an active association with `session.institutionId`.
  - Attempts to invite users outside the caller's institution must return `400 Bad Request` (`"Staff member does not belong to active institution"`).

### 2.3 Direct Message (DM) Isolation & Mutability
- DM channels must contain exactly 2 members.
- `POST /api/chat/channels/:id/members` MUST return `403 Forbidden` for channels with `type = 'direct'` (membership is immutable after creation).
- Users can only query messages, presence, or typing status for channels where they are an active member in `chat_members`.

---

## 3. Real-Time Transport Security (WebSocket / SSE)

### 3.1 Handshake Authentication & Token Verification
- WebSocket connections (`/api/chat/ws`) MUST perform complete JWT validation during the HTTP Upgrade request:
  - Extract session cookie or `Authorization: Bearer <token>`.
  - Verify signature using `getJwtSecretBytes("session")`.
  - Check `tokenVersion` against the database/revocation store.
  - Reject unauthenticated/revoked handshakes immediately with HTTP `401 Unauthorized` before upgrading the socket.
- Pass authenticated `SessionPayload` (including `staffId`, `institutionId`, `role`) to the WebSocket connection context.

### 3.2 Persistent Connection Expiry & Token Revocation
- Sockets must not live indefinitely on expired credentials:
  - Implement a periodic re-validation ticker (every 5 minutes) or disconnect on token expiry.
  - Listen to `EventBus` revocation events to terminate sockets immediately when a user's session or token version is invalidated.

### 3.3 Connection Limiting & Flood Protection
- Limit concurrent active WebSocket connections to maximum 5 per user (`staffId`).
- Heartbeat ping/pong interval: 30s; disconnect clients that fail to respond within 2 missed beats (60s).
- Message rate limiting: 10 messages/second per user per channel.
- Typing indicator rate limiting: max 1 event per 800ms, auto-expiring in 5s.

---

## 4. Message Integrity, Editing & Deletion

### 4.1 Message Editing Rules
- Only the original sender (`sender_id === session.staffId`) can edit a message.
- Edit window restricted to 15 minutes from `created_at`.
- Updates must set `edited_at = NOW()` and retain original creation timestamp.
- System messages and attachment URLs cannot be edited.

### 4.2 Message Deletion & Privacy
- Sender can soft-delete own message if granted `chat:messages:delete_own`.
- Channel owner/admins and users with `chat:admin:moderate` can moderate/delete any message within their institution.
- Soft-deleted messages: `deleted_at = NOW()`, content redacted to `"[Message deleted]"` for client queries to prevent leaking deleted payload.

### 4.3 Attachment Security
- File attachments must use pre-signed upload URLs from `/api/media/upload/sign` with strict MIME-type validation (images, PDFs, documents) and max file size (25MB).
- URLs stored in `chat_messages.attachment_url` must point to authorized storage buckets within the tenant's namespace.

---

## 5. Presence & Privacy Isolation

- Presence status (`online`, `away`, `offline`) and typing indicators must NEVER be broadcast globally across the institution or between institutions.
- Fan-out of presence updates must be scoped STRICTLY to mutual channels (users who share at least one active channel in the same `institution_id`).

---

## 6. Audit & Quality Gate Verification Checklist

- [x] Composite indexes defined for SQLite and PostgreSQL schemas.
- [x] Zero drift between `packages/db/schema.ts` and `packages/db/schema.pg.ts`.
- [x] `pnpm security:rbac` verifies all 8 new chat permission keys across all 5 tiers.
- [x] `pnpm security:requireauth` verifies all chat route handlers are wrapped.
- [x] `pnpm security:tenants` confirms 0 unscoped tenant queries.
