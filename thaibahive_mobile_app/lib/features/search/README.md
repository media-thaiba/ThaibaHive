# Global Search & Omnibox Module (Mobile)

## Overview
The `features/search` module implements universal, low-latency, cross-entity search and navigation across 15 core domain entity types in ThaibaHive.

## Features
- **15 Entity Types**: Students, Staff, Tasks, Events, Announcements, Daily Reports, Circulars, Polls, Purchase Requests, Help Desk, Bookings, Recognition, Comments, Assets, and Media.
- **Hardware Keyboard Support**: `Ctrl+K` and `Cmd+K` global shortcut triggers.
- **Debounced Network Querying**: 150ms debounce with `CancelToken` lifecycle management to prevent race conditions and conserve bandwidth.
- **Offline & Connectivity Awareness**: Gracefully detects offline state and switches to local history and cached guidance.
- **Recent Searches**: Hive-persisted recent search history (capped at 10 items FIFO).
- **Hybrid Routing Dispatch**:
  - `native`: Direct in-app navigation via `GoRouter` (`/tasks/:id`, `/staff/:id`, etc.).
  - `handoff`: Secure stateless nonce exchange into WebView (`/handoff?path=...&title=...`).
- **Accessibility & UX**: Meets 48dp touch target guidelines and provides WCAG-compliant `Semantics` labels.
