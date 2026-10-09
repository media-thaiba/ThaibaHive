# Mobile & Real-Time Sync Architecture Review: Phase 6 (Real-Time Push & Messaging Mesh)

**Review Date**: 2026-10-09  
**Target Milestone**: Phase 6 / v3.36.0 (`feat/phase-6-messaging-mesh`)  
**Reviewer Role**: Flutter & Mobile Architecture Reviewer  
**Status**: APPROVED WITH ARCHITECTURAL ENHANCEMENTS  

---

## 1. Executive Summary

The mobile architecture for Phase 6 expands the Flutter companion app to support native real-time chat with offline-first persistence, seamless WebSocket/SSE reconnection, optimistic UI rendering, and FCM deep-link dispatch.

This review defines the operational contracts for the connection lifecycle, Hive outbox drain sequencing, pagination stability, and push notification routing.

---

## 2. Connection Lifecycle & Reconnection Management

### 2.1 Background / Foreground Transitions
- **WebSocket Grace Timer**: When app moves to `AppLifecycleState.paused` or `inactive`, keep the WebSocket alive for **15 seconds** before closing to avoid thrashing during quick app switches.
- **Immediate Resume & Catch-Up**: On `AppLifecycleState.resumed`, if socket was disconnected:
  1. Re-establish WebSocket connection with JWT from `FlutterSecureStorage`.
  2. Send catch-up sync query with cursor `last_synced_message_id` or timestamp to fetch missed messages.
  3. Drain offline outbox queue.

### 2.2 Reconnect Backoff & Fallback
- Reconnection attempts must use exponential backoff with full jitter:
  $$\text{Delay} = \min(60\text{s}, 2^{\text{attempt}} \times 1\text{s}) \times (0.5 + 0.5 \times \text{rand}())$$
- If WebSocket fails 3 consecutive handshake attempts, transparently fall back to SSE streaming (`/api/chat/sse` or `/api/chat/subscribe`) + REST fallback for sending messages.

---

## 3. Offline Outbox & SyncCoordinator Integration

### 3.1 Hive Outbox Box Contract (`chat_outbox`)
- Schema:
  ```dart
  class ChatOutboxItem {
    final String tempId; // UUID v4 generated locally
    final String channelId;
    final String content;
    final String messageType; // text, image, file
    final String? replyToId;
    final String? localAttachmentPath;
    final DateTime createdAt;
    final int retryCount;
    final String status; // pending, sending, failed, conflicted
    final String? serverId;
  }
  ```

### 3.2 Temp-to-Server ID Mapping & Local Echo
- When user presses send:
  1. Generate `tempId` and insert into local Hive message box with `status: sending`.
  2. Render immediately in `ChatScreen` with clock/sending icon.
  3. Send over active WebSocket or enqueue into `chat_outbox`.
  4. On server ACK / REST response (`{ tempId, id, createdAt, ... }`), replace `tempId` with `serverId` in place and update status to `sent` without triggering a full list rebuild.

### 3.3 Drain Sequencing in `SyncCoordinator`
- Register `ChatOutboxDrain` as Step 3 in the global sync sequence:
  1. Media Outbox Drain
  2. Attendance Drain
  3. **Chat Outbox Drain**
  4. Analytics / Telemetry Drain

---

## 4. UI Virtualization & Scroll Anchoring

### 4.1 Reverse `ListView.builder`
- Set `reverse: true` on `ListView.builder` so `index: 0` is pinned to the bottom (newest message).
- Keyboard appearance and new incoming messages naturally push content upward without jitter or manual scroll calculations.
- Implement scroll listener for pagination: when `scrollController.position.pixels >= scrollController.position.maxScrollExtent - 200`, trigger `fetchOlderMessages(channelId, beforeCursor)`.

### 4.2 Accessibility & Ergonomics
- Ensure all interactive elements (send button, attachment icon, reaction buttons) meet minimum **48x48 dp** touch target guidelines.
- Add `Semantics` labels: `"Message from {senderName}, {time}: {content}. Status: {status}"`.
- Support Dynamic Type scaling without clipping message bubbles.

---

## 5. FCM Push Notification Tap & Badge Dispatch

### 5.1 Deep Link Routing
- FCM payload:
  ```json
  {
    "channelId": "uuid-here",
    "messageId": "uuid-here",
    "type": "chat_message",
    "deepLink": "thaibahive://chat/uuid-here"
  }
  ```
- **Cold Start**: `FirebaseMessaging.instance.getInitialMessage()` → buffer route → `flushBufferedRoute` via `GoRouter.go('/chat/:id')`.
- **Background Tap**: `FirebaseMessaging.onMessageOpenedApp` → `GoRouter.go('/chat/:id')`.

### 5.2 Background Badge Counter
- Maintain local unread channel counters in Hive.
- Background isolate increments channel badge upon receiving data message and updates application icon badge if supported.
