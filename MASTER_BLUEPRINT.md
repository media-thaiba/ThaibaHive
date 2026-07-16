# MASTER BLUEPRINT — ThaibaHive

> Central coordinator document. All other documents reference this.

---

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | ThaibaHive |
| **Type** | Staff Management Platform |
| **Organization** | Thaiba Garden Group of Institutions (23+ campuses) |
| **Users** | 800–1,000 staff (teachers, HODs, principals, admins, directors) |
| **Platform** | Web (desktop-first, tablet-compatible) |
| **Stack** | Next.js 16 + React 19 + Tailwind + Drizzle + SQLite/PostgreSQL |

---

## Document Map

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **PRD.md** | What to build, features, success metrics | Start of any phase |
| **Architecture.md** | Tech stack, folder structure, data flow | Onboarding, structural changes |
| **Rulers.md** | Code conventions, do/don't rules | Before writing any code |
| **Phasis.md** | Phase breakdown with exit criteria | Phase planning and tracking |
| **Design.md** | Colors, typography, animations, tokens | UI work, styling |
| **Memory.md** | What's done, what's next, current work | Every session start |
| **Security.md** | RBAC matrix, RLS policies | Auth/permission changes |
| **Verification.md** | E2E test scenarios, QA checklists | Before merging, after features |
| **PRODUCT.md** | Product vision, brand personality, principles | Design decisions |

---

## Sub-Platform Architecture

```
ThaibaHive
├── Web App (Current Build)
│   ├── Next.js 16 App Router
│   ├── 30+ pages, 28 API modules
│   └── SQLite (dev) → PostgreSQL (prod)
│
├── Mobile App (Future — Flutter/React Native)
│   ├── Shares API routes via absolute URLs
│   ├── No relative /api/* endpoints
│   └── Uses dedicated client wrapper
│
└── Desktop App (Future — Tauri)
    ├── Shares API routes via absolute URLs
    └── Same web frontend in WebView
```

### Cross-Platform API Strategy
- **Web**: Use relative `/api/*` endpoints
- **Mobile/Desktop**: Use absolute `https://domain.com/api/*` via client wrapper
- **Rule**: All API calls go through `src/lib/api/client.ts` which resolves URLs dynamically
- **Never** hardcode `localhost` or relative paths in shared code

---

## Database Schema Overview

### Core Tables (30+)
| Domain | Tables | Key Relationships |
|--------|--------|-------------------|
| **Organization** | institutions, departments, sub_departments | department → institution |
| **Staff** | staff, staff_departments, staff_institutions | staff → department, institution |
| **Shifts** | shifts, staff_shifts | shift → department |
| **Attendance** | attendance_logs | log → staff, shift |
| **Leave** | leave_types, leave_balances, leave_requests | request → staff, leave_type |
| **Tasks** | tasks, task_comments | task → staff (assigned, by) |
| **Reports** | daily_reports, daily_report_tasks | report → staff, tasks |
| **Communication** | announcements, announcement_reads, events, event_rsvps, circulars, polls, poll_responses | all → staff |
| **Services** | help_desk_tickets, help_desk_comments, bookings, booking_resources | ticket → staff |
| **Assets** | assets, asset_service_history | asset → institution, staff |
| **Finance** | expense_claims, purchase_requests, financial_transactions | all → staff, institution |
| **Vehicles** | vehicles, vehicle_bookings, vehicle_logs | vehicle → institution |
| **Canteen** | meal_notifications | notification → staff |
| **Visitors** | visitors | visitor → staff (host) |
| **Grievances** | grievances | grievance → staff |
| **Recognition** | staffRecognition | recognition → staff |
| **Notifications** | notifications | notification → staff |
| **Availability** | staffAvailability | availability → staff |
| **Reviews** | performanceReviews | review → staff (reviewer, reviewee) |
| **Audit** | auditLog | log → staff |
| **Checklists** | checklist_templates, checklist_template_items, staff_checklists, staff_checklist_tasks | template → items, checklist → tasks |
| **Delegations** | approvalDelegations | delegation → staff (delegator, delegate) |

---

## Authentication Flow

```
1. User submits email + password
2. API validates credentials (bcrypt)
3. JWT created with staffId, email, role, employeeId
4. Token set as httpOnly cookie (7-day expiry)
5. Subsequent requests: cookie → verifySession() → session payload
6. API routes: requireAuth() checks session + optional permission
```

---

## RBAC Role Hierarchy

```
super_admin (Director Office)
  └── admin (IT/HR)
        └── principal (Institution Head)
              └── hod (Department Head)
                    └── staff (Regular Employee)
```

---

## Deployment Strategy

| Environment | Database | URL | Purpose |
|-------------|----------|-----|---------|
| Development | SQLite (`dev.db`) | localhost:3000 | Local development |
| Staging | PostgreSQL (Supabase) | staging.thaibahive.com | Pre-production testing |
| Production | PostgreSQL (Supabase) | thaibahive.com | Live system |

---

## Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `src/db/schema.ts` | 754 | Database schema (30+ tables) |
| `src/config/navigation.ts` | 86 | Navigation structure |
| `src/contexts/AuthContext.tsx` | 111 | Auth state management |
| `src/lib/auth/roles.ts` | 79 | RBAC permission matrix |
| `src/lib/auth/session.ts` | 65 | JWT session management |
| `src/lib/api/auth-guard.ts` | 37 | API route protection |
| `src/app/globals.css` | 237 | Design tokens + animations |
| `tailwind.config.ts` | 87 | Tailwind configuration |
| `drizzle.config.ts` | 17 | Database config |

---

## Sync Rules

1. **This file is the source of truth** for project architecture
2. **Update Memory.md** at the end of every work session
3. **Update Phasis.md** when phase scope changes
4. **Update Security.md** when roles/permissions change
5. **Update Verification.md** when new features are added
6. **All other documents** should reference this file for coordination
