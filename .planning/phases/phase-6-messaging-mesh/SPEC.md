# Phase 6 SPEC: Real-Time Push & Bi-Directional Messaging Mesh (Draft v2)

**Milestone**: ThaibaHive v3.36.0  
**Ambiguity Score**: 1/10 (Low — Full architecture & review signed off)  
**Status**: APPROVED POST-REVIEW  

---

## 1. What This Phase Delivers

### 1.1 Staff & Faculty Experience
- **Channel List Drawer**: Collapsible sidebar with unread badges, pinned channels, and 1:1 Direct Messages.
- **Thread & Chat View**: Full chat history with virtualized rendering, image preview, file download, and replies.
- **Send & Optimistic Local Echo**: Instant UI echo (`tempId`) transitioning to server confirmation with progressive read receipts (`✓` sent → `✓✓` delivered → blue `✓✓` read).
- **Mentions & Typing**: `@name` autocomplete triggering push notifications; 800ms debounced typing indicators.
- **Keyboard Shortcuts**: `Cmd+K` channel search, `Cmd+Shift+M` chat drawer toggle, `Esc` dismiss, `Enter` send.

### 1.2 Parent & Student Experience
- **Announcements Channel**: Read-only institution broadcasts delivered via push and real-time feed.
- **Direct Messages**: 1:1 communication with assigned teachers/advisors (governed by role permissions).
- **Mobile Experience**: Offline message caching in Hive, background badge count synchronization, and deep linking from push notifications.

### 1.3 Administrator Experience
- **Channel Moderation**: Role `chat:admin:moderate` can archive channels, delete offensive messages (with payload redaction), and manage membership.
- **Audit Ledger**: Comprehensive audit logging for channel actions and message deletions.

---

## 2. Explicit Exclusions (Out of Scope for Phase 6)

| Excluded Feature | Scheduled Milestone |
|------------------|---------------------|
| End-to-End Encryption (E2EE) | v3.38 (Post-MVP Security Expansion) |
| WebRTC Voice/Video Calling | Phase 8 (Media & Hardware Milestone) |
| Autonomous AI Bot Agents in Chat | Phase 7 (AI Copilot V2 Integration) |
| Custom Sticker / Reaction Packs | v3.37 (UX Polish Milestone) |

---

## 3. Database Schema Contract

### 3.1 `chat_channels`
```sql
CREATE TABLE chat_channels (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'direct' | 'group' | 'announcement'
  created_by TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  avatar_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX chat_channels_inst_type_idx ON chat_channels(institution_id, type, is_active);
```

### 3.2 `chat_members`
```sql
CREATE TABLE chat_members (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' | 'admin' | 'member'
  joined_at TEXT NOT NULL,
  last_read_at TEXT,
  muted_until TEXT
);
CREATE UNIQUE INDEX chat_members_channel_staff_idx ON chat_members(channel_id, staff_id);
```

### 3.3 `chat_messages`
```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  client_message_id TEXT,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'image' | 'file' | 'system'
  reply_to_id TEXT,
  attachment_url TEXT,
  edited_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX chat_messages_channel_created_idx ON chat_messages(channel_id, created_at DESC, id DESC);
CREATE INDEX chat_messages_inst_channel_idx ON chat_messages(institution_id, channel_id);
CREATE INDEX chat_messages_client_id_idx ON chat_messages(sender_id, client_message_id);
```

### 3.4 `chat_receipts`
```sql
CREATE TABLE chat_receipts (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'delivered', -- 'delivered' | 'read'
  delivered_at TEXT NOT NULL,
  read_at TEXT
);
CREATE UNIQUE INDEX chat_receipts_msg_staff_idx ON chat_receipts(message_id, staff_id);
```

---

## 4. REST & WebSocket API Specification

### 4.1 REST API
- `GET /api/chat/channels`: Returns user's active channels with unread count and latest message snippet.
- `POST /api/chat/channels`: Create DM or group channel. Validates member institution affiliation.
- `GET /api/chat/channels/:id`: Channel details, metadata, and active member list.
- `PATCH /api/chat/channels/:id`: Update channel name or avatar (owner/admin only).
- `DELETE /api/chat/channels/:id`: Soft-archive channel (owner/admin or moderator).
- `POST /api/chat/channels/:id/members`: Add member(s) to group channel. (Blocked on DMs).
- `DELETE /api/chat/channels/:id/members/:staffId`: Remove member from channel.
- `GET /api/chat/channels/:id/messages`: Paginated message history using cursor (`before`, `limit`).
- `POST /api/chat/channels/:id/messages`: Send message (supports `clientMessageId` idempotency).
- `PATCH /api/chat/messages/:id`: Edit message within 15-minute window by author.
- `DELETE /api/chat/messages/:id`: Soft-delete message with payload redaction.
- `POST /api/chat/messages/:id/read`: Batch mark messages as read and broadcast receipt updates.
- `GET /api/chat/presence`: Get presence status of users sharing mutual channels with caller.

### 4.2 WebSocket Protocol (`/api/chat/ws`)
- **Handshake**: Authenticated via JWT session cookie or Bearer token header. Handshake rejected with 401 if invalid.
- **Client Frame**:
  - `join`: `{ type: "join", channelId: string }`
  - `leave`: `{ type: "leave", channelId: string }`
  - `message`: `{ type: "message", channelId: string, content: string, clientMessageId: string, type: "text"|"image"|"file", replyToId?: string }`
  - `typing:start`: `{ type: "typing:start", channelId: string }`
  - `typing:stop`: `{ type: "typing:stop", channelId: string }`
  - `read`: `{ type: "read", messageIds: string[] }`
- **Server Frame**:
  - `message:new`: `{ type: "message:new", payload: ChatMessage }`
  - `message:ack`: `{ type: "message:ack", clientMessageId: string, id: string, createdAt: string }`
  - `message:edit`: `{ type: "message:edit", payload: ChatMessage }`
  - `message:delete`: `{ type: "message:delete", messageId: string }`
  - `receipt:update`: `{ type: "receipt:update", messageId: string, staffId: string, status: "delivered"|"read", timestamp: string }`
  - `presence:update`: `{ type: "presence:update", staffId: string, status: "online"|"away"|"offline", channelId: string }`
  - `typing:update`: `{ type: "typing:update", staffId: string, channelId: string, isTyping: boolean }`

---

## 5. Mobile & Offline Synchronization Protocol

### 5.1 Hive Local Boxes
1. `chat_channels`: Local channel cache with metadata and unread count.
2. `chat_messages`: Local message cache indexed by `channelId`.
3. `chat_outbox`: Pending message mutation queue for offline dispatch.

### 5.2 Outbox Drain Sequence
`SyncCoordinator` executes the registered drain handler `ChatOutboxDrain` as Step 3 in the global synchronization lifecycle upon network restoration.