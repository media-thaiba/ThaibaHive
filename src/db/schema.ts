import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Core Organization ───

export const institutions = sqliteTable("institutions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("campus"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").references(() => institutions.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  headUserId: text("head_user_id"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const subDepartments = sqliteTable("sub_departments", {
  id: text("id").primaryKey(),
  departmentId: text("department_id")
    .notNull()
    .references(() => departments.id),
  name: text("name").notNull(),
  code: text("code"),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Staff ───

export const staff = sqliteTable("staff", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  employeeId: text("employee_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  designation: text("designation"),
  role: text("role").notNull().default("staff"),
  avatarUrl: text("avatar_url"),
  dateOfBirth: text("date_of_birth"),
  dateOfJoining: text("date_of_joining"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  passwordHash: text("password_hash"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const staffDepartments = sqliteTable("staff_departments", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  departmentId: text("department_id")
    .notNull()
    .references(() => departments.id),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
});

export const staffInstitutions = sqliteTable("staff_institutions", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  institutionId: text("institution_id")
    .notNull()
    .references(() => institutions.id),
});

// ─── Shifts & Attendance ───

export const shifts = sqliteTable("shifts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  gracePeriodMinutes: integer("grace_period_minutes").notNull().default(15),
  departmentId: text("department_id").references(() => departments.id),
  applicableToAll: integer("applicable_to_all", { mode: "boolean" })
    .notNull()
    .default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const staffShifts = sqliteTable("staff_shifts", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  shiftId: text("shift_id")
    .notNull()
    .references(() => shifts.id),
  effectiveFrom: text("effective_from").notNull(),
  effectiveTo: text("effective_to"),
});

export const attendanceLogs = sqliteTable("attendance_logs", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  date: text("date").notNull(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  method: text("method").notNull().default("manual"),
  nfcTagId: text("nfc_tag_id"),
  qrCode: text("qr_code"),
  status: text("status").notNull().default("present"),
  workedMinutes: integer("worked_minutes"),
  lateMinutes: integer("late_minutes").default(0),
  earlyExitMinutes: integer("early_exit_minutes").default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Leave Management ───

export const leaveTypes = sqliteTable("leave_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  daysAllowed: real("days_allowed").notNull(),
  requiresApproval: integer("requires_approval", { mode: "boolean" })
    .notNull()
    .default(true),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const leaveBalances = sqliteTable("leave_balances", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  leaveTypeId: text("leave_type_id")
    .notNull()
    .references(() => leaveTypes.id),
  totalDays: real("total_days").notNull(),
  usedDays: real("used_days").notNull().default(0),
  year: integer("year").notNull(),
});

export const leaveRequests = sqliteTable("leave_requests", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  leaveTypeId: text("leave_type_id")
    .notNull()
    .references(() => leaveTypes.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  daysCount: real("days_count").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  appliedAt: text("applied_at").notNull().default(sql`(current_timestamp)`),
  reviewedById: text("reviewed_by_id").references(() => staff.id),
  reviewedAt: text("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Tasks ───

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  assignedToId: text("assigned_to_id").references(() => staff.id),
  assignedById: text("assigned_by_id").references(() => staff.id),
  departmentId: text("department_id").references(() => departments.id),
  dueDate: text("due_date"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const taskComments = sqliteTable("task_comments", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Daily Reports ───

export const dailyReports = sqliteTable("daily_reports", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  date: text("date").notNull(),
  summary: text("summary"),
  status: text("status").notNull().default("draft"),
  reviewedById: text("reviewed_by_id").references(() => staff.id),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const dailyReportTasks = sqliteTable("daily_report_tasks", {
  id: text("id").primaryKey(),
  reportId: text("report_id")
    .notNull()
    .references(() => dailyReports.id),
  taskId: text("task_id").references(() => tasks.id),
  description: text("description").notNull(),
  hoursSpent: real("hours_spent"),
  status: text("status").notNull().default("completed"),
});

// ─── Announcements ───

export const announcements = sqliteTable("announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("normal"),
  targetRole: text("target_role"),
  targetDepartmentId: text("target_department_id").references(
    () => departments.id
  ),
  targetInstitutionId: text("target_institution_id").references(
    () => institutions.id
  ),
  createdById: text("created_by_id")
    .notNull()
    .references(() => staff.id),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  pinnedUntil: text("pinned_until"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const announcementReads = sqliteTable("announcement_reads", {
  id: text("id").primaryKey(),
  announcementId: text("announcement_id")
    .notNull()
    .references(() => announcements.id),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  readAt: text("read_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Events ───

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull().default("institution"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  location: text("location"),
  departmentId: text("department_id").references(() => departments.id),
  institutionId: text("institution_id").references(() => institutions.id),
  createdById: text("created_by_id")
    .notNull()
    .references(() => staff.id),
  maxAttendees: integer("max_attendees"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const eventRsvps = sqliteTable("event_rsvps", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  status: text("status").notNull().default("pending"),
  respondedAt: text("responded_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Documents / Circulars ───

export const circulars = sqliteTable("circulars", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  category: text("category").default("general"),
  targetRole: text("target_role"),
  targetDepartmentId: text("target_department_id").references(
    () => departments.id
  ),
  targetInstitutionId: text("target_institution_id").references(
    () => institutions.id
  ),
  uploadedById: text("uploaded_by_id")
    .notNull()
    .references(() => staff.id),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Polls ───

export const polls = sqliteTable("polls", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  question: text("question").notNull(),
  options: text("options", { mode: "json" }).$type<string[]>().notNull(),
  targetRole: text("target_role"),
  targetDepartmentId: text("target_department_id").references(
    () => departments.id
  ),
  targetInstitutionId: text("target_institution_id").references(
    () => institutions.id
  ),
  createdById: text("created_by_id")
    .notNull()
    .references(() => staff.id),
  expiresAt: text("expires_at"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const pollResponses = sqliteTable("poll_responses", {
  id: text("id").primaryKey(),
  pollId: text("poll_id")
    .notNull()
    .references(() => polls.id),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  selectedOption: integer("selected_option").notNull(),
  respondedAt: text("responded_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Bookings ───

export const bookingResources = sqliteTable("booking_resources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  capacity: integer("capacity"),
  location: text("location"),
  institutionId: text("institution_id").references(() => institutions.id),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  resourceId: text("resource_id")
    .notNull()
    .references(() => bookingResources.id),
  bookerId: text("booker_id")
    .notNull()
    .references(() => staff.id),
  title: text("title").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").notNull().default("pending"),
  approvedById: text("approved_by_id").references(() => staff.id),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Help Desk ───

export const helpDeskTickets = sqliteTable("help_desk_tickets", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("it"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  submittedById: text("submitted_by_id")
    .notNull()
    .references(() => staff.id),
  assignedToId: text("assigned_to_id").references(() => staff.id),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const helpDeskComments = sqliteTable("help_desk_comments", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id")
    .notNull()
    .references(() => helpDeskTickets.id),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Notifications ───

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("general"),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Staff Recognition ───

export const staffRecognition = sqliteTable("staff_recognition", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id),
  recognitionType: text("recognition_type").notNull(),
  message: text("message"),
  recognizedById: text("recognized_by_id").references(() => staff.id),
  date: text("date").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Audit Log ───

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").references(() => staff.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: text("details", { mode: "json" }).$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});
