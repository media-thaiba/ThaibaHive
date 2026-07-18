# Global Performance Rules

Guidelines to ensure responsive client rendering, optimized data fetching, and minimal bundle sizes.

---

## 1. Caching & Server State
- Use **TanStack Query** (React Query) for managing client server-state. Do not copy server responses to local components state unless mutating.
- Enable appropriate stale-time configurations to prevent excessive refetches.

## 2. Dynamic Imports & Lazy Loading
- Lazy-load heavy widgets, charts, and calendar instances using Next.js `dynamic()` utility.
- Use `React.memo` for expensive list elements containing hundreds of items (e.g. staff directory search list).

## 3. Search & Ingestion Debouncing
- Debounce all text inputs triggering API queries (e.g. search fields). Default debounce threshold: 300ms.

## 4. API Pagination
- All list API endpoints must support pagination. Yield a maximum of 50 items per payload by default.
