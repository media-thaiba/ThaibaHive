# PRD — ThaibaHive

## Product Name
ThaibaHive

## Product Tagline
The unified staff management platform for Thaiba Garden Group of Institutions.

## Problem Statement
Thaiba Garden Group of Institutions (23+ campuses, 800–1,000 staff) currently manages attendance, leaves, tasks, reports, announcements, bookings, and IT support through spreadsheets, paper registers, and ad-hoc WhatsApp messages. This causes data silos, delayed approvals, lost records, and no single source of truth for staff operations.

## Solution
A single web-based platform where every staff member — from teachers to directors — manages their daily work, communicates official updates, and accesses institutional services from one place.

## Target Users

| Role | Count | Primary Use |
|------|-------|-------------|
| **Staff** (teachers, admin) | ~750 | Mark attendance, view tasks, apply leaves, check announcements |
| **HOD** (department heads) | ~40 | Approve leaves/tasks, manage department reports, assign work |
| **Principal** | ~23 | Institution-wide oversight, approvals, announcements |
| **Admin** (IT/HR) | ~10 | System management, staff onboarding, asset tracking |
| **Super Admin** (Director Office) | 2–3 | Cross-institution oversight, financial summaries, audit logs |

## Core Features (Current Build)

### 1. Authentication & Profile
- Email + password login with JWT sessions
- Staff signup with employee ID
- Profile management (personal info, qualifications, bank details, emergency contact)
- Role-based access control (5 roles)

### 2. Attendance
- Manual check-in / check-out
- NFC tag and QR code methods (schema ready)
- Late/early exit tracking with grace periods
- Shift-based scheduling
- Daily attendance overview for managers

### 3. Leave Management
- Multiple leave types (casual, sick, earned, etc.)
- Leave balance tracking per staff per year
- Multi-stage approval workflow (HOD → Admin → Director)
- Leave request with reason, date range, auto day count

### 4. Task Management
- Create, assign, track tasks
- Kanban board (todo → in_progress → review → completed)
- Priority levels (low, medium, high, urgent)
- Task comments and due dates
- Department-scoped task views

### 5. Daily Reports
- Staff submit end-of-day reports
- Link tasks to reports with hours spent
- Manager review workflow

### 6. Announcements
- Create with priority levels (low, normal, high, urgent)
- Target by role, department, or institution
- Read receipts tracking
- Pinned announcements

### 7. Events
- Institution/department events with date, time, location
- RSVP tracking (attending, declined, maybe)
- Holiday and meeting types

### 8. Circulars & Documents
- Upload official documents (PDF, images)
- Category and department tagging
- Target by role, department, or institution

### 9. Polls & Surveys
- Create polls with multiple options
- Target by role, department, or institution
- One vote per staff, expiration dates

### 10. Help Desk / IT Support
- Ticket creation with category and priority
- Assignment to IT staff
- Comment threads per ticket
- Status tracking (open → in_progress → resolved → closed)

### 11. Bookings
- Book rooms, equipment, shared resources
- Availability check
- Approval workflow

### 12. Asset Management
- Track institutional assets (QR-tagged)
- Purchase/warranty/service history
- Assignment to staff
- Check-in/check-out

### 13. Expense Claims
- Submit expenses with category and receipt
- Manager review and approval

### 14. Purchase Requests
- Multi-stage approval (HOD → Accounts → Purchase)
- Item, quantity, estimated cost, justification

### 15. Staff Directory
- Searchable directory with filters (department, institution, role)
- Full profile view

### 16. Notifications
- In-app notification system
- Reference linking to relevant entities
- Read/unread status

### 17. Staff Recognition
- Kudos posts, Employee of the Month
- Birthday and work anniversary reminders

### 18. Grievances / Feedback
- Anonymous and named submissions
- Category-based routing
- Response workflow

### 19. Vehicle Management
- Fleet tracking (registration, model, capacity)
- Vehicle booking with approval
- Trip logs (odometer, fuel, route)

### 20. Canteen / Meal Management
- Daily meal notifications
- Skip/attend preferences
- Guest count tracking

### 21. Visitor Management
- Pre-register visitors
- Check-in / check-out tracking
- Host staff assignment

### 22. Accounts / Finance
- Income/expense tracking per institution
- Transaction ledger
- Financial summaries

### 23. Availability Status
- Live presence status (available, busy, away, etc.)

### 24. Staff Timeline
- Chronological activity feed per employee

### 25. Approval Center
- Unified inbox for all pending approvals
- Delegation support

### 26. Checklists (Onboarding/Offboarding)
- Template-based checklists
- Task assignment for new joiners/exit

### 27. Settings
- Profile update, password change
- Notification preferences

### 28. Diagnostics & Telemetry
- Client-side diagnostic logging
- Bug report button

### 29. Export
- CSV/Excel export for reports, attendance, financials

### 30. Android Home Screen Widgets & Glanceable Info (Roadmap)

> This section defines the specification for Android home screen widgets, lock screen information, and companion app integrations. Built using Jetpack Glance (Kotlin-based declarative UI). All widget implementations target **Android 8.0 (API 26)** minimum for Glance support, with Material You theming on **Android 12.0+ (API 31)**.

#### 30.1 ThaibaHive Widgets

| Widget | Target Size | Min Width/Height | Description |
|--------|-------------|------------------|-------------|
| **My Tasks** | 4×2 | 250dp × 110dp | Today's pending, overdue, high-priority tasks. "Add Task" button deep links to task creation. |
| **Today's Schedule** | 4×2 | 250dp × 110dp | Today's meetings, events, live streams. Optional prayer timings toggle. |
| **Quick Actions** | 4×1 | 250dp × 50dp | Fast shortcuts: New Task, Upload Media, Start Live, Send Notice. |
| **Dashboard Widget** | 2×2 | 120dp × 110dp | Consolidated metrics: pending tasks, completed count, team availability status. |
| **Approval Widget** | 4×2 | 250dp × 110dp | Unified view of pending approvals (HOD/Principal/Admin). Tap triggers biometric trampoline activity. Uses Secure App Links (`https://thaibahive.com/approvals`). |
| **Today's Command Center** | 4×4 | 250dp × 250dp | Rich interactive dashboard: schedule, approvals, quick actions, shortcuts. Supports user customization via Smart Widget Configuration. |

**Smart Widget Engine Features:**
- Multiple independent launcher instances per widget type
- Configuration interface for per-instance module selection (Tasks, Calendar, Notices, Attendance, etc.)
- Saved configuration persisted per launcher instance ID

#### 30.2 MediaHive Widgets

| Widget | Target Size | Description |
|--------|-------------|-------------|
| **Production Queue** | 4×2 | List of active productions, statuses, and due dates. |
| **Camera Shortcut** | 1×1 | Opens camera view directly inside MediaHive companion app. |
| **Upload Widget** | 2×1 | One-tap asset upload selectors (photo, video, audio, document). |
| **Storage Widget** | 2×2 | Connected NAS usage status: free space, used percentage, health indicator. |
| **Live Production** | 4×2 | Today's live shoot location, timing, and assigned crew members. |

#### 30.3 Lock Screen & Wear OS

- **AOD / Lock Screen**: Handled via custom notification templates (persistent low-priority summary). No custom lock screen widget API used (not available pre-Android 15).
- **Wear OS Complications**: Task counts, upcoming schedule, and reminder indicators for Wear OS 3+ watches.

#### 30.4 Deep Linking & Security

| Widget | Deep Link | Security Model |
|--------|-----------|----------------|
| Approval Widget | `https://thaibahive.com/approvals` | **Android App Links** (verified HTTPS via `assetlinks.json`). Biometric trampoline activity required for approve/reject actions. |
| Quick Actions | `thaibahive://widget/task/new` etc. | Standard custom URI scheme (non-sensitive shortcuts). |
| My Tasks | `https://thaibahive.com/tasks` | Android App Links. |
| Production Queue | `thaibahive://media/queue` | Custom URI scheme (companion app only). |

**Security Controls:**
- JWT tokens stored in Android Keystore (encrypted at rest, never exposed to widget process)
- Biometric confirmation via `androidx.biometric:biometric` library (supports back to Android 6.0 / API 23)
- Server-side API auth limits: widget data endpoints require valid session cookie or FCM-authorized token
- Digital Asset Links (`assetlinks.json`) verified at `https://thaibahive.com/.well-known/assetlinks.json`

#### 30.5 Refresh Strategy

| Mechanism | Details |
|-----------|---------|
| **WorkManager Periodic Sync** | Minimum 15-minute intervals (system-enforced minimum). Configurable per widget. |
| **FCM Push Notifications** | Real-time triggers for approvals, urgent tasks, live events. Push payload updates widget data via `RemoteViews`. |
| **Manual Refresh** | Pull-to-refresh or tap-to-refresh button on each widget. |
| **Main App State Change** | Widget updates triggered when companion app foregrounds or performs write operations. |
| **System Broadcasts** | `ConnectivityAction`, `ACTION_TIMEZONE_CHANGED`, `ACTION_LOCALE_CHANGED` trigger selective re-sync. |

#### 30.6 Offline Support & Indicators

- **Cached Data**: Widgets display last-synced local dataset (stored in companion app's Room database).
- **Timestamp Label**: "Last synced: [ISO timestamp]" displayed on every widget.
- **Stale Badge**: Visual offline/stale status badge (amber dot) if last sync exceeds 30 minutes.
- **Network Graceful Degradation**: Widgets continue showing cached data when offline; action buttons queue operations for retry.

#### 30.7 Compatibility Matrix

| Feature | Minimum Android Version | Library/SDK |
|---------|------------------------|-------------|
| Jetpack Glance Widgets | Android 8.0 (API 26) | `androidx.glance:glance-appwidget` |
| AndroidX Biometrics | Android 6.0 (API 23) | `androidx.biometric:biometric` |
| Material You Theming | Android 12.0 (API 31) | `com.google.android.material:material` |
| WorkManager | Android 8.0 (API 26) | `androidx.work:work-runtime` |
| FCM Push | Android 8.0 (API 26) | Firebase Cloud Messaging |
| Wear OS Complications | Wear OS 3+ | `androidx.wear.watchface:watchface` |
| App Links (Verified) | Android 6.0 (API 23) | Digital Asset Links |

### 31. Admin Panel
- Manage institutions, departments, sub-departments
- Shift management
- Checklist template management

## Non-Functional Requirements

- **Performance**: Dashboard loads < 2s, API responses < 500ms
- **Accessibility**: WCAG 2.1 AA compliance
- **Responsive**: Desktop-first, tablet-compatible (no horizontal scroll on forms/tables)
- **Dark Mode**: Full light/dark theme support
- **Offline**: Basic offline indicators (future: offline-first sync)
- **Security**: JWT auth, HTTP-only cookies, role-based API guards
- **Data**: SQLite (dev) → PostgreSQL (prod) via Drizzle ORM

## Success Metrics

- 100% staff adoption within 3 months of launch
- Average daily active usage > 80%
- Leave approval turnaround < 24 hours
- Zero data loss incidents
- User satisfaction score > 4/5

## Out of Scope (Current Phase)

- Real-time WebSocket notifications
- Multi-language / i18n
- Payroll integration
- Biometric attendance hardware integration
- Student management features
- iOS companion app (future roadmap consideration)
- Wear OS complications (Phase M3)
- Desktop app via Tauri (future consideration)
