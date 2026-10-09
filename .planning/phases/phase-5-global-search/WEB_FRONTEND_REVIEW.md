# Web / Frontend Architecture Review — Phase 5: Global Search & Omnibox

**Reviewer**: Antigravity Web Architecture Specialist  
**Date**: 2026-10-09  
**Phase**: Phase 5 (Global Search & Omnibox Command Center)  
**Status**: Approved with Recommendations  

---

## 🔍 Executive Summary

The Phase 5 plan establishes an enterprise-grade `Cmd+K` / `Ctrl+K` universal search and omnibox experience across both Web and Mobile surfaces. This review evaluates the Web / Frontend architecture in `src/components/layout/command-palette.tsx`, `src/hooks/use-global-search.ts`, and navigation integration.

---

## 📋 Detailed Findings & Recommendations

### 1. `AbortController` & Race Condition Prevention (High Priority)
- **Finding**: Rapid typing can dispatch multiple concurrent fetch requests. Out-of-order network responses can overwrite results of a newer query with stale results of an older query.
- **Fix**: In `useGlobalSearch(query)`, instantiate an `AbortController` on each query effect. Abort active controllers on effect cleanup / subsequent keystrokes, and ignore `AbortError` in catch handlers.

### 2. ARIA & Screen Reader Accessibility (A11y)
- **Finding**: Command palettes require combobox semantics for full WCAG 2.1 AA compliance.
- **Fix**:
  - Root container: `role="combobox"`, `aria-expanded="true"`, `aria-haspopup="listbox"`.
  - Input: `aria-autocomplete="list"`, `aria-controls="search-results-listbox"`, `aria-activedescendant={selectedItemId}`.
  - Results List: `role="listbox"`, `id="search-results-listbox"`.
  - Items: `role="option"`, `aria-selected={isSelected}`.
  - Live Region: Add visually hidden `<div aria-live="polite" className="sr-only">` announcing count (e.g., "12 results found for tasks").

### 3. Canonical Workspace Route Alignment (Phase 1.5 Parity)
- **Finding**: Result item click actions must route strictly to Phase 1.5 workspace URLs (`/my-work/*`, `/operations/*`, `/school/*`, `/admin/*`) rather than deprecated legacy root paths.
- **Fix**: Wire entity routes:
  - Tasks $\to$ `/my-work/tasks/:id`
  - Leaves $\to$ `/my-work/leaves/:id`
  - Announcements $\to$ `/my-work/announcements/:id`
  - Events $\to$ `/my-work/events/:id`
  - Bookings $\to$ `/operations/bookings/:id`
  - Students $\to$ `/school/students/:id`
  - Staff $\to$ `/admin/staff/:id`
  - Media $\to$ `/operations/media-library`

### 4. Recent Searches Lifecycle & Cache Strategy
- **Finding**: Recent searches should persist across sessions without blocking render.
- **Fix**: Store in `localStorage` under `thaibahive_recent_searches_v1`, capped at 10 items FIFO. Provide single-item delete and "Clear History" actions.

### 5. Skeleton Loading & Zero Layout Shift
- **Finding**: Async search results should not cause layout jump while user is typing.
- **Fix**: Display fixed-height `<Skeleton>` placeholders in the entities section during loading states, maintaining input focus throughout.

---

## ✅ Verdict
All web/frontend requirements are well-architected. The plan is **APPROVED** to proceed with execution.
