# permissions.md — Master RBAC Permission Registry

> **Classification**: Enterprise Authorization Specification  
> **Source of Truth**: `.ai/permissions.md` & `packages/auth/roles.ts`

---

## 1. Domain Permission Matrix Format

Permissions in ThaibaHive Institution OS use the standard `domain:action` notation. Every guarded API route and workspace action checks these keys against `hasPermission(role, permission)`.

---

## 2. Complete Permission Registry

### 1. Identity & Staff (`staff`, `students`, `guardians`)
* `staff:create` — Register new staff profiles.
* `staff:read` — View staff directory and details.
* `staff:update` — Edit staff personal and professional profile details.
* `staff:delete` — Soft-delete staff records.
* `staff:assign_role` — Modify staff administrative roles.
* `students:create` — Enroll new students/beneficiaries.
* `students:read` — View student profiles and rosters.
* `students:update` — Edit student profile attributes.
* `students:delete` — Soft-delete student records.
* `students:promote` — Execute annual student class promotions.
* `students:transfer` — Initiate inter-campus student transfers.
* `guardians:create` — Add parent/guardian profiles.
* `guardians:read` — View guardian contact details.
* `guardians:update` — Edit guardian information.
* `guardians:delete` — Unlink or remove guardian profiles.

### 2. Attendance & Biometrics (`attendance`, `biometric`)
* `attendance:mark` — Submit daily or period-wise student attendance.
* `attendance:view` — View attendance logs and registers.
* `attendance:correct` — Override or correct previously submitted attendance registers.
* `attendance:approve_fieldwork` — Approve remote or field work attendance requests.
* `attendance:lock_register` — Lock daily class attendance registers.
* `biometric:enroll` — Enroll facial vectors, NFC tags, or fingerprints.
* `biometric:read` — Access biometric status and enrollment audit records.
* `biometric:revoke` — Revoke biometric access or consent records.

### 3. Tasks, Reports & Approvals (`tasks`, `reports`, `approvals`)
* `tasks:create` — Assign tasks to staff or self.
* `tasks:read` — View task boards and comments.
* `tasks:update` — Edit task priority, status, or assignment.
* `tasks:delete` — Delete task items.
* `reports:submit` — Submit daily end-of-day work reports.
* `reports:review` — Review and comment on team work reports.
* `approvals:view_pending` — Access unified pending approval queues.
* `approvals:delegate` — Delegate approval authority to another staff member.

### 4. Finance, Fees & Accounts (`finance`, `fees`, `accounts`)
* `finance:transaction:create` — Record income or expense transactions.
* `finance:transaction:read` — View financial ledgers and cash flow.
* `finance:budget:manage` — Define and revise institutional budgets.
* `finance:export` — Export financial ledger data (CSV/Excel).
* `fees:structure:manage` — Create and edit fee structures and rules.
* `fees:assign` — Assign fee invoices to student accounts.
* `fees:collect` — Collect payments and issue digital receipts.
* `fees:concession:apply` — Apply fee waivers, scholarships, or discounts.
* `fees:refund` — Process fee refund transactions.
* `fees:reports:view` — View outstanding fee default registers.

### 5. HR & Payroll (`hr`, `payroll`)
* `hr:contract:manage` — Manage staff employment contracts and renewals.
* `hr:appraisal:review` — Conduct staff performance appraisals.
* `payroll:structure:manage` — Configure salary components and tax rules.
* `payroll:generate` — Compute monthly payroll runs.
* `payroll:approve` — Authorize payroll disbursement and bank payouts.
* `payroll:payslip:view` — View personal or departmental payslips.

### 6. Inventory & Procurement (`inventory`, `procurement`, `assets`)
* `inventory:read` — View stock levels across warehouses.
* `inventory:receive` — Record incoming stock deliveries.
* `inventory:issue` — Issue consumables to staff, students, or departments.
* `inventory:audit` — Perform physical stock audits and adjustments.
* `procurement:request` — Submit purchase requisitions.
* `procurement:approve` — Approve purchase orders across approval tiers.
* `assets:register` — Add assets and tag with NFC/QR codes.
* `assets:assign` — Assign assets to staff, rooms, or vehicles.
* `assets:service` — Log asset maintenance and repair records.

### 7. Campus, Hostel & Fleet (`hostel`, `transport`, `vehicles`)
* `hostel:facility:manage` — Build hostel block, floor, and room layouts.
* `hostel:allocate` — Allocate beds to boarders or residents.
* `hostel:outpass:approve` — Approve digital night outpass applications.
* `hostel:rollcall:mark` — Mark night curfew attendance registers.
* `transport:route:manage` — Define transit routes, stops, and schedules.
* `transport:assign` — Assign passengers to bus routes.
* `vehicles:book` — Reserve institutional vehicles for trips.
* `vehicles:log` — Record fuel and odometer trip logs.

### 8. Academic, Library & Exams (`academic`, `library`, `exams`)
* `academic_years:manage` — Configure academic sessions.
* `classes:create` — Define class sections and teacher assignments.
* `classes:read` — View class rosters.
* `subjects:manage` — Configure master subject catalog and syllabi.
* `exams:configure` — Set up assessment types, terms, and mark rules.
* `exams:marks:entry` — Enter exam marks for class rosters.
* `exams:results:publish` — Lock and publish student report cards.
* `library:catalog:manage` — Index books and media assets.
* `library:issue` — Issue books to borrowers.
* `library:return` — Process book returns and collect overdue fines.

### 9. Communications, Media & System (`communication`, `media`, `system`)
* `announcements:create` — Publish broadcast notices.
* `circulars:upload` — Upload official document circulars.
* `events:manage` — Create institutional calendar events.
* `polls:manage` — Create and publish decision polls.
* `media:upload` — Upload files to MediaHive library.
* `media:share` — Create public or password-protected media share links.
* `system:telemetry` — View system health, logs, and diagnostics.
* `system:org:manage` — Manage institution and department structures.
* `automation:manage` — Configure workflow recipes and AI playbooks.

### 10. Federated Governance, Resilience, Voice & Executive Analytics (`federated`, `resilience`, `voice`, `executive`)
* `federated:policies` — Cross-institutional policy synchronization and conflict resolution.
* `federated:audit` — Centralized federated compliance audit log aggregation.
* `resilience:manage` — Self-healing infrastructure monitoring (index tuner, circuit breaker, DLQ retry).
* `voice:copilot` — Hands-free voice query parsing and copilot swarm interaction.
* `executive:analytics` — Unified executive intelligence dashboard access across federated governance, operational resilience, and mobile platforms (`super_admin` only).

