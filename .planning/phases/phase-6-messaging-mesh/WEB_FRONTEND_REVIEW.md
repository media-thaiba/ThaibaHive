# Web & Frontend Architecture Review: Phase 6 (Real-Time Push & Messaging Mesh)

**Review Date**: 2026-10-09  
**Target Milestone**: Phase 6 / v3.36.0 (`feat/phase-6-messaging-mesh`)  
**Reviewer Role**: Web / Frontend Architect & UX Reviewer  
**Status**: APPROVED WITH FRONTEND CONTROLS  

---

## 1. Executive Summary

The Web Chat Center for Next.js 16 (App Router + React 19) provides an integrated, highly performant real-time workspace experience. Key requirements include smooth message rendering via virtualization, unread badge sync, keyboard accessibility (`Cmd+K`, `Enter`, `Esc`), optimistic local echo, and seamless drawer integration into the `ActionCenter`.

---

## 2. Component Architecture & State Hierarchy

### 2.1 State Management & Real-Time Sync
- **`useChatStore` (Zustand / React Context)**:
  - Active channel ID, channels list, channel member map.
  - Per-channel message buffer keyed by `channelId`.
  - Unread counts mapping `{ [channelId: string]: number }`.
  - Presence status map `{ [staffId: string]: 'online' | 'away' | 'offline' }`.
  - Typing indicators map `{ [channelId: string]: Set<string> }`.

### 2.2 Sticky Bottom Scroll & Virtualization
- Use `react-virtuoso` or lightweight flex-col-reverse scrolling for message list:
  - Bottom pin behavior: automatically stay pinned to bottom when new messages arrive *unless* user has explicitly scrolled up > 150px.
  - "New Messages Below" pill indicator when user is reading past history and new messages arrive.
  - Smooth loading state for older message pagination when scrolling to top.

---

## 3. Keyboard Shortcuts & Accessibility (WCAG 2.1 AA)

### 3.1 Global Shortcuts
- `Cmd+K` / `Ctrl+K`: Opens Omnibox with `> Channels` tab pre-filtered.
- `Cmd+Shift+M` / `Ctrl+Shift+M`: Toggle Chat Center drawer.
- `Esc`: Close drawer, cancel active reply, or clear message search.
- `Enter` (without Shift): Send message.
- `Shift+Enter`: Insert newline in textarea.
- `Up Arrow` (in empty input): Quick-edit last sent message.

### 3.2 Focus Management & ARIA
- Modal/Drawer open traps focus appropriately with Radix UI `Dialog` / `Sheet`.
- Live regions: `aria-live="polite"` on message feed container so screen readers announce incoming chat messages without interrupting active speech.
- All interactive icons (send, emoji, attach, pin, mute) have `aria-label` and `title` tooltips.

---

## 4. Optimistic UI & Receipt Progression

- **Send Workflow**:
  1. Generate client UUID `tempId`.
  2. Append message to local state immediately with status `sending` (single hollow checkmark).
  3. Emit over WebSocket.
  4. On Server ACK (`message:ack` or HTTP 201), update message ID to server `id` and status to `sent` (single checkmark).
  5. On `receipt:update` (delivered to recipient), update status to `delivered` (double checkmarks).
  6. On `receipt:update` (read by recipient), update status to `read` (double blue checkmarks).

---

## 5. Rich Content & Attachments
- Safe markdown parsing (links, bold, code blocks, lists) with XSS sanitization (DOMPurify).
- Image lightbox preview with zoom/download controls.
- File attachment chip displaying file name, extension icon, and formatted byte size.
