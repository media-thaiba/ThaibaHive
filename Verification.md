# Verification — ThaibaHive E2E Testing & QA Scenarios

---

## Testing Strategy

| Type | Tool | Coverage Target | When |
|------|------|----------------|------|
| Unit Tests | Jest + Testing Library | 80%+ | During development |
| E2E Tests | Playwright | Critical paths | Before merge |
| Manual QA | Golden Scenarios | Every phase | Before release |
| Accessibility | axe-core + manual | WCAG 2.1 AA | Before release |
| Visual Regression | Playwright screenshots | Key pages | Before release |

---

## E2E Test Scenarios

### 1. Authentication Flow

```gherkin
Scenario: Staff can log in with valid credentials
  Given I am on the login page
  When I enter valid email and password
  Then I should be redirected to the dashboard
  And I should see my name in the header

Scenario: Login fails with invalid credentials
  Given I am on the login page
  When I enter invalid email or password
  Then I should see an error message
  And I should remain on the login page

Scenario: Unauthenticated user is redirected to login
  Given I am not logged in
  When I navigate to "/attendance"
  Then I should be redirected to "/auth/login"

Scenario: Logout clears session
  Given I am logged in
  When I click logout
  Then I should be redirected to "/auth/login"
  And I should not be able to access "/attendance"
```

### 2. Attendance Flow

```gherkin
Scenario: Staff can check in
  Given I am logged in as staff
  And I have not checked in today
  When I navigate to "/attendance"
  And I click "Check In"
  Then I should see "Checked in" status
  And my check-in time should be recorded

Scenario: Staff can check out
  Given I am logged in as staff
  And I have checked in today
  When I navigate to "/attendance"
  And I click "Check Out"
  Then I should see "Checked out" status
  And my worked minutes should be calculated

Scenario: Late check-in is flagged
  Given I am logged in as staff
  And my shift starts at 09:00
  And current time is 09:20
  When I check in
  Then my attendance should show "late" status
  And late minutes should be 20
```

### 3. Task Management Flow

```gherkin
Scenario: HOD can create and assign a task
  Given I am logged in as HOD
  When I navigate to "/tasks/new"
  And I fill in task title, description, priority, and assignee
  And I submit the form
  Then the task should appear on the kanban board
  And the assigned staff should see it in "My Tasks"

Scenario: Staff can update task status
  Given I am logged in as staff
  And I have an assigned task in "todo" status
  When I drag the task to "in_progress"
  Then the task status should update to "in_progress"

Scenario: Task comments are visible
  Given I am logged in as staff
  And I have an assigned task
  When I add a comment to the task
  Then the comment should appear in the task detail
```

### 4. Leave Management Flow

```gherkin
Scenario: Staff can apply for leave
  Given I am logged in as staff
  When I navigate to "/leaves"
  And I click "Apply Leave"
  And I select leave type, dates, and reason
  And I submit the form
  Then my leave request should show "pending" status
  And my leave balance should decrease

Scenario: HOD can approve leave
  Given I am logged in as HOD
  And there is a pending leave request from my department
  When I navigate to "/approvals"
  And I approve the leave request
  Then the leave status should change to "approved"
  And the staff member should see the approval

Scenario: Staff can cancel pending leave
  Given I am logged in as staff
  And I have a pending leave request
  When I click "Cancel" on the request
  Then the leave status should change to "cancelled"
  And my leave balance should be restored
```

### 5. Announcements Flow

```gherkin
Scenario: Admin can create announcement
  Given I am logged in as admin
  When I navigate to "/announcements"
  And I create a new announcement with title, content, and priority
  Then the announcement should appear in the list
  And targeted staff should see it on their dashboard

Scenario: Staff can mark announcement as read
  Given I am logged in as staff
  And there is an unread announcement
  When I view the announcement
  Then it should be marked as read
  And the read receipt should be recorded
```

### 6. Help Desk Flow

```gherkin
Scenario: Staff can create support ticket
  Given I am logged in as staff
  When I navigate to "/help-desk"
  And I create a ticket with title, description, and category
  Then the ticket should appear with "open" status
  And IT staff should be notified

Scenario: IT staff can resolve ticket
  Given I am logged in as admin
  And there is an open help desk ticket
  When I assign it to myself
  And I add a resolution comment
  And I mark it as "resolved"
  Then the ticket status should be "resolved"
```

### 7. Bookings Flow

```gherkin
Scenario: Staff can book a resource
  Given I am logged in as staff
  When I navigate to "/bookings"
  And I select a resource, date, and time slot
  And I submit the booking
  Then the booking should show "pending" status
  And the resource should not be available for overlapping times

Scenario: Admin can approve booking
  Given I am logged in as admin
  And there is a pending booking request
  When I approve the booking
  Then the booking status should change to "approved"
```

---

## Golden Scenarios (Manual QA)

### Scenario 1: New Staff Onboarding
1. Admin creates new staff account
2. Staff receives credentials
3. Staff logs in for first time
4. Staff completes profile (phone, DOB, qualifications, etc.)
5. Staff marks attendance
6. Staff is assigned to department
7. Staff receives first task
8. Staff submits daily report

### Scenario 2: Leave Approval Chain
1. Staff applies for leave
2. HOD receives notification
3. HOD approves leave
4. Admin receives notification (if required)
5. Admin approves leave
6. Staff receives approval notification
7. Leave balance is updated
8. Attendance reflects leave day

### Scenario 3: IT Support Ticket Lifecycle
1. Staff encounters IT issue
2. Staff creates help desk ticket
3. IT admin assigns ticket to themselves
4. IT admin adds comment asking for details
5. Staff responds with additional info
6. IT admin resolves the issue
7. Ticket marked as resolved
8. Staff confirms resolution

### Scenario 4: End-of-Day Workflow
1. Staff checks out (attendance)
2. Staff submits daily report
3. Staff links completed tasks to report
4. Manager reviews report
5. Manager adds feedback
6. Report status changes to "reviewed"

---

## Accessibility Test Checklist

- [ ] All interactive elements have visible focus indicators
- [ ] All images have alt text (or decorative images have empty alt)
- [ ] All forms have associated labels
- [ ] Color is not the sole carrier of information
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Touch targets are at least 44x44px on mobile
- [ ] Page has proper heading hierarchy (h1 → h2 → h3)
- [ ] Screen reader can navigate all major sections
- [ ] Keyboard can reach and activate all interactive elements
- [ ] Error messages are announced to screen readers
- [ ] Skip navigation link is present
- [ ] Language attribute is set on `<html>`

---

## Visual Regression Test Points

| Page | What to Capture |
|------|----------------|
| Dashboard | Stats cards, shortcuts, welcome banner |
| Attendance | Check-in/out button, history table |
| Tasks | Kanban board, task cards |
| Leaves | Balance display, request form |
| Help Desk | Ticket list, creation form |
| Staff Directory | Search, filters, card layout |
| Settings | Form layout, toggle states |
| Dark Mode | All of the above in dark theme |

---

## Performance Benchmarks

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.0s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| API Response Time (p95) | < 500ms | Server logs |
| Bundle Size (initial) | < 200KB | Next.js build |

---

## Test File Structure

```
e2e/
├── auth.spec.ts           # Authentication flows
├── attendance.spec.ts     # Attendance check-in/out
├── tasks.spec.ts          # Task CRUD and kanban
├── leaves.spec.ts         # Leave application and approval
├── announcements.spec.ts  # Announcement creation and viewing
├── help-desk.spec.ts      # Ticket lifecycle
├── bookings.spec.ts       # Resource booking
├── staff.spec.ts          # Staff directory and profile
├── admin.spec.ts          # Admin panel operations
├── accessibility.spec.ts  # a11y checks
└── fixtures/
    ├── auth.fixture.ts    # Auth helpers
    └── test-data.ts       # Seed data for tests
```

---

## CI/CD Test Gates

| Gate | Must Pass | Blocking |
|------|-----------|----------|
| TypeScript compilation | `pnpm typecheck` | Yes |
| Linting | `pnpm lint` | Yes |
| Unit tests | `pnpm test` | Yes |
| E2E tests | `pnpm test:e2e` | Yes (before merge) |
| Lighthouse score | > 90 | Warning |
| Build success | `pnpm build` | Yes |
