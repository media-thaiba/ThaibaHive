# TABLE_CATALOG.md — Master Physical Table Catalog

> **Specification Tier**: Physical Architecture Blueprint (AIOS 5.0)  
> **Source of Truth**: `.ai/database/TABLE_CATALOG.md` & `packages/db/schema.ts`

---

## 1. Complete Physical Table Inventory

The table below catalogs every physical table defined in the ThaibaHive Institution OS database schema:

| Table Name (SQL) | Domain Owner | Primary Purpose | Key Foreign Keys | Primary Indexes |
| :--- | :--- | :--- | :--- | :--- |
| `institutions` | Platform | Campus & Institution Registry | None | `code` (Unique) |
| `departments` | Platform | Department Structure | `institution_id`, `head_user_id` | `institution_id` |
| `sub_departments` | Platform | Sub-department Divisions | `department_id` | `department_id` |
| `staff` | Identity / HR | Employee Master Record | None | `email` (U), `employee_id` (U), `nfc_tag_id` (U) |
| `staff_departments` | HR / Identity | Staff ↔ Dept Junction | `staff_id`, `department_id` | `staff_id`, `department_id` |
| `staff_institutions` | HR / Identity | Staff ↔ Campus Junction | `staff_id`, `institution_id` | `staff_id`, `institution_id` |
| `academic_years` | Academics | Academic Session Periods | `institution_id` | `institution_id` |
| `classes` | Academics | Class Sections & Homerooms | `institution_id`, `academic_year_id`, `teacher_id` | `institution_id`, `academic_year_id` |
| `class_sections` | Academics | Grade Capacities & Rooms | `institution_id`, `academic_year_id` | `institution_id` |
| `students` | Identity / Acad | Student Master Record | `institution_id`, `class_id`, `academic_year_id` | `(institution_id, admission_no)` (Unique) |
| `guardians` | Identity | Parent & Guardian Registry | None | `phone` |
| `student_guardians` | Identity | Student ↔ Guardian Junction | `student_id`, `guardian_id` | `(student_id, guardian_id)` (Unique) |
| `student_attendance_logs`| Attendance | Daily & Period Attendance | `student_id`, `class_id`, `marked_by_id` | `(student_id, date)` (Unique) |
| `attendance_register` | Attendance | Class Register Daily Summary| `class_id`, `locked_by_id` | `(class_id, date)` (Unique) |
| `shifts` | Attendance | Work Shifts Definitions | `department_id` | `department_id` |
| `staff_shifts` | Attendance | Staff Shift Assignments | `staff_id`, `shift_id` | `(staff_id, effective_from)` (Unique) |
| `attendance_logs` | Attendance | Staff Daily Check-In/Out | `staff_id`, `location_id` | `(staff_id, date)` (Unique) |
| `attendance_locations` | Attendance | Geofence & QR Points | `institution_id` | `nfc_tag_id` (U), `qr_secret` (U) |
| `presence_logs` | Attendance | GPS Presence Verification | `attendance_id`, `staff_id` | `staff_id` |
| `leave_types` | HR / Leaves | Leave Quota Categories | None | `code` (Unique) |
| `leave_balances` | HR / Leaves | Annual Staff Quotas | `staff_id`, `leave_type_id` | `(staff_id, leave_type_id, year)` (Unique) |
| `leave_requests` | HR / Leaves | Staff Leave Applications | `staff_id`, `leave_type_id`, `reviewed_by_id`| `staff_id` |
| `tasks` | Workplace | Task Kanban Items | `assigned_to_id`, `assigned_by_id` | `assigned_to_id` |
| `task_comments` | Workplace | Task Thread Comments | `task_id`, `staff_id` | `task_id` |
| `daily_reports` | Workplace | End-of-Day Work Summaries | `staff_id`, `reviewed_by_id` | `(staff_id, date)` (Unique) |
| `announcements` | Communication | Broadcast Notices | `target_department_id`, `target_institution_id`| `target_institution_id` |
| `announcement_reads` | Communication | Read Receipt Tracking | `announcement_id`, `staff_id` | `(announcement_id, staff_id)` (Unique) |
| `events` | Communication | Campus Calendar Events | `institution_id`, `department_id` | `institution_id` |
| `circulars` | Communication | Official PDF Documents | `target_department_id`, `target_institution_id`| `target_institution_id` |
| `polls` | Communication | Decision Voting Polls | `target_department_id`, `target_institution_id`| `target_institution_id` |
| `poll_responses` | Communication | Poll Votes | `poll_id`, `staff_id` | `(poll_id, staff_id)` (Unique) |
| `help_desk_tickets` | Operations | IT Support Tickets | `submitted_by_id`, `assigned_to_id` | `submitted_by_id` |
| `booking_resources` | Operations | Shared Rooms/Vehicles | `institution_id` | `institution_id` |
| `bookings` | Operations | Resource Reservations | `resource_id`, `booker_id` | `resource_id` |
| `assets` | Operations | Physical Asset Inventory | `institution_id`, `assigned_to_id` | `nfc_tag_id` (U), `qr_code` (U) |
| `financial_transactions`| Finance | Income/Expense Ledger | `institution_id`, `recorded_by_id` | `institution_id`, `transaction_date` |
| `expense_claims` | Finance | Staff Reimbursements | `staff_id`, `reviewed_by_id` | `staff_id` |
| `purchase_requests` | Finance | Procurement Orders | `requester_id` | `requester_id` |
| `vehicles` | Fleet | Fleet Vehicle Registry | `institution_id` | `registration_number` (Unique) |
| `vehicle_bookings` | Fleet | Trip Reservations | `vehicle_id`, `booked_by_id` | `vehicle_id` |
| `vehicle_logs` | Fleet | Trip & Odometer Logs | `vehicle_id`, `driver_id` | `vehicle_id` |
| `visitors` | Operations | Gate Visitor Log | `host_staff_id`, `institution_id` | `institution_id` |
| `grievances` | Operations | Staff Feedback Log | `responded_by_id` | `status` |
| `media_folders` | MediaHive | Media Directory Hierarchy | `parent_id`, `department_id` | `department_id` |
| `media_assets` | MediaHive | Files & Media Items | `folder_id`, `created_by_id` | `folder_id`, `file_type` |
| `media_share_links` | MediaHive | Expiring Share Links | `asset_id` | `token` (Unique) |
| `chat_rooms` | Communication | Messaging Rooms | `created_by_id` | `created_by_id` |
| `chat_participants` | Communication | Room Membership | `room_id`, `staff_id` | `(room_id, staff_id)` (Unique) |
| `chat_messages` | Communication | Text/Media Messages | `room_id`, `sender_id` | `room_id` |
| `presence` | Presence | Online/Offline Status | `staff_id` (PK) | `online` |
| `activity_logs` | Audit | Timeline Event Feed | `staff_id` | `staff_id`, `created_at` |
| `audit_log` | Security | Immutable Security Audit | `staff_id` | `staff_id`, `created_at` |
| `nfc_cards` | Security | NFC Card Inventory | `owner_id` | `tag_id` (Unique) |
| `used_nonces` | Security | Mobile Handoff Nonces | None | `jti` (PK) |
| `staff_device_tokens` | Notifications | FCM Push Tokens | `staff_id`, `institution_id` | `token` (Unique) |
| `student_biometric_consents`| Security | Privacy Consent Log | `student_id`, `guardian_id` | `student_id` |

---

# NAMING_CONVENTIONS.md — Physical Database Naming Standards

## 1. SQL Naming Rules
* **Table Names**: Snake_case, plural (e.g., `students`, `financial_transactions`, `class_sections`).
* **Column Names**: Snake_case, singular (e.g., `first_name`, `date_of_birth`, `institution_id`).
* **Primary Key**: `id` (text UUID v4).
* **Foreign Keys**: `[target_singular]_id` (e.g., `institution_id`, `student_id`, `class_id`).
* **Booleans**: Prefixed with `is_` or `has_` (e.g., `is_active`, `is_primary`, `can_pickup`).
* **Timestamps**: Suffixed with `_at` or `_date` (e.g., `created_at`, `updated_at`, `start_date`).

## 2. TypeScript / Drizzle Mapping Rules
* Drizzle table instances use camelCase (`studentAttendanceLogs`).
* Physical SQL column mapping MUST explicitly specify snake_case:
  `institutionId: text("institution_id").notNull()`
