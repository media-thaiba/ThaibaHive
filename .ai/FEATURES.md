# Feature Registry

Canonical index of the features available in ThaibaHive.

---

## 1. Feature Lifecycle Status Definitions

| Status | Meaning |
|---|---|
| **Planned** | Concept defined, development not started. |
| **In Progress** | Active coding phase. |
| **Complete** | Code integrated, passes verification tests. |
| **Stable** | Production-deployed and verified. |
| **Deprecated** | Scheduled for removal. |
| **Blocked** | Development paused due to external dependencies. |
| **Experimental**| Active prototype, subject to change. |

---

## 2. Active Features Register

| Feature | Path | Status | Dependencies | Owner |
|---|---|---|---|---|
| **Authentication (jose)** | `/app/auth/` | **Stable** | SQLite / Postgres | Core |
| **WebView Nonce Handoff** | `/api/auth/mobile-handoff/` | **Complete** | Flutter Secure Storage | Mobile/Web |
| **Attendance Checking** | `/app/(shell)/attendance/` | **Complete** | Drizzle schemas | Core |
| **Task Kanban** | `/app/(shell)/tasks/` | **Complete** | dnd-kit, Drizzle | Core |
| **Leave Roster** | `/app/(shell)/leaves/` | **Complete** | Zod schemas | Core |
| **Staff Directory** | `/app/(shell)/staff/` | **Complete** | Drizzle schemas | Core |
| **Bookings & Calendar** | `/app/(shell)/bookings/` | **Complete** | Drizzle checks | Operations|
| **Android Widgets** | `thaibahive_mobile_app/...` | **Planned** | Jetpack Glance, Room | Mobile |
| **Media Library Pipeline** | `/app/(shell)/media-library` | **Planned** | FFmpeg, chunks upload | Media |
| **Finance Module** | `/app/(shell)/finance/` | **Planned** | Drizzle postgres | Finance |
