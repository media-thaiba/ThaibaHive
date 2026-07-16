# Phasis — ThaibaHive Phase Breakdown

## Phase 0: Foundation ✅ (Completed)
**Goal**: Project scaffolding, database schema, auth system, core UI shell.

### Delivered
- Next.js 16 project with App Router
- Tailwind CSS + Radix UI + shadcn/ui components
- SQLite database with Drizzle ORM
- JWT authentication (login, signup, logout, session)
- Role-based access control (5 roles)
- Root layout with Geist font, providers
- Shell layout with header, sidebar, bottom nav, command palette
- Navigation config (4 groups, 30+ items)
- Dashboard page with stats and shortcuts
- Dark/light theme support
- 30+ database tables (schema.ts)
- 28 API route modules
- Basic form components (input, select, checkbox, etc.)
- Toast notifications (Sonner)
- Diagnostics/telemetry system

---

## Phase 1: Core Daily Operations ✅ (Completed)
**Goal**: The features staff use every single day — attendance, tasks, leaves.

### 1.1 Attendance System
- Check-in / check-out with timestamp
- Shift assignment and grace period logic
- Late/early exit calculation
- Daily attendance view (self)
- Manager attendance overview (team/institution)
- Attendance history with date range filter

### 1.2 Task Management
- Create task with title, description, priority, due date
- Assign to staff (with department scope)
- Kanban board (drag-and-drop with dnd-kit)
- Task status transitions (todo → in_progress → review → completed)
- Task comments
- My tasks vs. all tasks views
- Overdue task highlighting

### 1.3 Leave Management
- Apply for leave (type, date range, reason)
- Leave balance display per type
- Approval workflow (HOD → Admin)
- Leave history and status tracking
- Cancel pending request

### 1.4 Dashboard Polish
- Real-time stats (today's attendance, pending tasks, pending approvals)
- Quick actions (check-in, new task, apply leave)
- Welcome flow for new users

### Exit Criteria
- [x] Staff can check in/out and see their attendance history
- [x] Staff can create, assign, and track tasks on kanban board
- [x] Staff can apply for leave and see approval status
- [x] HODs can approve/reject leaves
- [x] Dashboard shows accurate daily stats

---

## Phase 2: Communication & Information
**Goal**: Organization-wide communication — announcements, events, documents.

### 2.1 Announcements
- Create announcements with rich text
- Priority levels (low, normal, high, urgent)
- Target by role, department, or institution
- Read receipts
- Pin important announcements

### 2.2 Events Calendar
- Create events with date, time, location
- RSVP system (attending, declined, maybe)
- Holiday and meeting types
- Calendar view + list view

### 2.3 Circulars & Documents
- Upload documents (PDF, images)
- Category and department tagging
- Target audience filtering
- Download tracking

### 2.4 Polls & Surveys
- Create polls with multiple options
- Target by role, department, or institution
- One vote per staff
- Expiration dates
- Results visualization

### 2.5 Notifications
- In-app notification center
- Mark as read/unread
- Link to referenced entity
- Notification preferences

### Exit Criteria
- [x] Admin can create targeted announcements
- [x] Staff can view announcements and see read status
- [x] Events can be created with RSVP tracking
- [x] Documents can be uploaded and downloaded
- [x] Polls can be created and voted on
- [x] Notifications appear for relevant actions

---

## Phase 3: Admin & Operations
**Goal**: Administrative workflows — approvals, help desk, bookings, assets.

### 3.1 Approval Center
- Unified inbox for all pending approvals
- Leave approvals (multi-stage)
- Expense approvals
- Purchase request approvals
- Booking approvals
- Delegation support

### 3.2 Help Desk / IT Support
- Ticket creation with category and priority
- Assignment to IT staff
- Comment threads
- Status tracking (open → in_progress → resolved → closed)
- SLA tracking

### 3.3 Bookings
- Book rooms, equipment, shared resources
- Availability calendar
- Approval workflow
- Conflict detection

### 3.4 Asset Management
- Track institutional assets
- QR-tagged equipment
- Purchase/warranty/service history
- Assignment to staff
- Check-in/check-out

### 3.5 Staff Directory
- Searchable directory
- Filter by department, institution, role
- Full profile view
- Contact information

### Exit Criteria
- [x] All approval types work end-to-end
- [x] Help desk tickets can be created, assigned, and resolved
- [x] Resources can be booked with conflict detection
- [x] Assets are trackable with assignment history
- [x] Staff directory is searchable and filterable

---

## Phase 4: Finance & Reports
**Goal**: Financial tracking and reporting capabilities.

### 4.1 Daily Reports
- Staff submit end-of-day reports
- Link tasks to reports with hours
- Manager review workflow
- Report history

### 4.2 Expense Claims
- Submit expenses with category and receipt
- Manager review and approval
- Expense history

### 4.3 Purchase Requests
- Multi-stage approval (HOD → Accounts → Purchase)
- Item, quantity, cost, justification
- Status tracking

### 4.4 Accounts / Finance
- Income/expense tracking per institution
- Transaction ledger
- Financial summaries
- Export to CSV/Excel

### 4.5 Export & Compliance
- Data export for reports, attendance, financials
- CSV/Excel format
- Filtered exports

### Exit Criteria
- [ ] Staff can submit daily reports
- [ ] Expense claims go through approval workflow
- [ ] Purchase requests follow multi-stage approval
- [ ] Financial summaries are viewable per institution
- [ ] Data can be exported to CSV/Excel

---

## Phase 5: Services & Specialized
**Goal**: Supporting services — vehicles, canteen, visitors, recognition.

### 5.1 Vehicle Management
- Fleet tracking (registration, model, capacity)
- Vehicle booking with approval
- Trip logs (odometer, fuel, route)
- Fuel cost tracking

### 5.2 Canteen / Meal Management
- Daily meal notifications
- Skip/attend preferences
- Guest count tracking
- Menu management

### 5.3 Visitor Management
- Pre-register visitors
- Check-in / check-out tracking
- Host staff assignment
- Visitor history

### 5.4 Staff Recognition
- Kudos posts
- Employee of the Month
- Birthday and work anniversary reminders

### 5.5 Grievances / Feedback
- Anonymous and named submissions
- Category-based routing
- Response workflow

### 5.6 Availability Status
- Live presence status (available, busy, away)
- Team visibility

### Exit Criteria
- [ ] Vehicles can be booked and tracked
- [ ] Canteen meal preferences work
- [ ] Visitors can be pre-registered and tracked
- [ ] Staff recognition features are functional
- [ ] Grievances can be submitted anonymously
- [ ] Availability status is visible to team

---

## Phase 6: Advanced Admin & Performance
**Goal**: Advanced admin features and performance management.

### 6.1 Admin Panel
- Manage institutions (CRUD)
- Manage departments and sub-departments
- Shift management
- Checklist template management
- Org structure visualization

### 6.2 Performance Reviews
- Quarterly appraisal cycles
- Manager-submitted ratings and goals
- Review workflow
- Performance history

### 6.3 Staff Timeline
- Chronological activity feed per employee
- Activity types (attendance, tasks, leaves, etc.)

### 6.4 Checklists (Onboarding/Offboarding)
- Template-based checklists
- Task assignment for new joiners/exit
- Progress tracking

### 6.5 Audit Log
- Complete action trail
- Compliance and security review
- Filter by user, action, entity

### Exit Criteria
- [ ] Full admin CRUD for org structure
- [ ] Performance review cycles work
- [ ] Staff timeline shows activity history
- [ ] Onboarding/offboarding checklists function
- [ ] Audit log captures all actions

---

## Phase 7: Polish & Launch
**Goal**: Production readiness, performance optimization, launch.

### 7.1 Performance Optimization
- Bundle analysis and tree shaking
- Image optimization
- API response time optimization
- Database query optimization
- Caching strategy

### 7.2 Accessibility Audit
- WCAG 2.1 AA compliance
- Screen reader testing
- Keyboard navigation
- Focus management

### 7.3 Security Hardening
- Security audit
- Penetration testing
- Rate limiting
- Input sanitization
- CSRF protection

### 7.4 Testing
- Unit test coverage > 80%
- E2E test suite for critical paths
- Load testing
- Cross-browser testing

### 7.5 Deployment
- Production PostgreSQL setup
- CI/CD pipeline
- Environment variable management
- Monitoring and alerting

### Exit Criteria
- [ ] All tests pass
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Security audit passed
- [ ] Production deployment successful
- [ ] Monitoring and alerting configured
