import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
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
  allocatedBudget: real("allocated_budget").default(0),
  fiscalYear: text("fiscal_year"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").references(() => institutions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  headUserId: text("head_user_id").references(() => staff.id, { onDelete: "set null" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const subDepartments = sqliteTable("sub_departments", {
  id: text("id").primaryKey(),
  departmentId: text("department_id")
    .notNull()
    .references(() => departments.id, { onDelete: "cascade" }),
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
  qualifications: text("qualifications"),
  certificates: text("certificates"),
  experienceYears: real("experience_years"),
  skills: text("skills"),
  languages: text("languages"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  aadhaar: text("aadhaar"),
  pan: text("pan"),
  bankAccount: text("bank_account"),
  ifscCode: text("ifsc_code"),
  contractEndDate: text("contract_end_date"),
  teachingSubjects: text("teaching_subjects"),
  biography: text("biography"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  tokenVersion: integer("token_version").notNull().default(0),
  isFirstLogin: integer("is_first_login", { mode: "boolean" }).notNull().default(true),
  onboardingCompletedAt: text("onboarding_completed_at"),
  passwordHash: text("password_hash"),
  nfcTagId: text("nfc_tag_id").unique(),
  faceEmbedding: text("face_embedding"),
  faceRegisteredAt: text("face_registered_at"),
  fingerprintHash: text("fingerprint_hash"),
  fingerprintRegisteredAt: text("fingerprint_registered_at"),
  biometricEnabled: integer("biometric_enabled", { mode: "boolean" }).notNull().default(false),
  modelVersion: text("model_version").default("facenet-512d-v1"),
  biometricStatus: text("biometric_status").default("active"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  nfcTagIdx: uniqueIndex("idx_staff_nfc_tag").on(t.nfcTagId),
}));

export const staffDepartments = sqliteTable("staff_departments", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  departmentId: text("department_id")
    .notNull()
    .references(() => departments.id, { onDelete: "cascade" }),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
}, (t) => ({
  staffIdIdx: index("idx_staff_departments_staff_id").on(t.staffId),
  deptIdIdx: index("idx_staff_departments_dept_id").on(t.departmentId),
}));

export const staffInstitutions = sqliteTable("staff_institutions", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  institutionId: text("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" }),
}, (t) => ({
  staffIdIdx: index("idx_staff_institutions_staff_id").on(t.staffId),
  instIdIdx: index("idx_staff_institutions_inst_id").on(t.institutionId),
}));

export const academicYears = sqliteTable("academic_years", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").references(() => institutions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").references(() => institutions.id, { onDelete: "cascade" }),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  section: text("section"),
  academicYearId: text("academic_year_id").references(() => academicYears.id, { onDelete: "set null" }),
  teacherId: text("teacher_id").references(() => staff.id, { onDelete: "set null" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  admissionNo: text("admission_no").notNull(),
  studentId: text("student_id"), // Roll or ID alias
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  avatarUrl: text("avatar_url"),
  bloodGroup: text("blood_group"),
  classId: text("class_id").references(() => classes.id, { onDelete: "set null" }),
  academicYearId: text("academic_year_id").references(() => academicYears.id, { onDelete: "set null" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  nfcTagId: text("nfc_tag_id"),
  qrCode: text("qr_code"),
  faceEmbedding: text("face_embedding"), // AES-256-GCM encrypted "iv:authTag:ciphertext"
  modelVersion: text("model_version").default("facenet-512d-v1"),
  biometricEnrolledAt: text("biometric_enrolled_at"),
  biometricStatus: text("biometric_status").default("active"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  classIdx: index("idx_students_class").on(t.classId),
  instIdx: index("idx_students_institution").on(t.institutionId),
  instStudentUniq: uniqueIndex("idx_students_inst_admission_no").on(t.institutionId, t.admissionNo),
  nfcTagIdx: index("idx_students_nfc_tag").on(t.nfcTagId),
}));

export const guardians = sqliteTable("guardians", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  relation: text("relation").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  occupation: text("occupation"),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const studentGuardians = sqliteTable("student_guardians", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  guardianId: text("guardian_id").notNull().references(() => guardians.id, { onDelete: "cascade" }),
  relationship: text("relationship"),
  canPickup: integer("can_pickup", { mode: "boolean" }).notNull().default(false),
  isEmergencyContact: integer("is_emergency_contact", { mode: "boolean" }).notNull().default(false),
}, (t) => ({
  studentGuardianUniq: uniqueIndex("idx_student_guardians_uniq").on(t.studentId, t.guardianId),
}));

export const studentAttendanceLogs = sqliteTable("student_attendance_logs", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  status: text("status").notNull().default("present"),
  period: text("period"),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  markedById: text("marked_by_id").references(() => staff.id, { onDelete: "set null" }),
  method: text("method").notNull().default("manual"),
  reason: text("reason"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  studentDateIdx: uniqueIndex("idx_student_attendance_student_date").on(t.studentId, t.date),
  classDateIdx: index("idx_student_attendance_class_date").on(t.classId, t.date),
}));

export const attendanceRegister = sqliteTable("attendance_register", {
  id: text("id").primaryKey(),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  totalStudents: integer("total_students"),
  presentCount: integer("present_count"),
  absentCount: integer("absent_count"),
  lateCount: integer("late_count"),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  lockedAt: text("locked_at"),
  lockedById: text("locked_by_id").references(() => staff.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  classDateIdx: uniqueIndex("idx_attendance_register_class_date").on(t.classId, t.date),
}));

export const biometricLogs = sqliteTable("biometric_logs", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  status: text("status").notNull(),
  payload: text("payload"),
  deviceId: text("device_id"),
  confidence: real("confidence"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  staffIdIdx: index("idx_biometric_logs_staff_id").on(t.staffId),
}));

// ─── Shifts & Attendance ───

export const shifts = sqliteTable("shifts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  gracePeriodMinutes: integer("grace_period_minutes").notNull().default(15),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
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
    .references(() => staff.id, { onDelete: "cascade" }),
  shiftId: text("shift_id")
    .notNull()
    .references(() => shifts.id, { onDelete: "cascade" }),
  effectiveFrom: text("effective_from").notNull(),
  effectiveTo: text("effective_to"),
}, (t) => ({
  staffDateIdx: uniqueIndex("staff_date_idx").on(t.staffId, t.effectiveFrom),
}));

export const attendanceLogs = sqliteTable("attendance_logs", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
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
  presenceStatus: text("presence_status").default("verified"),
  lastVerifiedAt: text("last_verified_at"),
  geofenceViolations: integer("geofence_violations").default(0),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  staffDateIdx: uniqueIndex("idx_attendance_staff_date").on(t.staffId, t.date),
  dateIdx: index("idx_attendance_date").on(t.date),
  statusIdx: index("idx_attendance_status").on(t.status),
  methodIdx: index("idx_attendance_method").on(t.method),
}));

export const attendanceLocations = sqliteTable("attendance_locations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  institutionId: text("institution_id").references(() => institutions.id, { onDelete: "cascade" }),
  nfcTagId: text("nfc_tag_id"),
  qrSecret: text("qr_secret").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  latitude: real("latitude"),
  longitude: real("longitude"),
  radius: real("radius"),
  accuracy: real("accuracy"),
  wifiSsids: text("wifi_ssids"),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  nfcTagIdx: uniqueIndex("idx_location_nfc_tag").on(t.nfcTagId).where(sql`deleted_at IS NULL`),
  qrSecretIdx: uniqueIndex("idx_location_qr_secret").on(t.qrSecret).where(sql`deleted_at IS NULL`),
  locationActiveIdx: index("idx_location_active").on(t.institutionId).where(sql`deleted_at IS NULL`),
}));

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
    .references(() => staff.id, { onDelete: "cascade" }),
  leaveTypeId: text("leave_type_id")
    .notNull()
    .references(() => leaveTypes.id, { onDelete: "restrict" }),
  totalDays: real("total_days").notNull(),
  usedDays: real("used_days").notNull().default(0),
  year: integer("year").notNull(),
}, (t) => ({
  staffLeaveYearIdx: uniqueIndex("idx_leave_balances_staff_leave_year").on(t.staffId, t.leaveTypeId, t.year),
}));

export const leaveRequests = sqliteTable("leave_requests", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  leaveTypeId: text("leave_type_id")
    .notNull()
    .references(() => leaveTypes.id, { onDelete: "restrict" }),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  daysCount: real("days_count").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  appliedAt: text("applied_at").notNull().default(sql`(current_timestamp)`),
  reviewedById: text("reviewed_by_id").references(() => staff.id, { onDelete: "set null" }),
  reviewedAt: text("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  staffCreatedAtIdx: index("idx_leave_requests_staff_created").on(t.staffId, t.createdAt),
  statusIdx: index("idx_leave_requests_status").on(t.status),
}));

// ─── Tasks ───

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  assignedToId: text("assigned_to_id").references(() => staff.id, { onDelete: "set null" }),
  assignedById: text("assigned_by_id").references(() => staff.id, { onDelete: "set null" }),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
  dueDate: text("due_date"),
  completedAt: text("completed_at"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  assignedToStatusIdx: index("idx_tasks_assigned_to_status").on(t.assignedToId, t.status),
  departmentIdx: index("idx_tasks_department").on(t.departmentId),
}));

export const taskComments = sqliteTable("task_comments", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Daily Reports ───

export const dailyReports = sqliteTable(
  "daily_reports",
  {
    id: text("id").primaryKey(),
    staffId: text("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    summary: text("summary"),
    status: text("status").notNull().default("draft"),
    reviewerComment: text("reviewer_comment"),
    reviewedById: text("reviewed_by_id").references(() => staff.id, { onDelete: "set null" }),
    reviewedAt: text("reviewed_at"),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
    updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
  },
  (t) => ({
    staffDateIdx: uniqueIndex("idx_reports_staff_date").on(t.staffId, t.date),
  })
);

export const dailyReportTasks = sqliteTable("daily_report_tasks", {
  id: text("id").primaryKey(),
  reportId: text("report_id")
    .notNull()
    .references(() => dailyReports.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
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
    () => departments.id, { onDelete: "set null" }
  ),
  targetInstitutionId: text("target_institution_id").references(
    () => institutions.id, { onDelete: "set null" }
  ),
  createdById: text("created_by_id")
    .notNull()
    .references(() => staff.id, { onDelete: "restrict" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  pinnedUntil: text("pinned_until"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  createdActiveIdx: index("idx_announcements_created_active").on(t.createdAt, t.isActive),
}));

export const announcementReads = sqliteTable("announcement_reads", {
  id: text("id").primaryKey(),
  announcementId: text("announcement_id")
    .notNull()
    .references(() => announcements.id, { onDelete: "cascade" }),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
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
  departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
  institutionId: text("institution_id").references(() => institutions.id, { onDelete: "set null" }),
  createdById: text("created_by_id")
    .notNull()
    .references(() => staff.id, { onDelete: "restrict" }),
  maxAttendees: integer("max_attendees"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const eventRsvps = sqliteTable("event_rsvps", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  respondedAt: text("responded_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Documents / Circulars ───

export const circularDownloads = sqliteTable("circular_downloads", {
  id: text("id").primaryKey(),
  circularId: text("circular_id")
    .notNull()
    .references(() => circulars.id, { onDelete: "cascade" }),
  staffId: text("staff_id").references(() => staff.id, { onDelete: "set null" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  downloadedAt: text("downloaded_at").notNull().default(sql`(current_timestamp)`),
});

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
}, (t) => ({
  pollStaffIdx: uniqueIndex("idx_poll_responses_poll_staff").on(t.pollId, t.staffId),
}));

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
}, (t) => ({
  staffCreatedAtIdx: index("idx_notifications_staff_created").on(t.staffId, t.createdAt),
  staffIsReadIdx: index("idx_notifications_staff_is_read").on(t.staffId, t.isRead),
}));

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

// ─── Asset Management ───

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  model: text("model"),
  serialNumber: text("serial_number"),
  institutionId: text("institution_id").references(() => institutions.id),
  assignedToId: text("assigned_to_id").references(() => staff.id),
  location: text("location"),
  purchaseDate: text("purchase_date"),
  purchaseCost: real("purchase_cost"),
  warrantyEnd: text("warranty_end"),
  status: text("status").notNull().default("available"),
  qrCode: text("qr_code"),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const assetServiceHistory = sqliteTable("asset_service_history", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull().references(() => assets.id),
  serviceDate: text("service_date").notNull(),
  description: text("description").notNull(),
  cost: real("cost"),
  servicedBy: text("serviced_by"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Expense Claims ───

export const expenseClaims = sqliteTable("expense_claims", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  receiptUrl: text("receipt_url"),
  status: text("status").notNull().default("pending"),
  reviewedById: text("reviewed_by_id").references(() => staff.id),
  reviewedAt: text("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  staffStatusIdx: index("idx_expense_claims_staff_status").on(t.staffId, t.status),
  statusIdx: index("idx_expense_claims_status").on(t.status),
}));

// ─── Purchase Requests ───

export const purchaseRequests = sqliteTable("purchase_requests", {
  id: text("id").primaryKey(),
  requesterId: text("requester_id").notNull().references(() => staff.id),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  estimatedCost: real("estimated_cost"),
  justification: text("justification"),
  status: text("status").notNull().default("pending_hod"),
  approvedByHodId: text("approved_by_hod_id").references(() => staff.id),
  approvedByAccountsId: text("approved_by_accounts_id").references(() => staff.id),
  approvedByPurchaseId: text("approved_by_purchase_id").references(() => staff.id),
  approvedAt: text("approved_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  requesterStatusIdx: index("idx_purchase_requests_requester_status").on(t.requesterId, t.status),
  statusIdx: index("idx_purchase_requests_status").on(t.status),
}));

// ─── Visitor Management ───

export const visitors = sqliteTable("visitors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact"),
  idType: text("id_type"),
  idNumber: text("id_number"),
  hostStaffId: text("host_staff_id").references(() => staff.id),
  purpose: text("purpose").notNull(),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out"),
  status: text("status").notNull().default("checked_in"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Grievances / Suggestions ───

export const grievances = sqliteTable("grievances", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").references(() => staff.id),
  isAnonymous: integer("is_anonymous", { mode: "boolean" }).notNull().default(true),
  category: text("category").notNull().default("general"),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  response: text("response"),
  respondedById: text("responded_by_id").references(() => staff.id),
  respondedAt: text("responded_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Staff Availability Status ───

export const staffAvailability = sqliteTable("staff_availability", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().unique().references(() => staff.id),
  status: text("status").notNull().default("available"),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Performance Reviews ───

export const performanceReviews = sqliteTable("performance_reviews", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").references(() => institutions.id),
  cycleId: text("cycle_id").references(() => performanceCycles.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  evaluatorStaffId: text("evaluator_staff_id").references(() => staff.id),
  reviewerId: text("reviewer_id").references(() => staff.id),
  formTemplateId: text("form_template_id").references(() => evaluationForms.id),
  period: text("period"),
  rating: real("rating"),
  selfScore: real("self_score"),
  managerScore: real("manager_score"),
  finalScore: real("final_score"),
  grade: text("grade"),
  status: text("status").notNull().default("self_assessment"),
  selfComments: text("self_comments"),
  managerComments: text("manager_comments"),
  hrComments: text("hr_comments"),
  achievements: text("achievements"),
  areasForImprovement: text("areas_for_improvement"),
  goals: text("goals"),
  ratingsJson: text("ratings_json"),
  submittedAt: text("submitted_at"),
  approvedAt: text("approved_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
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

// ─── Financial / Accounts ───

export const financialTransactions = sqliteTable("financial_transactions", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  type: text("type").notNull(),
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  transactionDate: text("transaction_date").notNull(),
  recordedById: text("recorded_by_id").notNull().references(() => staff.id),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  instDateIdx: index("idx_financial_tx_inst_date").on(t.institutionId, t.transactionDate),
  recordedByIdx: index("idx_financial_tx_recorded_by").on(t.recordedById),
  typeIdx: index("idx_financial_tx_type").on(t.type),
  categoryIdx: index("idx_financial_tx_category").on(t.category),
}));

// ─── Vehicle Management ───

export const vehicles = sqliteTable("vehicles", {
  id: text("id").primaryKey(),
  registrationNumber: text("registration_number").notNull().unique(),
  model: text("model").notNull(),
  type: text("type").notNull(),
  capacity: integer("capacity").notNull().default(1),
  fuelType: text("fuel_type").notNull().default("petrol"),
  institutionId: text("institution_id").references(() => institutions.id),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const vehicleBookings = sqliteTable("vehicle_bookings", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id),
  bookedById: text("booked_by_id").notNull().references(() => staff.id),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  purpose: text("purpose").notNull(),
  destination: text("destination"),
  status: text("status").notNull().default("pending"),
  approvedById: text("approved_by_id").references(() => staff.id),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const vehicleLogs = sqliteTable("vehicle_logs", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id),
  driverId: text("driver_id").notNull().references(() => staff.id),
  date: text("date").notNull(),
  startOdometer: integer("start_odometer"),
  endOdometer: integer("end_odometer"),
  distanceKm: real("distance_km"),
  fuelLitres: real("fuel_litres"),
  fuelCost: real("fuel_cost"),
  route: text("route"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Canteen / Meal Management ───

export const mealNotifications = sqliteTable("meal_notifications", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  date: text("date").notNull(),
  mealType: text("meal_type").notNull(),
  status: text("status").notNull().default("skip"),
  guestCount: integer("guest_count").default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Approval Delegations ───

export const approvalDelegations = sqliteTable("approval_delegations", {
  id: text("id").primaryKey(),
  delegatorId: text("delegator_id").notNull().references(() => staff.id),
  delegateId: text("delegate_id").notNull().references(() => staff.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  reason: text("reason"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Checklist Templates (Onboarding / Offboarding) ───

export const checklistTemplates = sqliteTable("checklist_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("onboarding"),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const checklistTemplateItems = sqliteTable("checklist_template_items", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull().references(() => checklistTemplates.id),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const staffChecklists = sqliteTable("staff_checklists", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  templateId: text("template_id").references(() => checklistTemplates.id),
  type: text("type").notNull().default("onboarding"),
  status: text("status").notNull().default("pending"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  notes: text("notes"),
  createdById: text("created_by_id").references(() => staff.id),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const staffChecklistTasks = sqliteTable("staff_checklist_tasks", {
  id: text("id").primaryKey(),
  checklistId: text("checklist_id").notNull().references(() => staffChecklists.id),
  title: text("title").notNull(),
  description: text("description"),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  completedById: text("completed_by_id").references(() => staff.id),
  completedAt: text("completed_at"),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Marketplace / App Registry ───

export const marketplaceApps = sqliteTable("marketplace_apps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  category: text("category").notNull(), // "instant" | "restricted"
  departmentId: text("department_id").references(() => departments.id),
  subdomain: text("subdomain"),
  routePrefix: text("route_prefix"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const appDefaultRoles = sqliteTable("app_default_roles", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull().references(() => marketplaceApps.id),
  roleName: text("role_name").notNull(),
  permissions: text("permissions").notNull(), // JSON array
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const userAppAssignments = sqliteTable("user_app_assignments", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  appId: text("app_id").notNull().references(() => marketplaceApps.id),
  roleId: text("role_id").notNull().references(() => appDefaultRoles.id),
  status: text("status").notNull().default("active"), // "active" | "revoked"
  installedAt: text("installed_at").notNull().default(sql`(current_timestamp)`),
  revokedAt: text("revoked_at"),
  revokedById: text("revoked_by_id").references(() => staff.id),
  revokedReason: text("revoked_reason"),
}, (t) => ({
  staffAppIdx: uniqueIndex("idx_user_app_assignments_staff_app").on(t.staffId, t.appId),
}));

// ─── NFC Card Management ───

export const nfcCards = sqliteTable("nfc_cards", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().unique(), // Normalized uppercase hex e.g. "04A2B3C4"
  serialNumber: text("serial_number"),
  ownerType: text("owner_type").notNull().default("staff"), // "staff" | "student"
  ownerId: text("owner_id"),
  status: text("status").notNull().default("available"), // "available" | "assigned" | "revoked" | "lost"
  issuedById: text("issued_by_id").references(() => staff.id),
  issuedAt: text("issued_at"),
  lastCheckedAt: text("last_checked_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  statusIdx: index("idx_nfc_cards_status").on(t.status),
  ownerIdx: index("idx_nfc_cards_owner").on(t.ownerType, t.ownerId),
}));

export const nfcCardHistory = sqliteTable("nfc_card_history", {
  id: text("id").primaryKey(),
  cardId: text("card_id").notNull().references(() => nfcCards.id),
  action: text("action").notNull(),
  actorId: text("actor_id").references(() => staff.id),
  targetStaffId: text("target_staff_id").references(() => staff.id),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  cardIdIdx: index("idx_nfc_card_history_card_id").on(t.cardId),
}));

// ─── WebView Auth Handoff (nonce replay protection) ───

export const usedNonces = sqliteTable("used_nonces", {
  jti: text("jti").primaryKey(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const accessRequests = sqliteTable("access_requests", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  appId: text("app_id").notNull().references(() => marketplaceApps.id),
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
  reason: text("reason"),
  assignedRoleId: text("assigned_role_id").references(() => appDefaultRoles.id),
  routedToId: text("routed_to_id").references(() => staff.id),
  reviewedAt: text("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Presence Verification ───

export const presenceLogs = sqliteTable("presence_logs", {
  id: text("id").primaryKey(),
  attendanceId: text("attendance_id").notNull().references(() => attendanceLogs.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  accuracy: real("accuracy"),
  isWithinGeofence: integer("is_within_geofence", { mode: "boolean" }).notNull().default(true),
  isMockLocation: integer("is_mock_location", { mode: "boolean" }).default(false),
  wifiSsid: text("wifi_ssid"),
  verificationMethod: text("verification_method").default("gps"),
  distanceFromOffice: real("distance_from_office"),
  networkState: text("network_state").default("online"),
  batteryLevel: integer("battery_level"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const presenceVerificationSettings = sqliteTable("presence_verification_settings", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").references(() => institutions.id, { onDelete: "cascade" }),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  shadowMode: integer("shadow_mode", { mode: "boolean" }).notNull().default(true),
  checkIntervalMinutes: integer("check_interval_minutes").notNull().default(10),
  gracePeriodMinutes: integer("grace_period_minutes").notNull().default(5),
  autoCheckoutOnViolation: integer("auto_checkout_on_violation", { mode: "boolean" }).notNull().default(false),
  geofenceRadiusMeters: integer("geofence_radius_meters").notNull().default(150),
  lowBatteryIntervalMinutes: integer("low_battery_interval_minutes").notNull().default(15),
  criticalBatterySuspend: integer("critical_battery_suspend", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  instIdUniqIdx: uniqueIndex("idx_settings_inst_id").on(t.institutionId).where(sql`institution_id IS NOT NULL`),
  globalUniqIdx: uniqueIndex("idx_settings_global_uniq").on(t.isEnabled).where(sql`institution_id IS NULL`),
}));

export const fieldWorkSessions = sqliteTable("field_work_sessions", {
  id: text("id").primaryKey(),
  attendanceId: text("attendance_id").notNull().references(() => attendanceLogs.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  startedAt: text("started_at").notNull().default(sql`(current_timestamp)`),
  endedAt: text("ended_at"),
  reason: text("reason"),
  status: text("status").notNull().default("pending_approval"),
  approvedBy: text("approved_by").references(() => staff.id),
  approvedAt: text("approved_at"),
  rejectionReason: text("rejection_reason"),
  locationSnapshots: text("location_snapshots"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Chat / Messaging ───

export const chatRooms = sqliteTable("chat_rooms", {
  id: text("id").primaryKey(),
  name: text("name"),
  createdById: text("created_by_id").notNull().references(() => staff.id, { onDelete: "restrict" }),
  lastMessageTime: text("last_message_time"),
  lastMessagePreview: text("last_message_preview"),
  iconUrl: text("icon_url"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  createdByIdx: index("chat_rooms_creator_idx").on(t.createdById),
}));

export const chatParticipants = sqliteTable("chat_participants", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("Member"),
  addedById: text("added_by_id").references(() => staff.id, { onDelete: "set null" }),
  lastReadAt: text("last_read_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  roomIdIdx: index("chat_participants_room_idx").on(t.roomId),
  staffIdIdx: index("chat_participants_staff_idx").on(t.staffId),
  roomStaffUniq: uniqueIndex("chat_participants_room_staff_uniq").on(t.roomId, t.staffId),
}));

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => staff.id, { onDelete: "restrict" }),
  text: text("text"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type").notNull().default("text"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  roomIdIdx: index("chat_messages_room_idx").on(t.roomId),
  senderIdIdx: index("chat_messages_sender_idx").on(t.senderId),
}));

// ─── Presence & Activity Logs ───

export const presence = sqliteTable("presence", {
  staffId: text("staff_id").primaryKey().references(() => staff.id, { onDelete: "cascade" }),
  online: integer("online", { mode: "boolean" }).notNull().default(false),
  lastSeenAt: text("last_seen_at").notNull(),
  status: text("status").notNull().default("active"),
  statusText: text("status_text"),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: text("staff_id").references(() => staff.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  staffIdIdx: index("activity_logs_staff_idx").on(t.staffId),
  actionIdx: index("activity_logs_action_idx").on(t.action),
  resourceIdx: index("activity_logs_resource_idx").on(t.resourceType),
}));

export const systemConfigs = sqliteTable("system_configs", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Media Library (MediaHive) ───

export const mediaFolders = sqliteTable("media_folders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  parentId: text("parent_id").references((): any => mediaFolders.id, { onDelete: "cascade" }),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "cascade" }),
  createdById: text("created_by_id").notNull().references(() => staff.id),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  fileType: text("file_type").notNull(), // 'image' | 'video' | 'audio' | 'document'
  status: text("status").notNull().default("ready"), // 'ready' | 'processing' | 'failed'
  folderId: text("folder_id").references(() => mediaFolders.id, { onDelete: "cascade" }),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  downloadCount: integer("download_count").notNull().default(0),
  createdById: text("created_by_id").notNull().references(() => staff.id),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  folderIdIdx: index("idx_media_assets_folder_id").on(t.folderId),
  fileTypeIdx: index("idx_media_assets_file_type").on(t.fileType),
  statusIdx: index("idx_media_assets_status").on(t.status),
}));

export const mediaShareLinks = sqliteTable("media_share_links", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").references(() => mediaAssets.id, { onDelete: "cascade" }),
  folderId: text("folder_id").references(() => mediaFolders.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  passwordHash: text("password_hash"),
  expiresAt: text("expires_at"),
  downloadCount: integer("download_count").notNull().default(0),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  createdById: text("created_by_id").notNull().references(() => staff.id),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const mediaDownloads = sqliteTable("media_downloads", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => staff.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  downloadedAt: text("downloaded_at").notNull().default(sql`(current_timestamp)`),
});

export const mediaUploads = sqliteTable("media_uploads", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  sha256: text("sha256").notNull(),
  totalChunks: integer("total_chunks").notNull(),
  completedChunks: text("completed_chunks", { mode: "json" }).$type<number[]>().notNull(),
  createdById: text("created_by_id").notNull().references(() => staff.id),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Auth Tokens ───

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  staffId: text("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── WebAuthn / FIDO2 ───

export const webauthnCredentials = sqliteTable("webauthn_credentials", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  algorithm: integer("algorithm").notNull(),
  transports: text("transports").notNull().default(""),
  counter: integer("counter").notNull().default(0),
  backupEligible: integer("backup_eligible", { mode: "boolean" }).notNull().default(false),
  backupState: integer("backup_state", { mode: "boolean" }).notNull().default(false),
  deviceName: text("device_name"),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  staffIdIdx: index("idx_webauthn_staff_id").on(t.staffId),
}));

export const credentialChallenges = sqliteTable("credential_challenges", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").references(() => staff.id),
  challenge: text("challenge").notNull(),
  type: text("type").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  expiresIdx: index("idx_credential_challenges_expires").on(t.expiresAt),
}));

// ─── FCM Staff Device Tokens ───

export const staffDeviceTokens = sqliteTable("staff_device_tokens", {
  id: text("id").primaryKey(),
  staffId: text("staff_id")
    .notNull()
    .references(() => staff.id, { onDelete: "cascade" }),
  institutionId: text("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull(), // 'android' | 'ios' | 'web'
  deviceName: text("device_name"),
  lastUsedAt: text("last_used_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Tenant Encryption Keys (Crypto-Shredding) ───

export const institutionEncryptionKeys = sqliteTable("institution_encryption_keys", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().unique().references(() => institutions.id, { onDelete: "cascade" }),
  encryptedKey: text("encrypted_key").notNull(), // Random 32-byte AES-256 key wrapped by APP_MASTER_SECRET
  algorithm: text("algorithm").notNull().default("AES-GCM-256"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const classSections = sqliteTable("class_sections", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  academicYearId: text("academic_year_id").notNull().references(() => academicYears.id),
  name: text("name").notNull(), // e.g. "Grade 10-A"
  gradeLevel: integer("grade_level").notNull(),
  capacity: integer("capacity").notNull().default(40),
  roomNumber: text("room_number"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const studentBiometricConsents = sqliteTable("student_biometric_consents", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  guardianId: text("guardian_id").references(() => studentGuardians.id),
  recordedByStaffId: text("recorded_by_staff_id").references(() => staff.id),
  consentMethod: text("consent_method").notNull().default("signed_paper_form"), // "signed_paper_form" | "guardian_portal_otp"
  consentedAt: text("consented_at").notNull().default(sql`(current_timestamp)`),
  policyVersion: text("policy_version").notNull().default("1.0"),
  revokedAt: text("revoked_at"),
});

// ─── Examination Management ───

export const gradeScales = sqliteTable("grade_scales", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  scaleType: text("scale_type").notNull().default("10_point"), // '10_point' | 'letter' | 'percentage'
  rulesJson: text("rules_json").notNull(), // JSON array of scale ranges
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const exams = sqliteTable("exams", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  academicYear: text("academic_year").notNull(),
  term: text("term").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  gradeScaleId: text("grade_scale_id").references(() => gradeScales.id),
  status: text("status").notNull().default("draft"), // 'draft' | 'scheduled' | 'ongoing' | 'evaluation' | 'published'
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const examSchedules = sqliteTable("exam_schedules", {
  id: text("id").primaryKey(),
  examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  courseId: text("course_id"),
  subjectName: text("subject_name").notNull(),
  examDate: text("exam_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(180),
  maxMarks: real("max_marks").notNull().default(100),
  passMarks: real("pass_marks").notNull().default(40),
  roomNumber: text("room_number"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const hallTickets = sqliteTable("hall_tickets", {
  id: text("id").primaryKey(),
  examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  ticketNumber: text("ticket_number").notNull().unique(),
  feeCleared: integer("fee_cleared", { mode: "boolean" }).notNull().default(false),
  overrideFeeLock: integer("override_fee_lock", { mode: "boolean" }).notNull().default(false),
  overrideReason: text("override_reason"),
  overrideByStaffId: text("override_by_staff_id").references(() => staff.id),
  qrPayload: text("qr_payload").notNull(),
  status: text("status").notNull().default("issued"), // 'issued' | 'blocked' | 'cancelled'
  issuedAt: text("issued_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const markEntries = sqliteTable("mark_entries", {
  id: text("id").primaryKey(),
  examScheduleId: text("exam_schedule_id").notNull().references(() => examSchedules.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  marksObtained: real("marks_obtained"),
  maxMarks: real("max_marks").notNull().default(100),
  isAbsent: integer("is_absent", { mode: "boolean" }).notNull().default(false),
  evaluatorToken: text("evaluator_token"),
  doubleBlind: integer("double_blind", { mode: "boolean" }).notNull().default(false),
  remarks: text("remarks"),
  status: text("status").notNull().default("draft"), // 'draft' | 'submitted' | 'moderated' | 'approved'
  enteredByStaffId: text("entered_by_staff_id").references(() => staff.id),
  moderatedByStaffId: text("moderated_by_staff_id").references(() => staff.id),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  examScheduleIdx: index("idx_mark_entries_exam_schedule").on(t.examScheduleId),
  studentIdx: index("idx_mark_entries_student").on(t.studentId),
  scheduleStudentUniq: uniqueIndex("idx_mark_entries_schedule_student_uniq").on(t.examScheduleId, t.studentId),
}));

export const tabulationRegisters = sqliteTable("tabulation_registers", {
  id: text("id").primaryKey(),
  examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  totalMarks: real("total_marks").notNull().default(0),
  percentage: real("percentage").notNull().default(0),
  gpa: real("gpa").notNull().default(0),
  letterGrade: text("letter_grade").notNull().default("F"),
  resultStatus: text("result_status").notNull().default("pending"), // 'pass' | 'fail' | 'compartment' | 'pending'
  rank: integer("rank"),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const examAuditLogs = sqliteTable("exam_audit_logs", {
  id: text("id").primaryKey(),
  examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(), // 'exam' | 'schedule' | 'hall_ticket' | 'mark' | 'result'
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(), // 'create' | 'update' | 'delete' | 'override_fee_lock' | 'publish'
  performedByStaffId: text("performed_by_staff_id").references(() => staff.id),
  previousState: text("previous_state"),
  newState: text("new_state"),
  reason: text("reason"),
  timestamp: text("timestamp").notNull().default(sql`(current_timestamp)`),
});

// ─── Services Module & Campus Operations (Sprint-006) ───

export const fleetRoutes = sqliteTable("fleet_routes", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  name: text("name").notNull(),
  startLocation: text("start_location").notNull(),
  endLocation: text("end_location").notNull(),
  stopsJson: text("stops_json"),
  driverId: text("driver_id").references(() => staff.id),
  vehicleId: text("vehicle_id").references(() => vehicles.id),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const fleetMaintenanceLogs = sqliteTable("fleet_maintenance_logs", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id),
  maintenanceDate: text("maintenance_date").notNull(),
  serviceType: text("service_type").notNull(), // oil_change | tire_replacement | engine_check | general
  cost: real("cost").notNull().default(0.0),
  odometerReading: integer("odometer_reading"),
  description: text("description"),
  performedBy: text("performed_by"),
  status: text("status").notNull().default("completed"), // scheduled | in_progress | completed
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const canteenItems = sqliteTable("canteen_items", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  name: text("name").notNull(),
  category: text("category").notNull().default("snacks"), // breakfast | lunch | snacks | beverages
  price: real("price").notNull(),
  isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
  dietaryFlags: text("dietary_flags"), // vegetarian | nut_free | gluten_free | vegan
  imageUrl: text("image_url"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const canteenMenus = sqliteTable("canteen_menus", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  date: text("date").notNull(),
  mealType: text("meal_type").notNull(), // breakfast | lunch | snacks
  itemsJson: text("items_json").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const canteenMealPasses = sqliteTable("canteen_meal_passes", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  userId: text("user_id").notNull(),
  passCode: text("pass_code").notNull().unique(),
  balance: real("balance").notNull().default(0.0),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("active"), // active | suspended | blocked
  dailyLimit: real("daily_limit"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const canteenTransactions = sqliteTable("canteen_transactions", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  passId: text("pass_id").notNull().references(() => canteenMealPasses.id),
  passCode: text("pass_code").notNull(),
  userId: text("user_id").notNull(),
  itemsJson: text("items_json").notNull(),
  totalAmount: real("total_amount").notNull(),
  idempotencyKey: text("idempotency_key").unique(),
  cashierStaffId: text("cashier_staff_id").references(() => staff.id),
  status: text("status").notNull().default("completed"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const visitorRequests = sqliteTable("visitor_requests", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  visitorName: text("visitor_name").notNull(),
  visitorPhone: text("visitor_phone").notNull(),
  visitorEmail: text("visitor_email"),
  idType: text("id_type"),
  idNumber: text("id_number"),
  hostStaffId: text("host_staff_id").notNull().references(() => staff.id),
  purpose: text("purpose").notNull(),
  expectedDate: text("expected_date").notNull(),
  expectedTimeWindow: text("expected_time_window"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | cancelled
  rejectionReason: text("rejection_reason"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const visitorPasses = sqliteTable("visitor_passes", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  requestId: text("request_id").references(() => visitorRequests.id),
  visitorName: text("visitor_name").notNull(),
  visitorPhone: text("visitor_phone").notNull(),
  hostStaffId: text("host_staff_id").notNull().references(() => staff.id),
  purpose: text("purpose").notNull(),
  qrSignature: text("qr_signature").notNull(),
  validFrom: text("valid_from").notNull(),
  validUntil: text("valid_until").notNull(),
  status: text("status").notNull().default("approved"), // approved | checked_in | checked_out | expired
  checkInAt: text("check_in_at"),
  checkOutAt: text("check_out_at"),
  gatekeeperId: text("gatekeeper_id").references(() => staff.id),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const gateLogs = sqliteTable("gate_logs", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  passId: text("pass_id").references(() => visitorPasses.id),
  visitorName: text("visitor_name").notNull(),
  actionType: text("action_type").notNull(), // check_in | check_out | denied
  timestamp: text("timestamp").notNull().default(sql`(current_timestamp)`),
  gatekeeperId: text("gatekeeper_id").references(() => staff.id),
  deviceId: text("device_id"),
  isOfflineSync: integer("is_offline_sync", { mode: "boolean" }).notNull().default(false),
  syncTimestamp: text("sync_timestamp"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Performance Reviews & HR Development (Sprint-007) ───

export const performanceCycles = sqliteTable("performance_cycles", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  title: text("title").notNull(),
  cycleType: text("cycle_type").notNull().default("quarterly"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  selfAssessmentDeadline: text("self_assessment_deadline").notNull(),
  managerReviewDeadline: text("manager_review_deadline").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const competencyFrameworks = sqliteTable("competency_frameworks", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  name: text("name").notNull(),
  departmentId: text("department_id").references(() => departments.id),
  roleScope: text("role_scope").default("all"),
  metricsJson: text("metrics_json").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const evaluationForms = sqliteTable("evaluation_forms", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  frameworkId: text("framework_id").notNull().references(() => competencyFrameworks.id),
  title: text("title").notNull(),
  description: text("description"),
  metricsConfigJson: text("metrics_config_json").notNull(),
  ratingScale: text("rating_scale").default("1-5"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const performanceGoals = sqliteTable("performance_goals", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  reviewId: text("review_id").references(() => performanceReviews.id),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date").notNull(),
  progressPercentage: integer("progress_percentage").notNull().default(0),
  status: text("status").notNull().default("in_progress"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const feedbackRequests = sqliteTable("feedback_requests", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  reviewId: text("review_id").notNull().references(() => performanceReviews.id),
  requesterStaffId: text("requester_staff_id").notNull().references(() => staff.id),
  peerStaffId: text("peer_staff_id").notNull().references(() => staff.id),
  feedbackText: text("feedback_text"),
  rating: real("rating"),
  status: text("status").notNull().default("pending"),
  submittedAt: text("submitted_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const developmentPlans = sqliteTable("development_plans", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  reviewId: text("review_id").references(() => performanceReviews.id),
  title: text("title").notNull(),
  actionItemsJson: text("action_items_json").notNull(),
  targetCompletionDate: text("target_completion_date").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// ─── AI Predictive Analytics & Sync Engine (Sprint-008) ───

export const aiModels = sqliteTable("ai_models", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  modelName: text("model_name").notNull(),
  domain: text("domain").notNull(),
  version: text("version").notNull(),
  accuracyScore: real("accuracy_score"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastTrainedAt: text("last_trained_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const aiPredictions = sqliteTable("ai_predictions", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  domain: text("domain").notNull(),
  targetEntityId: text("target_entity_id").notNull(),
  targetEntityType: text("target_entity_type").notNull(),
  predictionType: text("prediction_type").notNull(),
  riskLevel: text("risk_level").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  predictedValue: text("predicted_value"),
  riskFactors: text("risk_factors"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const aiAnomalies = sqliteTable("ai_anomalies", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  anomalyType: text("anomaly_type").notNull(),
  severity: text("severity").notNull(),
  description: text("description").notNull(),
  metricData: text("metric_data"),
  status: text("status").notNull().default("unresolved"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const syncStates = sqliteTable("sync_states", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  deviceId: text("device_id").notNull(),
  userId: text("user_id").notNull(),
  lastSyncVersion: integer("last_sync_version").notNull().default(0),
  lastSyncAt: text("last_sync_at").notNull(),
  devicePlatform: text("device_platform").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const syncConflictLogs = sqliteTable("sync_conflict_logs", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  fieldName: text("field_name").notNull(),
  winningValue: text("winning_value"),
  losingValue: text("losing_value"),
  resolutionStrategy: text("resolution_strategy").notNull().default("LWW"),
  resolvedAt: text("resolved_at").notNull().default(sql`(current_timestamp)`),
});

export const syncDeviceRegistrations = sqliteTable("sync_device_registrations", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  userId: text("user_id").notNull(),
  deviceId: text("device_id").notNull(),
  deviceModel: text("device_model"),
  osVersion: text("os_version"),
  appVersion: text("app_version"),
  pushToken: text("push_token"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastActiveAt: text("last_active_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Multi-Campus Regional Analytics & Enterprise Data Warehouse (Sprint-009) ───

export const regionalGroups = sqliteTable("regional_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  regionalDirectorId: text("regional_director_id"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const institutionClusters = sqliteTable("institution_clusters", {
  id: text("id").primaryKey(),
  regionalGroupId: text("regional_group_id").notNull().references(() => regionalGroups.id, { onDelete: "cascade" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  clusterCategory: text("cluster_category").notNull().default("standard"),
  assignedAt: text("assigned_at").notNull().default(sql`(current_timestamp)`),
});

export const regionalAccessGrants = sqliteTable("regional_access_grants", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  regionalGroupId: text("regional_group_id").notNull().references(() => regionalGroups.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  grantedBy: text("granted_by").notNull(),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const regionalBenchmarks = sqliteTable("regional_benchmarks", {
  id: text("id").primaryKey(),
  regionalGroupId: text("regional_group_id").notNull().references(() => regionalGroups.id, { onDelete: "cascade" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  metricDomain: text("metric_domain").notNull(),
  period: text("period").notNull(),
  rawScore: real("raw_score").notNull(),
  normalizedScore: real("normalized_score").notNull(),
  percentileRank: real("percentile_rank").notNull(),
  rankPosition: integer("rank_position").notNull(),
  calculatedAt: text("calculated_at").notNull().default(sql`(current_timestamp)`),
});

export const regionalHodRankings = sqliteTable("regional_hod_rankings", {
  id: text("id").primaryKey(),
  regionalGroupId: text("regional_group_id").notNull().references(() => regionalGroups.id, { onDelete: "cascade" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  hodStaffId: text("hod_staff_id").notNull().references(() => staff.id),
  discipline: text("discipline").notNull(),
  compositeScore: real("composite_score").notNull(),
  rankPosition: integer("rank_position").notNull(),
  performanceFactors: text("performance_factors"),
  evaluatedAt: text("evaluated_at").notNull().default(sql`(current_timestamp)`),
});

export const dwAggregatedAnalytics = sqliteTable("dw_aggregated_analytics", {
  id: text("id").primaryKey(),
  regionalGroupId: text("regional_group_id").notNull().references(() => regionalGroups.id, { onDelete: "cascade" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  snapshotDate: text("snapshot_date").notNull(),
  attendanceRate: real("attendance_rate").notNull(),
  feeRealizationRate: real("fee_realization_rate").notNull(),
  academicPassRate: real("academic_pass_rate").notNull(),
  aiRiskStudentCount: integer("ai_risk_student_count").notNull().default(0),
  activeAnomalyCount: integer("active_anomaly_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const dwMaterializedSnapshots = sqliteTable("dw_materialized_snapshots", {
  id: text("id").primaryKey(),
  regionalGroupId: text("regional_group_id").notNull().references(() => regionalGroups.id, { onDelete: "cascade" }),
  snapshotType: text("snapshot_type").notNull(),
  dataPayload: text("data_payload").notNull(),
  generatedAt: text("generated_at").notNull().default(sql`(current_timestamp)`),
});

export const dwEtlRuns = sqliteTable("dw_etl_runs", {
  id: text("id").primaryKey(),
  regionalGroupId: text("regional_group_id").references(() => regionalGroups.id),
  runType: text("run_type").notNull(),
  status: text("status").notNull().default("running"),
  recordsProcessed: integer("records_processed").notNull().default(0),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  startedAt: text("started_at").notNull().default(sql`(current_timestamp)`),
  completedAt: text("completed_at"),
});

export const pushNotificationSubscriptions = sqliteTable("push_notification_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  institutionId: text("institution_id").references(() => institutions.id),
  deviceToken: text("device_token").notNull().unique(),
  platform: text("platform").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastUsedAt: text("last_used_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const alertDeliveryLogs = sqliteTable("alert_delivery_logs", {
  id: text("id").primaryKey(),
  alertId: text("alert_id").notNull(),
  userId: text("user_id").notNull(),
  deviceId: text("device_id"),
  channel: text("channel").notNull(),
  deliveryStatus: text("delivery_status").notNull(),
  attemptCount: integer("attempt_count").notNull().default(1),
  errorMessage: text("error_message"),
  sentAt: text("sent_at").notNull().default(sql`(current_timestamp)`),
});

export const regionalAccessLogs = sqliteTable("regional_access_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  regionalGroupId: text("regional_group_id").notNull(),
  action: text("action").notNull(),
  targetEntity: text("target_entity"),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Autonomous Enterprise Operations & Self-Healing Platform Engine (Sprint-010) ───

export const autonomousWorkflows = sqliteTable("autonomous_workflows", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  name: text("name").notNull(),
  triggerType: text("trigger_type").notNull(), // anomaly_detected | threshold_breached | schedule
  status: text("status").notNull().default("active"), // active | paused | disabled
  executionCount: integer("execution_count").notNull().default(0),
  lastExecutedAt: text("last_executed_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const remediationRules = sqliteTable("remediation_rules", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id").notNull().references(() => autonomousWorkflows.id, { onDelete: "cascade" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  anomalyType: text("anomaly_type").notNull(), // chronic_absenteeism | fee_default_risk | grade_drop
  severityThreshold: text("severity_threshold").notNull().default("high"), // critical | high | medium | low
  actionPipelineJson: text("action_pipeline_json").notNull(), // array of actions (ticket, reassign, notify)
  cooldownPeriodMinutes: integer("cooldown_period_minutes").notNull().default(1440), // 24h default
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const remediationTickets = sqliteTable("remediation_tickets", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  anomalyId: text("anomaly_id"),
  ruleId: text("rule_id").references(() => remediationRules.id),
  title: text("title").notNull(),
  severity: text("severity").notNull(), // critical | high | medium | low
  category: text("category").notNull(), // attendance | finance | academics | operations
  affectedStudentId: text("affected_student_id"),
  assignedStaffId: text("assigned_staff_id").references(() => staff.id),
  status: text("status").notNull().default("open"), // open | auto_assigned | in_progress | resolved | escalated
  autoCreated: integer("auto_created", { mode: "boolean" }).notNull().default(true),
  resolutionSummary: text("resolution_summary"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const remediationActions = sqliteTable("remediation_actions", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull().references(() => remediationTickets.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(), // auto_ticket | staff_reassign | parent_notification | system_pause
  executorType: text("executor_type").notNull().default("autonomous_engine"), // autonomous_engine | staff_manual
  detailsJson: text("details_json"),
  status: text("status").notNull().default("success"), // success | failed | skipped
  executedAt: text("executed_at").notNull().default(sql`(current_timestamp)`),
});

export const remediationEscalationLogs = sqliteTable("remediation_escalation_logs", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull().references(() => remediationTickets.id, { onDelete: "cascade" }),
  recipientId: text("recipient_id").notNull(),
  recipientRole: text("recipient_role").notNull(), // parent | staff | principal | regional_admin
  channel: text("channel").notNull(), // push | sms | email | outbox
  messageBody: text("message_body").notNull(),
  deliveryStatus: text("delivery_status").notNull().default("sent"), // sent | failed | queued
  sentAt: text("sent_at").notNull().default(sql`(current_timestamp)`),
});

export const financialBudgetModels = sqliteTable("financial_budget_models", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  fiscalYear: text("fiscal_year").notNull(),
  targetBudgetAmount: real("target_budget_amount").notNull(),
  baselineVelocity: real("baseline_velocity").notNull().default(1.0),
  historicalCoefficientsJson: text("historical_coefficients_json"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const financialForecastRuns = sqliteTable("financial_forecast_runs", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  horizonDays: integer("horizon_days").notNull().default(90),
  forecastP10: real("forecast_p10").notNull(),
  forecastP50: real("forecast_p50").notNull(),
  forecastP90: real("forecast_p90").notNull(),
  realizationDeficitPercent: real("realization_deficit_percent").notNull(),
  riskLevel: text("risk_level").notNull().default("low_risk"), // low_risk | moderate_risk | critical_deficit
  generatedAt: text("generated_at").notNull().default(sql`(current_timestamp)`),
});

export const complianceFrameworks = sqliteTable("compliance_frameworks", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  authority: text("authority").notNull(),
  rulesJson: text("rules_json").notNull(),
  version: text("version").notNull().default("1.0"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const complianceAuditVault = sqliteTable("compliance_audit_vault", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  eventType: text("event_type").notNull(),
  previousHash: text("previous_hash").notNull(),
  recordHash: text("record_hash").notNull(),
  payloadJson: text("payload_json").notNull(),
  signature: text("signature").notNull(),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  timestamp: text("timestamp").notNull().default(sql`(current_timestamp)`),
});

export const complianceReportRuns = sqliteTable("compliance_report_runs", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
  frameworkCode: text("framework_code").notNull(),
  complianceScore: real("compliance_score").notNull(),
  vaultIntegrityStatus: text("vault_integrity_status").notNull().default("VALIDATED"),
  findingsJson: text("findings_json"),
  generatedBy: text("generated_by").notNull(),
  generatedAt: text("generated_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Sprint-011: AI Agent Swarms & Cross-Regional Copilots ───

export const aiAgents = sqliteTable("ai_agents", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  agentType: text("agent_type").notNull(), // academic_advisor | financial_controller | compliance_auditor
  domain: text("domain").notNull(), // academics | finance | compliance
  name: text("name").notNull(),
  capabilitiesJson: text("capabilities_json"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const aiAgentReasoningContexts = sqliteTable("ai_agent_reasoning_contexts", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  agentId: text("agent_id").notNull().references(() => aiAgents.id),
  inputPayloadJson: text("input_payload_json").notNull(),
  reasoningGraphJson: text("reasoning_graph_json"),
  confidenceScore: real("confidence_score").notNull(),
  createdById: text("created_by_id").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const aiCopilotRecommendations = sqliteTable("ai_copilot_recommendations", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  agentId: text("agent_id").notNull().references(() => aiAgents.id),
  title: text("title").notNull(),
  domain: text("domain").notNull(),
  summary: text("summary").notNull(),
  contextDataJson: text("context_data_json"),
  suggestedActionJson: text("suggested_action_json"),
  confidenceScore: real("confidence_score").notNull(),
  humanApprovalStatus: text("human_approval_status").notNull().default("REQUIRES_HUMAN_APPROVAL"), // REQUIRES_HUMAN_APPROVAL | AUTO_EXECUTE | APPROVED | REJECTED
  actionTakenAt: text("action_taken_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const aiAgentCommunications = sqliteTable("ai_agent_communications", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  correlationId: text("correlation_id").notNull(),
  senderAgentId: text("sender_agent_id").notNull().references(() => aiAgents.id),
  recipientAgentId: text("recipient_agent_id").notNull().references(() => aiAgents.id),
  messageType: text("message_type").notNull(),
  payloadJson: text("payload_json").notNull(),
  hopCount: integer("hop_count").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const redisCircuitBreakerStates = sqliteTable("redis_circuit_breaker_states", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  circuitKey: text("circuit_key").notNull().unique(),
  state: text("state").notNull().default("CLOSED"), // CLOSED | OPEN | HALF_OPEN
  failureCount: integer("failure_count").notNull().default(0),
  lastTrippedAt: text("last_tripped_at"),
  expiresAt: text("expires_at"),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const timeSeriesDecompositions = sqliteTable("time_series_decompositions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  metricName: text("metric_name").notNull(),
  granularity: text("granularity").notNull().default("monthly"), // monthly | quarterly | weekly
  observedJson: text("observed_json").notNull(),
  trendJson: text("trend_json").notNull(),
  seasonalJson: text("seasonal_json").notNull(),
  residualJson: text("residual_json").notNull(),
  anomaliesJson: text("anomalies_json"),
  decomposedAt: text("decomposed_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Sprint-012: Real-Time Event Streaming & Predictive Allocation ───

export const realtimeStreamSessions = sqliteTable("realtime_stream_sessions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  connectionType: text("connection_type").notNull().default("websocket"), // websocket | sse
  channelsJson: text("channels_json"),
  status: text("status").notNull().default("active"), // active | disconnected | closed
  lastPingAt: text("last_ping_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const automatedTriggerRules = sqliteTable("automated_trigger_rules", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  ruleName: text("rule_name").notNull(),
  eventType: text("event_type").notNull(), // absenteeism | fee_default | grade_drop | compliance_warning
  conditionsJson: text("conditions_json").notNull(),
  actionChannel: text("action_channel").notNull(), // sms | push | email | webhook
  recipientGroup: text("recipient_group").notNull(), // parents | staff | hods | principals
  priority: text("priority").notNull().default("normal"), // low | normal | high | urgent
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const notificationDispatchLogs = sqliteTable("notification_dispatch_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  ruleId: text("rule_id").references(() => automatedTriggerRules.id, { onDelete: "set null" }),
  channel: text("channel").notNull(), // sms | push
  recipientId: text("recipient_id").notNull(),
  payloadJson: text("payload_json").notNull(),
  dispatchStatus: text("dispatch_status").notNull().default("SENT"), // SENT | DELIVERED | FAILED | RATE_LIMITED
  errorMessage: text("error_message"),
  dispatchedAt: text("dispatched_at").notNull().default(sql`(current_timestamp)`),
});

export const studentRetentionPredictions = sqliteTable("student_retention_predictions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  atRiskScore: real("at_risk_score").notNull(),
  riskCategory: text("risk_category").notNull(), // LOW | MODERATE | HIGH
  contributingFactorsJson: text("contributing_factors_json"),
  recommendedInterventionJson: text("recommended_intervention_json"),
  predictedAt: text("predicted_at").notNull().default(sql`(current_timestamp)`),
});

export const enrollmentForecasts = sqliteTable("enrollment_forecasts", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  academicYearId: text("academic_year_id").references(() => academicYears.id, { onDelete: "set null" }),
  projectedEnrollment: integer("projected_enrollment").notNull(),
  utilizationPercentage: real("utilization_percentage").notNull(),
  forecastMetadataJson: text("forecast_metadata_json"),
  generatedAt: text("generated_at").notNull().default(sql`(current_timestamp)`),
});

export const budgetSimulationScenarios = sqliteTable("budget_simulation_scenarios", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  scenarioName: text("scenario_name").notNull(),
  createdById: text("created_by_id").notNull(),
  parametersJson: text("parameters_json").notNull(),
  impactProjectionsJson: text("impact_projections_json").notNull(),
  variancePercentage: real("variance_percentage").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Sprint-013: Federated Governance & Operational Resilience ───

export const federatedPolicies = sqliteTable("federated_policies", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull().default("general"),
  contentJson: text("content_json").notNull(),
  status: text("status").notNull().default("DRAFT"), // DRAFT | PROPAGATING | ACTIVE | CONFLICT | SUPERSEDED
  sha256Hash: text("sha256_hash").notNull(),
  version: integer("version").notNull().default(1),
  effectiveDate: text("effective_date"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const policyVersions = sqliteTable("policy_versions", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").notNull().references(() => federatedPolicies.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  sha256Hash: text("sha256_hash").notNull(),
  contentJson: text("content_json").notNull(),
  createdById: text("created_by_id").notNull(),
  changeLog: text("change_log"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const crossTenantRoleMappings = sqliteTable("cross_tenant_role_mappings", {
  id: text("id").primaryKey(),
  sourceTenantId: text("source_tenant_id").notNull(),
  targetTenantId: text("target_tenant_id").notNull(),
  sourceRole: text("source_role").notNull(),
  targetRole: text("target_role").notNull(),
  permissionsJson: text("permissions_json").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const federatedAuditLogs = sqliteTable("federated_audit_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  institutionId: text("institution_id").references(() => institutions.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  actorId: text("actor_id").notNull(),
  severity: text("severity").notNull().default("INFO"), // INFO | WARNING | CRITICAL | AUDIT
  detailsJson: text("details_json").notNull(),
  anonymized: integer("anonymized", { mode: "boolean" }).notNull().default(false),
  loggedAt: text("logged_at").notNull().default(sql`(current_timestamp)`),
});

export const databaseIndexMetrics = sqliteTable("database_index_metrics", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  querySignature: text("query_signature").notNull(),
  tableTarget: text("table_target").notNull(),
  avgExecutionMs: real("avg_execution_ms").notNull(),
  executionCount: integer("execution_count").notNull().default(1),
  recommendedIndexSql: text("recommended_index_sql").notNull(),
  estimatedSpeedupRatio: real("estimated_speedup_ratio").notNull().default(1.0),
  status: text("status").notNull().default("PENDING"), // PENDING | APPLIED | REJECTED
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const circuitBreakerStates = sqliteTable("circuit_breaker_states", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  serviceName: text("service_name").notNull(),
  state: text("state").notNull().default("CLOSED"), // CLOSED | OPEN | HALF_OPEN
  failureRate: real("failure_rate").notNull().default(0.0),
  medianLatencyMs: real("median_latency_ms").notNull().default(0.0),
  trippedAt: text("tripped_at"),
  cooldownUntil: text("cooldown_until"),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const dlqRetryQueue = sqliteTable("dlq_retry_queue", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  jobType: text("job_type").notNull(),
  payloadJson: text("payload_json").notNull(),
  errorMessage: text("error_message"),
  stackTrace: text("stack_trace"),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  nextRetryAt: text("next_retry_at"),
  status: text("status").notNull().default("PENDING"), // PENDING | SUCCESS | FAILED | QUARANTINED
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const offlineSyncOutbox = sqliteTable("offline_sync_outbox", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  deviceId: text("device_id").notNull(),
  mutationType: text("mutation_type").notNull(), // CREATE | UPDATE | DELETE
  entityType: text("entity_type").notNull(),
  payloadJson: text("payload_json").notNull(),
  clientTimestamp: text("client_timestamp").notNull(),
  syncStatus: text("sync_status").notNull().default("PENDING"), // PENDING | SYNCED | CONFLICT | NEEDS_REVIEW
  conflictDetailsJson: text("conflict_details_json"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const voiceQueryLogs = sqliteTable("voice_query_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  transcript: text("transcript").notNull(),
  confidenceScore: real("confidence_score").notNull().default(1.0),
  parsedIntent: text("parsed_intent").notNull(),
  entityParamsJson: text("entity_params_json"),
  executionDurationMs: real("execution_duration_ms").notNull().default(0.0),
  audioFormat: text("audio_format").notNull().default("pcm"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const pushNotificationTokens = sqliteTable("push_notification_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull().default("android"), // android | ios | web
  deviceModel: text("device_model"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const backgroundSyncLogs = sqliteTable("background_sync_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  deviceId: text("device_id").notNull(),
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordsFailed: integer("records_failed").notNull().default(0),
  executionDurationMs: real("execution_duration_ms").notNull().default(0.0),
  batteryLevel: real("battery_level"),
  networkType: text("network_type"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Sprint-016: Enterprise Multi-Tenant Scale & Lakehouse ───

export const dataLakehouseJobs = sqliteTable("data_lakehouse_jobs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  domain: text("domain").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING | IN_PROGRESS | COMPLETED | FAILED
  recordCount: integer("record_count").notNull().default(0),
  fileSizeBytes: integer("file_size_bytes").notNull().default(0),
  partitionPath: text("partition_path"),
  executionDurationMs: real("execution_duration_ms").default(0.0),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  completedAt: text("completed_at"),
});

export const dataLakehousePartitions = sqliteTable("data_lakehouse_partitions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  domain: text("domain").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  partitionPath: text("partition_path").notNull().unique(),
  recordCount: integer("record_count").notNull().default(0),
  fileSizeBytes: integer("file_size_bytes").notNull().default(0),
  lastWatermark: text("last_watermark").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const samlProviders = sqliteTable("saml_providers", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  idpEntityId: text("idp_entity_id").notNull(),
  ssoUrl: text("sso_url").notNull(),
  x509Certificate: text("x509_certificate").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const oidcProviders = sqliteTable("oidc_providers", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  issuerUrl: text("issuer_url").notNull(),
  discoveryUrl: text("discovery_url").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const federatedIdentityMappings = sqliteTable("federated_identity_mappings", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  providerType: text("provider_type").notNull(), // SAML | OIDC
  externalSubjectId: text("external_subject_id").notNull(),
  mappedRole: text("mapped_role").notNull().default("staff"),
  attributesJson: text("attributes_json"),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const indexTuningRecommendations = sqliteTable("index_tuning_recommendations", {
  id: text("id").primaryKey(),
  tableName: text("table_name").notNull(),
  recommendedIndexName: text("recommended_index_name").notNull(),
  indexDdl: text("index_ddl").notNull(),
  seqScans: integer("seq_scans").notNull().default(0),
  estTimeSavingsMs: real("est_time_savings_ms").notNull().default(0.0),
  riskLevel: text("risk_level").notNull().default("LOW"), // LOW | MEDIUM | HIGH
  status: text("status").notNull().default("RECOMMENDED"), // RECOMMENDED | APPLIED | REJECTED | ROLLED_BACK
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const indexTuningLogs = sqliteTable("index_tuning_logs", {
  id: text("id").primaryKey(),
  recommendationId: text("recommendation_id").notNull(),
  action: text("action").notNull(), // CREATE_CONCURRENTLY | DROP_CONCURRENTLY
  indexName: text("index_name").notNull(),
  executionDurationMs: real("execution_duration_ms").notNull().default(0.0),
  status: text("status").notNull(), // SUCCESS | FAILED
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const mdmProfiles = sqliteTable("mdm_profiles", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  platform: text("platform").notNull(), // INTUNE | APPLE
  profileName: text("profile_name").notNull(),
  configPayloadXml: text("config_payload_xml").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const mdmEnrolledDevices = sqliteTable("mdm_enrolled_devices", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  deviceUuid: text("device_uuid").notNull().unique(),
  deviceModel: text("device_model"),
  osVersion: text("os_version"),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | REVOKED
  enrolledAt: text("enrolled_at").notNull().default(sql`(current_timestamp)`),
  lastSyncAt: text("last_sync_at"),
});

// ─── Multi-Region Data Mesh ───

export const meshNodes = sqliteTable("mesh_nodes", {
  id: text("id").primaryKey(),
  regionId: text("region_id").notNull().unique(),
  nodeName: text("node_name").notNull(),
  endpoint: text("endpoint").notNull(),
  status: text("status").notNull().default("ONLINE"), // ONLINE | DEGRADED | OFFLINE
  latencyMs: integer("latency_ms").notNull().default(0),
  lastHeartbeat: text("last_heartbeat").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const replicationLogs = sqliteTable("replication_logs", {
  id: text("id").primaryKey(),
  sourceRegion: text("source_region").notNull(),
  targetRegion: text("target_region").notNull(),
  mutationsCount: integer("mutations_count").notNull().default(0),
  status: text("status").notNull(), // PENDING | ACKNOWLEDGED | FAILED
  batchChecksum: text("batch_checksum").notNull(),
  errorMessage: text("error_message"),
  executedAt: text("executed_at").notNull().default(sql`(current_timestamp)`),
});

export const conflictEvents = sqliteTable("conflict_events", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  tenantId: text("tenant_id").notNull(),
  localRegion: text("local_region").notNull(),
  remoteRegion: text("remote_region").notNull(),
  winnerRegion: text("winner_region").notNull(),
  conflictingFieldsJson: text("conflicting_fields_json"),
  resolvedAt: text("resolved_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Predictive Student Learning Analytics ───

export const predictiveModels = sqliteTable("predictive_models", {
  id: text("id").primaryKey(),
  modelName: text("model_name").notNull().unique(),
  version: text("version").notNull(),
  precisionScore: real("precision_score").notNull().default(0.0),
  recallScore: real("recall_score").notNull().default(0.0),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | DEPRECATED
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const studentRiskScores = sqliteTable("student_risk_scores", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  studentId: text("student_id").notNull(),
  riskScore: integer("risk_score").notNull(),
  riskLevel: text("risk_level").notNull(), // LOW | MEDIUM | HIGH
  confidenceScore: real("confidence_score").notNull().default(0.0),
  primaryDriversJson: text("primary_drivers_json"),
  assessedAt: text("assessed_at").notNull().default(sql`(current_timestamp)`),
});

export const learningPathRecommendations = sqliteTable("learning_path_recommendations", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  studentId: text("student_id").notNull(),
  pathTitle: text("path_title").notNull(),
  priority: text("priority").notNull(), // HIGH | MEDIUM | LOW
  suggestedActionItemsJson: text("suggested_action_items_json"),
  targetCompletionDays: integer("target_completion_days").notNull().default(30),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Low-Latency WebRTC & HLS Hybrid Distance Learning ───

export const streamingRooms = sqliteTable("streaming_rooms", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  roomName: text("room_name").notNull(),
  hostUserId: text("host_user_id").notNull(),
  maxParticipants: integer("max_participants").notNull().default(250),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | ENDED
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const streamingSessions = sqliteTable("streaming_sessions", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  participantUserId: text("participant_user_id").notNull(),
  role: text("role").notNull().default("ATTENDEE"), // HOST | PRESENTER | ATTENDEE
  audioMuted: integer("audio_muted", { mode: "boolean" }).notNull().default(true),
  videoMuted: integer("video_muted", { mode: "boolean" }).notNull().default(false),
  joinedAt: text("joined_at").notNull().default(sql`(current_timestamp)`),
  leftAt: text("left_at"),
});

export const streamRecordings = sqliteTable("stream_recordings", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  roomId: text("room_id").notNull(),
  streamId: text("stream_id").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  fileSizeBytes: integer("file_size_bytes").notNull().default(0),
  recordingUrl: text("recording_url").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── PostgreSQL Multi-Node Cluster Certification ───

export const clusterNodes = sqliteTable("cluster_nodes", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull().unique(),
  role: text("role").notNull(), // PRIMARY | STANDBY | READ_REPLICA
  endpoint: text("endpoint").notNull(),
  isHealthy: integer("is_healthy", { mode: "boolean" }).notNull().default(true),
  replicationLagMs: integer("replication_lag_ms").notNull().default(0),
  lastCheckedAt: text("last_checked_at").notNull().default(sql`(current_timestamp)`),
});

export const failoverEvents = sqliteTable("failover_events", {
  id: text("id").primaryKey(),
  failedPrimaryId: text("failed_primary_id").notNull(),
  promotedNodeId: text("promoted_node_id").notNull(),
  recoveryDurationMs: integer("recovery_duration_ms").notNull().default(0),
  status: text("status").notNull(), // SUCCESS | FAILED
  reason: text("reason"),
  executedAt: text("executed_at").notNull().default(sql`(current_timestamp)`),
});

export const migrationJobs = sqliteTable("migration_jobs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  migrationName: text("migration_name").notNull(),
  status: text("status").notNull(), // PENDING | DUAL_WRITING | VALIDATED | COMPLETED | ROLLED_BACK
  errorMessage: text("error_message"),
  startedAt: text("started_at").notNull().default(sql`(current_timestamp)`),
  completedAt: text("completed_at"),
});

// ─── Sprint-018: Edge Caching & Federated API Mesh ───

export const edgeNodes = sqliteTable("edge_nodes", {
  id: text("id").primaryKey(),
  nodeRegion: text("node_region").notNull().unique(),
  nodeName: text("node_name").notNull(),
  endpoint: text("endpoint").notNull(),
  status: text("status").notNull().default("ONLINE"),
  latencyMs: integer("latency_ms").notNull().default(0),
  lastHeartbeat: text("last_heartbeat").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const cacheEvents = sqliteTable("cache_events", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  cacheKey: text("cache_key").notNull(),
  action: text("action").notNull(), // EVICT | WARM | CREATE
  status: text("status").notNull(), // PENDING | SUCCESS | FAILED
  errorMessage: text("error_message"),
  executedAt: text("executed_at").notNull().default(sql`(current_timestamp)`),
});

export const apiUsageMetrics = sqliteTable("api_usage_metrics", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  region: text("region").notNull(),
  endpointPath: text("endpoint_path").notNull(),
  requestCount: integer("request_count").notNull().default(0),
  totalLatencyMs: integer("total_latency_ms").notNull().default(0),
  cacheHitCount: integer("cache_hit_count").notNull().default(0),
  timestamp: text("timestamp").notNull().default(sql`(current_timestamp)`),
});

export const federatedServices = sqliteTable("federated_services", {
  id: text("id").primaryKey(),
  serviceName: text("service_name").notNull().unique(),
  endpoint: text("endpoint").notNull(),
  schemaDefinition: text("schema_definition").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  lastReloadedAt: text("last_reloaded_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ─── Sprint-019: Intelligent Agent Orchestration & Self-Healing Core ───

export const agentRegistry = sqliteTable("agent_registry", {
  id: text("id").primaryKey(),
  role: text("role").notNull(),
  version: text("version").notNull(),
  status: text("status").notNull().default("idle"), // idle | active | remediating | unhealthy
  lastHeartbeat: text("last_heartbeat").notNull(), // ISO String
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const agentLogs = sqliteTable("agent_logs", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  logLevel: text("log_level").notNull(), // info | warn | error | debug
  message: text("message").notNull(),
  timestamp: text("timestamp").notNull(), // ISO String
});

export const agentDecisions = sqliteTable("agent_decisions", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  targetAsset: text("target_asset").notNull(),
  severity: text("severity").notNull(), // critical | high | medium | low
  decision: text("decision").notNull(),
  actionStatus: text("action_status").notNull(), // pending | approved | rejected | success | failed
  rollbackState: text("rollback_state"), // JSON string
  createdAt: text("created_at").notNull(), // ISO String
});

export const identity_sessions = sqliteTable("identity_sessions", {
  id: text("id").primaryKey(),
  staff_id: text("staff_id").notNull(),
  dpop_thumbprint: text("dpop_thumbprint"),
  dpop_migrated: integer("dpop_migrated", { mode: "boolean" }).notNull().default(false),
  created_at: text("created_at").notNull().default(sql`(current_timestamp)`),
  expires_at: text("expires_at").notNull()
});

export const device_fingerprints = sqliteTable("device_fingerprints", {
  id: text("id").primaryKey(),
  staff_id: text("staff_id").notNull(),
  institution_id: text("institution_id"),
  composite_hash: text("composite_hash").notNull(),
  attributes: text("attributes").notNull(), // JSON
  trust_score: integer("trust_score").notNull(),
  created_at: text("created_at").notNull().default(sql`(current_timestamp)`),
  last_seen: text("last_seen").notNull().default(sql`(current_timestamp)`)
});







export const swarmNegotiations = sqliteTable('swarm_negotiations', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  agentId: text('agent_id').notNull(),
  institutionId: text('institution_id'),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
});
export const negotiationBids = sqliteTable('negotiation_bids', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  agentId: text('agent_id').notNull(),
  bidAmount: real('bid_amount').notNull(),
  createdAt: text('created_at').notNull(),
});
export const negotiationOutcomes = sqliteTable('negotiation_outcomes', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  winnerId: text('winner_id').notNull(),
  finalPrice: real('final_price').notNull(),
  createdAt: text('created_at').notNull(),
});
export const swarmTopology = sqliteTable('swarm_topology', {
  id: text('id').primaryKey(),
  nodeId: text('node_id').notNull(),
  tier: text('tier').notNull(),
  status: text('status').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
});
export const complianceReports = sqliteTable('compliance_reports', {
  id: text('id').primaryKey(),
  institutionId: text('institution_id').notNull(),
  framework: text('framework').notNull(),
  status: text('status').notNull(),
  findings: text('findings', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});

export const swarmEvents = sqliteTable('swarm_events', {
  id: text('id').primaryKey(),
  eventSource: text('event_source').notNull(),
  severity: text('severity').notNull(),
  message: text('message').notNull(),
  timestamp: text('timestamp').notNull(),
}, (t) => ({
  timestampIdx: index('idx_swarm_events_timestamp').on(t.timestamp),
}));

export const swarmMetrics = sqliteTable('swarm_metrics', {
  id: text('id').primaryKey(),
  nodeId: text('node_id').notNull(),
  metricName: text('metric_name').notNull(),
  metricValue: real('metric_value').notNull(),
  timestamp: text('timestamp').notNull(),
}, (t) => ({
  nodeMetricIdx: index('idx_swarm_metrics_node_metric').on(t.nodeId, t.metricName),
  timestampIdx: index('idx_swarm_metrics_timestamp').on(t.timestamp),
}));

export const remediationHistory = sqliteTable('remediation_history', {
  id: text('id').primaryKey(),
  complianceFindingId: text('compliance_finding_id').notNull(),
  actionTriggered: text('action_triggered').notNull(),
  approvalKey: text('approval_key'),
  approvalStatus: text('approval_status').notNull(),
  outcome: text('outcome').notNull(),
  rollbackStatus: text('rollback_status').notNull(),
  createdAt: text('created_at').notNull(),
  institutionId: text('institution_id').notNull(),
}, (t) => ({
  instIdx: index('idx_remediation_history_inst').on(t.institutionId),
}));

export const syncTuningPolicies = sqliteTable('sync_tuning_policies', {
  id: text('id').primaryKey(),
  networkType: text('network_type').notNull().unique(), // WIFI | CELLULAR | DEFAULT
  minBandwidthKbps: integer('min_bandwidth_kbps').notNull().default(0),
  maxLatencyMs: integer('max_latency_ms').notNull().default(0),
  batchSize: integer('batch_size').notNull().default(50),
  compressionLevel: integer('compression_level').notNull().default(1),
  retryBackoffMs: integer('retry_backoff_ms').notNull().default(5000),
  updatedAt: text('updated_at').notNull(),
});

export const workspacePreferences = sqliteTable("workspace_preferences", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  staffId: text("staff_id").references(() => staff.id, { onDelete: "cascade" }),
  guardianId: text("guardian_id").references(() => guardians.id, { onDelete: "cascade" }),
  workspaceType: text("workspace_type").notNull(), // 'principal' | 'teacher' | 'cashier' | 'parent'
  layoutConfig: text("layout_config").notNull(), // JSON string representing widget settings
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  staffIdIdx: index("idx_workspace_prefs_staff_id").on(t.staffId),
  guardianIdIdx: index("idx_workspace_prefs_guardian_id").on(t.guardianId),
  instIdIdx: index("idx_workspace_prefs_inst_id").on(t.institutionId),
  staffWorkspaceUniqIdx: uniqueIndex("idx_workspace_prefs_staff_ws_uniq").on(t.staffId, t.workspaceType),
  guardianWorkspaceUniqIdx: uniqueIndex("idx_workspace_prefs_guard_ws_uniq").on(t.guardianId, t.workspaceType),
}));

export const workspaceAnalyticsCache = sqliteTable("workspace_analytics_cache", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  role: text("role").notNull(),
  metricName: text("metric_name").notNull(),
  metricValue: text("metric_value").notNull(), // JSON text
  calculatedAt: text("calculated_at").notNull(),
  timeBucket: text("time_bucket"),
}, (t) => ({
  instCalcIdx: index("idx_ws_analytics_inst_calc").on(t.institutionId, t.calculatedAt),
  uniqMetricIdx: uniqueIndex("idx_ws_analytics_uniq_metric").on(t.institutionId, t.role, t.metricName, t.timeBucket),
}));

export const reportSchedules = sqliteTable("report_schedules", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  frequency: text("frequency").notNull(), // 'daily' | 'weekly' | 'monthly'
  format: text("format").notNull(), // 'pdf' | 'excel'
  recipients: text("recipients").notNull(), // JSON array string
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  instIdx: index("idx_report_schedules_inst").on(t.institutionId),
}));

export const reportHistory = sqliteTable("report_history", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id").references(() => reportSchedules.id, { onDelete: "set null" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  filePath: text("file_path").notNull(),
  format: text("format").notNull(),
  status: text("status").notNull(), // 'success' | 'failed'
  generatedAt: text("generated_at").notNull().default(sql`(current_timestamp)`),
  sizeBytes: integer("size_bytes").notNull().default(0),
}, (t) => ({
  instIdx: index("idx_report_history_inst").on(t.institutionId),
}));

export const scheduledJobs = sqliteTable("scheduled_jobs", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  format: text("format").notNull(),
  options: text("options").notNull(),
  status: text("status").notNull().default("queued"),
  error: text("error"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  instIdx: index("idx_scheduled_jobs_inst").on(t.institutionId),
  statusIdx: index("idx_scheduled_jobs_status").on(t.status),
  createdAtIdx: index("idx_scheduled_jobs_created_at").on(t.createdAt),
}));

export const jobExecutions = sqliteTable("job_executions", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => scheduledJobs.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  retryCount: integer("retry_count").notNull().default(0),
  startedAt: text("started_at").notNull().default(sql`(current_timestamp)`),
  completedAt: text("completed_at"),
  errorMessage: text("error_message"),
}, (t) => ({
  jobIdx: index("idx_job_executions_job").on(t.jobId),
}));

export const preferenceAuditLog = sqliteTable("preference_audit_log", {
  id: text("id").primaryKey(),
  timestamp: text("timestamp").notNull().default(sql`(current_timestamp)`),
  userId: text("user_id").notNull(),
  preferenceKey: text("preference_key").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value").notNull(),
  ipAddress: text("ip_address"),
  institutionId: text("institution_id").references(() => institutions.id, { onDelete: "set null" }),
}, (t) => ({
  userPrefTimestampIdx: index("idx_pref_audit_user_pref_ts").on(t.userId, t.preferenceKey, t.timestamp),
  institutionIdx: index("idx_pref_audit_inst_id").on(t.institutionId),
  timestampIdx: index("idx_pref_audit_timestamp").on(t.timestamp),
}));

// ─── Compliance & Cryptographic Audit Tables ───

export const auditMerkleRoots = sqliteTable("audit_merkle_roots", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  rootHash: text("root_hash").notNull(),
  startAuditId: text("start_audit_id"),
  endAuditId: text("end_audit_id"),
  leafCount: integer("leaf_count").notNull().default(0),
  treeDepth: integer("tree_depth").notNull().default(0),
  signature: text("signature"),
  metadata: text("metadata"), // JSON string
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  tenantIdx: index("idx_audit_merkle_roots_tenant").on(t.tenantId),
  rootHashIdx: index("idx_audit_merkle_roots_hash").on(t.rootHash),
  createdAtIdx: index("idx_audit_merkle_roots_created_at").on(t.createdAt),
}));

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  userId: text("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  payload: text("payload"), // JSON payload or diff
  previousHash: text("previous_hash"),
  currentHash: text("current_hash").notNull(),
  merkleRootId: text("merkle_root_id").references(() => auditMerkleRoots.id, { onDelete: "set null" }),
  merkleProof: text("merkle_proof"), // JSON array of proof hashes
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: text("timestamp").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  tenantIdx: index("idx_audit_logs_tenant").on(t.tenantId),
  actionIdx: index("idx_audit_logs_action").on(t.action),
  entityIdx: index("idx_audit_logs_entity").on(t.entityType, t.entityId),
  currentHashIdx: index("idx_audit_logs_hash").on(t.currentHash),
  merkleRootIdx: index("idx_audit_logs_merkle_root").on(t.merkleRootId),
  timestampIdx: index("idx_audit_logs_timestamp").on(t.timestamp),
}));

export const complianceViolations = sqliteTable("compliance_violations", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  ruleId: text("rule_id").notNull(),
  severity: text("severity").notNull().default("MEDIUM"), // LOW, MEDIUM, HIGH, CRITICAL
  actorId: text("actor_id"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: text("details"), // JSON string
  status: text("status").notNull().default("OPEN"), // OPEN, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE
  resolutionNotes: text("resolution_notes"),
  resolvedBy: text("resolved_by"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  tenantIdx: index("idx_compliance_violations_tenant").on(t.tenantId),
  ruleIdx: index("idx_compliance_violations_rule").on(t.ruleId),
  severityIdx: index("idx_compliance_violations_severity").on(t.severity),
  statusIdx: index("idx_compliance_violations_status").on(t.status),
  createdAtIdx: index("idx_compliance_violations_created_at").on(t.createdAt),
}));

export const forensicSnapshots = sqliteTable("forensic_snapshots", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  snapshotType: text("snapshot_type").notNull().default("SCHEDULED"), // SCHEDULED, MANUAL, PRE_INCIDENT, AUDIT
  storageUri: text("storage_uri").notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  signature: text("signature"),
  signerPublicKey: text("signer_public_key"),
  entityCounts: text("entity_counts"), // JSON string
  metadata: text("metadata"), // JSON string
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, ARCHIVED, RESTORED, CORRUPTED
  retentionTier: text("retention_tier").notNull().default("HOT"), // HOT, WARM, COLD
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  tenantIdx: index("idx_forensic_snapshots_tenant").on(t.tenantId),
  statusIdx: index("idx_forensic_snapshots_status").on(t.status),
  retentionTierIdx: index("idx_forensic_snapshots_tier").on(t.retentionTier),
  createdAtIdx: index("idx_forensic_snapshots_created_at").on(t.createdAt),
}));

// ─── API Gateway Security & IP Quarantine Tables (Sprint-038) ───

export const ipQuarantines = sqliteTable("ip_quarantines", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  ipAddress: text("ip_address").notNull(),
  cidrMask: text("cidr_mask").default("/32"),
  isSubnet: integer("is_subnet", { mode: "boolean" }).notNull().default(false),
  reason: text("reason").notNull(),
  threatScore: integer("threat_score").notNull().default(100),
  bannedBy: text("banned_by").notNull().default("system"),
  expiresAt: text("expires_at").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  tenantIdx: index("idx_ip_quarantines_tenant").on(t.tenantId),
  ipIdx: index("idx_ip_quarantines_ip").on(t.ipAddress),
  expiresIdx: index("idx_ip_quarantines_expires").on(t.expiresAt),
  isActiveIdx: index("idx_ip_quarantines_active").on(t.isActive),
}));

export const ipAllowlist = sqliteTable("ip_allowlist", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  ipAddress: text("ip_address").notNull(),
  description: text("description"),
  addedBy: text("added_by").notNull().default("admin"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  tenantIdx: index("idx_ip_allowlist_tenant").on(t.tenantId),
  ipIdx: index("idx_ip_allowlist_ip").on(t.ipAddress),
}));

// ─── SOAR Security Orchestration Tables (Sprint-040) ───

export const soarPlaybooks = sqliteTable("soar_playbooks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull().default("1.0.0"),
  description: text("description"),
  category: text("category").notNull().default("NETWORK"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  autoExecute: integer("auto_execute", { mode: "boolean" }).notNull().default(true),
  minConfidence: integer("min_confidence").notNull().default(80),
  highImpact: integer("high_impact", { mode: "boolean" }).notNull().default(false),
  definition: text("definition").notNull(), // JSON
  rollbackStrategy: text("rollback_strategy").default("COMPENSATE"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  nameIdx: index("idx_soar_playbooks_name").on(t.name),
  categoryIdx: index("idx_soar_playbooks_category").on(t.category),
  enabledIdx: index("idx_soar_playbooks_enabled").on(t.enabled),
}));

export const soarExecutions = sqliteTable("soar_executions", {
  id: text("id").primaryKey(),
  playbookId: text("playbook_id").notNull(),
  playbookName: text("playbook_name").notNull(),
  targetType: text("target_type").notNull(),
  targetValue: text("target_value").notNull(),
  state: text("state").notNull().default("RUNNING"),
  triggerPayload: text("trigger_payload"), // JSON
  tenantId: text("tenant_id").default("default"),
  actorId: text("actor_id"),
  approvalId: text("approval_id"),
  error: text("error"),
  compensationStatus: text("compensation_status").default("NONE"),
  startedAt: text("started_at").notNull().default(sql`(current_timestamp)`),
  completedAt: text("completed_at"),
}, (t) => ({
  playbookIdx: index("idx_soar_executions_playbook").on(t.playbookId),
  stateIdx: index("idx_soar_executions_state").on(t.state),
  targetIdx: index("idx_soar_executions_target").on(t.targetType, t.targetValue),
  startedAtIdx: index("idx_soar_executions_started_at").on(t.startedAt),
}));

export const soarExecutionSteps = sqliteTable("soar_execution_steps", {
  id: text("id").primaryKey(),
  executionId: text("execution_id").notNull(),
  stepId: text("step_id").notNull(),
  name: text("name").notNull(),
  action: text("action").notNull(),
  state: text("state").notNull().default("RUNNING"),
  inputParams: text("input_params"), // JSON
  output: text("output"), // JSON
  error: text("error"),
  compensated: integer("compensated", { mode: "boolean" }).notNull().default(false),
  startedAt: text("started_at").notNull().default(sql`(current_timestamp)`),
  completedAt: text("completed_at"),
}, (t) => ({
  executionIdx: index("idx_soar_steps_execution").on(t.executionId),
  stepIdx: index("idx_soar_steps_step").on(t.stepId),
  stateIdx: index("idx_soar_steps_state").on(t.state),
}));

export const soarApprovals = sqliteTable("soar_approvals", {
  id: text("id").primaryKey(),
  executionId: text("execution_id").notNull(),
  playbookId: text("playbook_id").notNull(),
  playbookName: text("playbook_name").notNull(),
  targetType: text("target_type").notNull(),
  targetValue: text("target_value").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  triggerPayload: text("trigger_payload"), // JSON
  status: text("status").notNull().default("PENDING"),
  reason: text("reason"),
  resolvedBy: text("resolved_by"),
  requestedAt: text("requested_at").notNull().default(sql`(current_timestamp)`),
  expiresAt: text("expires_at").notNull(),
  resolvedAt: text("resolved_at"),
}, (t) => ({
  statusIdx: index("idx_soar_approvals_status").on(t.status),
  executionIdx: index("idx_soar_approvals_execution").on(t.executionId),
  expiresIdx: index("idx_soar_approvals_expires").on(t.expiresAt),
}));

// ─── Zero-Trust Autonomous Security Mesh & Dynamic Micro-Segmentation (Sprint-041 ZASM) ───

export const zasmDeviceTrust = sqliteTable("zasm_device_trust", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  tenantId: text("tenant_id").notNull().default("global"),
  score: integer("score").notNull(),
  tier: text("tier").notNull(),
  factorBreakdown: text("factor_breakdown"), // JSON
  penalties: text("penalties"), // JSON
  isOverridden: integer("is_overridden", { mode: "boolean" }).notNull().default(false),
  overrideReason: text("override_reason"),
  evaluatedAt: text("evaluated_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  deviceIdx: index("idx_zasm_device_trust_device").on(t.deviceId),
  tierIdx: index("idx_zasm_device_trust_tier").on(t.tier),
  tenantIdx: index("idx_zasm_device_trust_tenant").on(t.tenantId),
}));

export const zasmSegmentationPolicies = sqliteTable("zasm_segmentation_policies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  priority: integer("priority").notNull().default(100),
  action: text("action").notNull().default("ALLOW"),
  targetTrustTiers: text("target_trust_tiers").notNull(), // JSON array
  sourceSubnets: text("source_subnets"), // JSON
  destServices: text("dest_services"), // JSON
  protocols: text("protocols"), // JSON
  destPorts: text("dest_ports"), // JSON
  vlanTag: integer("vlan_tag"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  tenantId: text("tenant_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  priorityIdx: index("idx_zasm_policies_priority").on(t.priority),
  actionIdx: index("idx_zasm_policies_action").on(t.action),
  enabledIdx: index("idx_zasm_policies_enabled").on(t.enabled),
}));

export const zasmCertificates = sqliteTable("zasm_certificates", {
  id: text("id").primaryKey(),
  serialNumber: text("serial_number").notNull().unique(),
  serviceName: text("service_name").notNull(),
  type: text("type").notNull(),
  certificatePem: text("certificate_pem").notNull(),
  publicKeyPem: text("public_key_pem").notNull(),
  fingerprintSha256: text("fingerprint_sha256").notNull(),
  sanList: text("san_list"), // JSON
  validFrom: text("valid_from").notNull(),
  validTo: text("valid_to").notNull(),
  isRevoked: integer("is_revoked", { mode: "boolean" }).notNull().default(false),
  revocationReason: text("revocation_reason"),
  revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  serialIdx: index("idx_zasm_certs_serial").on(t.serialNumber),
  serviceIdx: index("idx_zasm_certs_service").on(t.serviceName),
  validToIdx: index("idx_zasm_certs_valid_to").on(t.validTo),
}));

export const zasmSbomPackages = sqliteTable("zasm_sbom_packages", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  purl: text("purl").notNull(),
  license: text("license"),
  sha256: text("sha256"),
  isDirect: integer("is_direct", { mode: "boolean" }).notNull().default(true),
  dependencies: text("dependencies"), // JSON
  lastScannedAt: text("last_scanned_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  nameIdx: index("idx_zasm_sbom_pkg_name").on(t.name),
  purlIdx: index("idx_zasm_sbom_pkg_purl").on(t.purl),
}));

export const zasmSbomVulnerabilities = sqliteTable("zasm_sbom_vulnerabilities", {
  id: text("id").primaryKey(),
  cveId: text("cve_id").notNull(),
  packageName: text("package_name").notNull(),
  affectedVersions: text("affected_versions").notNull(),
  patchedVersion: text("patched_version"),
  severity: text("severity").notNull(),
  cvssScore: real("cvss_score"),
  summary: text("summary"),
  publishedAt: text("published_at"),
  advisoryUrl: text("advisory_url"),
  status: text("status").notNull().default("OPEN"),
  detectedAt: text("detected_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  cveIdx: index("idx_zasm_vuln_cve").on(t.cveId),
  pkgIdx: index("idx_zasm_vuln_pkg").on(t.packageName),
  severityIdx: index("idx_zasm_vuln_severity").on(t.severity),
}));

export const zasmForensicReports = sqliteTable("zasm_forensic_reports", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  primaryActor: text("primary_actor").notNull(),
  executiveSummary: text("executive_summary").notNull(),
  technicalDetails: text("technical_details"),
  timeline: text("timeline"), // JSON
  rootCauseGraph: text("root_cause_graph"), // JSON
  durationMs: integer("duration_ms").notNull().default(0),
  generatedAt: text("generated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  actorIdx: index("idx_zasm_forensic_actor").on(t.primaryActor),
  incidentIdx: index("idx_zasm_forensic_incident").on(t.incidentId),
}));

// ─── Autonomous Resilience & Predictive Security Engine (Sprint-042 ARES) ───

export const aresPredictiveThreats = sqliteTable("ares_predictive_threats", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  posteriorProbability: real("posterior_probability").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  severityTier: text("severity_tier").notNull(),
  projectedExploitWindowDays: integer("projected_exploit_window_days").notNull().default(14),
  keyIndicators: text("key_indicators"), // JSON
  affectedAssetIds: text("affected_asset_ids"), // JSON
  recommendedMitigations: text("recommended_mitigations"), // JSON
  tenantId: text("tenant_id").notNull().default("global"),
  calculatedAt: text("calculated_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  categoryIdx: index("idx_ares_threats_category").on(t.category),
  tierIdx: index("idx_ares_threats_tier").on(t.severityTier),
  tenantIdx: index("idx_ares_threats_tenant").on(t.tenantId),
}));

export const aresChaosExperiments = sqliteTable("ares_chaos_experiments", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  faultType: text("fault_type").notNull(),
  targetType: text("target_type").notNull(),
  targetIdentifier: text("target_identifier").notNull(),
  blastRadiusPercentage: integer("blast_radius_percentage").notNull().default(10),
  durationSeconds: integer("duration_seconds").notNull().default(10),
  parameters: text("parameters"), // JSON
  maxErrorRatePercent: real("max_error_rate_percent").notNull().default(1.0),
  maxP99LatencyMs: integer("max_p99_latency_ms").notNull().default(1000),
  tenantId: text("tenant_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  scenarioIdx: index("idx_ares_chaos_scenario").on(t.scenarioId),
  faultIdx: index("idx_ares_chaos_fault").on(t.faultType),
}));

export const aresChaosExecutions = sqliteTable("ares_chaos_executions", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  state: text("state").notNull().default("COMPLETED"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  baselineMetrics: text("baseline_metrics"), // JSON
  observedMetrics: text("observed_metrics"), // JSON
  recoveryTimeMs: integer("recovery_time_ms").notNull().default(0),
  resilienceScoreDeduction: integer("resilience_score_deduction").notNull().default(0),
  abortReason: text("abort_reason"),
  logs: text("logs"), // JSON
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  execScenarioIdx: index("idx_ares_chaos_exec_scenario").on(t.scenarioId),
  stateIdx: index("idx_ares_chaos_exec_state").on(t.state),
}));

export const aresZkpProofs = sqliteTable("ares_zkp_proofs", {
  id: text("id").primaryKey(),
  proofId: text("proof_id").notNull().unique(),
  merkleRoot: text("merkle_root").notNull(),
  epochTimestamp: text("epoch_timestamp").notNull(),
  leafHashCommitment: text("leaf_hash_commitment").notNull(),
  proofData: text("proof_data").notNull(), // JSON
  publicInputs: text("public_inputs").notNull(), // JSON
  tenantId: text("tenant_id").notNull().default("global"),
  generatedAt: text("generated_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  proofIdx: index("idx_ares_zkp_proof_id").on(t.proofId),
  rootIdx: index("idx_ares_zkp_merkle_root").on(t.merkleRoot),
}));

export const aresThreatGraphNodes = sqliteTable("ares_threat_graph_nodes", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  severity: text("severity"),
  riskScore: integer("risk_score").notNull().default(50),
  metadata: text("metadata"), // JSON
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  nodeTypeIdx: index("idx_ares_graph_node_type").on(t.type),
  nameIdx: index("idx_ares_graph_node_name").on(t.name),
}));

export const aresThreatGraphEdges = sqliteTable("ares_threat_graph_edges", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  targetId: text("target_id").notNull(),
  type: text("type").notNull(),
  weight: real("weight").notNull().default(1.0),
  metadata: text("metadata"), // JSON
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  sourceIdx: index("idx_ares_graph_edge_source").on(t.sourceId),
  targetIdx: index("idx_ares_graph_edge_target").on(t.targetId),
  edgeTypeIdx: index("idx_ares_graph_edge_type").on(t.type),
}));

export const aresResilienceScores = sqliteTable("ares_resilience_scores", {
  id: text("id").primaryKey(),
  overallScore: real("overall_score").notNull(),
  tier: text("tier").notNull(),
  vectorBreakdown: text("vector_breakdown").notNull(), // JSON
  mttrSeconds: integer("mttr_seconds").notNull().default(45),
  unresolvedGapsCount: integer("unresolved_gaps_count").notNull().default(0),
  tenantId: text("tenant_id").notNull().default("global"),
  calculatedAt: text("calculated_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  scoreTierIdx: index("idx_ares_resilience_tier").on(t.tier),
  resTenantIdx: index("idx_ares_resilience_tenant").on(t.tenantId),
}));

// ─── AIMS / AutoOps Smart Campus Tables ───

export const aimsAgents = sqliteTable("aims_agents", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().unique(),
  domain: text("domain").notNull(), // hvac_energy | fleet_logistics | cloud_cost | resource_mesh
  policyState: text("policy_state").notNull(), // JSON
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  agentIdIdx: index("idx_aims_agents_agent_id").on(t.agentId),
  agentInstIdx: index("idx_aims_agents_inst").on(t.institutionId),
}));

export const aimsEnergyTelemetry = sqliteTable("aims_energy_telemetry", {
  id: text("id").primaryKey(),
  sensorId: text("sensor_id").notNull(),
  campusId: text("campus_id").notNull(),
  buildingId: text("building_id").notNull(),
  zoneId: text("zone_id").notNull(),
  temperatureCelsius: real("temperature_celsius").notNull(),
  relativeHumidityPercent: real("relative_humidity_percent").notNull(),
  co2Ppm: integer("co2_ppm").notNull(),
  powerKw: real("power_kw").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  timestamp: text("timestamp").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  energyZoneIdx: index("idx_aims_energy_zone").on(t.zoneId),
  energyInstIdx: index("idx_aims_energy_inst").on(t.institutionId),
}));

export const aimsEnergyOptimizations = sqliteTable("aims_energy_optimizations", {
  id: text("id").primaryKey(),
  campusId: text("campus_id").notNull(),
  buildingId: text("building_id").notNull(),
  zoneId: text("zone_id").notNull(),
  baselineTempCelsius: real("baseline_temp_celsius").notNull(),
  optimizedSetpointCelsius: real("optimized_setpoint_celsius").notNull(),
  deltaCelsius: real("delta_celsius").notNull(),
  projectedKwhSavings: real("projected_kwh_savings").notNull().default(0),
  projectedCostSavingsDollars: real("projected_cost_savings_dollars").notNull().default(0),
  projectedCo2ReductionKg: real("projected_co2_reduction_kg").notNull().default(0),
  pmvConstraintSatisfied: integer("pmv_constraint_satisfied", { mode: "boolean" }).notNull().default(true),
  status: text("status").notNull().default("DISPATCHED"),
  institutionId: text("institution_id").notNull().default("global"),
  dispatchedAt: text("dispatched_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  optZoneIdx: index("idx_aims_opt_zone").on(t.zoneId),
  optInstIdx: index("idx_aims_opt_inst").on(t.institutionId),
}));

export const aimsFleetVehicles = sqliteTable("aims_fleet_vehicles", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().unique(),
  campusId: text("campus_id").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  speedKmph: real("speed_kmph").notNull().default(0),
  odometerKm: real("odometer_km").notNull().default(0),
  batterySoCRatio: real("battery_soc_ratio").notNull().default(1.0),
  engineTempCelsius: real("engine_temp_celsius").notNull().default(85),
  brakePadWearPercent: real("brake_pad_wear_percent").notNull().default(10),
  tirePressurePsi: real("tire_pressure_psi").notNull().default(33),
  passengerCount: integer("passenger_count").notNull().default(0),
  maxCapacity: integer("max_capacity").notNull().default(25),
  status: text("status").notNull().default("IDLE"),
  institutionId: text("institution_id").notNull().default("global"),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  vehIdIdx: index("idx_aims_fleet_veh_id").on(t.vehicleId),
  vehInstIdx: index("idx_aims_fleet_inst").on(t.institutionId),
}));

export const aimsFleetDispatches = sqliteTable("aims_fleet_dispatches", {
  id: text("id").primaryKey(),
  routeId: text("route_id").notNull().unique(),
  vehicleId: text("vehicle_id").notNull(),
  campusId: text("campus_id").notNull(),
  stopsData: text("stops_data").notNull(), // JSON
  totalDistanceKm: real("total_distance_km").notNull().default(0),
  totalDurationMinutes: integer("total_duration_minutes").notNull().default(0),
  fuelEfficiencyKmPerLiter: real("fuel_efficiency_km_per_liter").notNull().default(12),
  projectedCo2EmissionsKg: real("projected_co2_emissions_kg").notNull().default(0),
  status: text("status").notNull().default("SCHEDULED"),
  institutionId: text("institution_id").notNull().default("global"),
  generatedAt: text("generated_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  dispatchRouteIdx: index("idx_aims_dispatch_route").on(t.routeId),
  dispatchVehIdx: index("idx_aims_dispatch_veh").on(t.vehicleId),
}));

export const aimsBiometricLogs = sqliteTable("aims_biometric_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id").notNull(),
  campusId: text("campus_id").notNull(),
  locationName: text("location_name").notNull(),
  verificationMethod: text("verification_method").notNull().default("EDGE_NEURAL_ZKP"),
  zkProofId: text("zk_proof_id"),
  similarityScore: real("similarity_score").notNull().default(1.0),
  syncStatus: text("sync_status").notNull().default("SYNCED"),
  institutionId: text("institution_id").notNull().default("global"),
  verifiedAt: text("verified_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  bioUserIdx: index("idx_aims_bio_user").on(t.userId),
  bioSeshIdx: index("idx_aims_bio_sesh").on(t.sessionId),
  bioInstIdx: index("idx_aims_bio_inst").on(t.institutionId),
}));

export const aimsCloudCosts = sqliteTable("aims_cloud_costs", {
  id: text("id").primaryKey(),
  resourceId: text("resource_id").notNull(),
  provider: text("provider").notNull(), // AWS | GCP | AZURE
  region: text("region").notNull(),
  instanceType: text("instance_type").notNull(),
  clusterName: text("cluster_name").notNull(),
  environment: text("environment").notNull().default("production"),
  cpuUtilizationPercent: real("cpu_utilization_percent").notNull(),
  memoryUtilizationPercent: real("memory_utilization_percent").notNull(),
  monthlyCostDollars: real("monthly_cost_dollars").notNull(),
  isSpotInstance: integer("is_spot_instance", { mode: "boolean" }).notNull().default(false),
  recommendationData: text("recommendation_data"), // JSON
  institutionId: text("institution_id").notNull().default("global"),
  recordedAt: text("recorded_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  cloudResIdx: index("idx_aims_cloud_res").on(t.resourceId),
  cloudInstIdx: index("idx_aims_cloud_inst").on(t.institutionId),
}));

export const aimsCarbonMetrics = sqliteTable("aims_carbon_metrics", {
  id: text("id").primaryKey(),
  campusId: text("campus_id").notNull(),
  reportingPeriod: text("reporting_period").notNull(), // e.g. 2026-Q3
  scope1Kg: real("scope1_kg").notNull().default(0),
  scope2Kg: real("scope2_kg").notNull().default(0),
  scope3Kg: real("scope3_kg").notNull().default(0),
  totalKg: real("total_kg").notNull().default(0),
  totalTons: real("total_tons").notNull().default(0),
  renewablePercent: real("renewable_percent").notNull().default(0),
  studentIntensityKg: real("student_intensity_kg").notNull().default(0),
  verifiedGri: integer("verified_gri", { mode: "boolean" }).notNull().default(true),
  institutionId: text("institution_id").notNull().default("global"),
  recordedAt: text("recorded_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  carbonCampusIdx: index("idx_aims_carbon_campus").on(t.campusId),
  carbonInstIdx: index("idx_aims_carbon_inst").on(t.institutionId),
}));

export const aimsCampusResources = sqliteTable("aims_campus_resources", {
  id: text("id").primaryKey(),
  resourceId: text("resource_id").notNull().unique(),
  campusId: text("campus_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  capacityUnits: integer("capacity_units").notNull().default(1),
  isShareableCrossCampus: integer("is_shareable_cross_campus", { mode: "boolean" }).notNull().default(true),
  hourlyCostRateDollars: real("hourly_cost_rate_dollars").notNull().default(0),
  activeReservationsData: text("active_reservations_data"), // JSON
  institutionId: text("institution_id").notNull().default("global"),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  resourceIdIdx: index("idx_aims_resource_id").on(t.resourceId),
  resourceInstIdx: index("idx_aims_resource_inst").on(t.institutionId),
}));

// ─── Autonomous Federated Learning & Decentralized Analytics (Sprint-044: A-FED / EdgeMesh) ───

export const afedModels = sqliteTable("afed_models", {
  id: text("id").primaryKey(),
  modelId: text("model_id").notNull().unique(),
  name: text("name").notNull(),
  domain: text("domain").notNull(), // 'retention' | 'financial' | 'resource_demand' | 'academic' | 'energy'
  version: text("version").notNull(),
  architecture: text("architecture").notNull(),
  inputDimensions: integer("input_dimensions").notNull(),
  outputDimensions: integer("output_dimensions").notNull(),
  hyperparametersData: text("hyperparameters_data").notNull(), // JSON
  currentRound: integer("current_round").notNull().default(0),
  status: text("status").notNull().default("initialized"),
  institutionId: text("institution_id").notNull().default("global"),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  afedModelIdIdx: index("idx_afed_model_id").on(t.modelId),
  afedModelInstIdx: index("idx_afed_model_inst").on(t.institutionId),
}));

export const afedNodes = sqliteTable("afed_nodes", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull().unique(),
  campusId: text("campus_id").notNull(),
  campusName: text("campus_name").notNull(),
  status: text("status").notNull().default("idle"), // idle | training | reporting | offline
  computeTier: text("compute_tier").notNull().default("campus_server"),
  sampleCount: integer("sample_count").notNull().default(0),
  availableMemoryMb: integer("available_memory_mb").notNull().default(1024),
  networkLatencyMs: real("network_latency_ms").notNull().default(20),
  reputationScore: real("reputation_score").notNull().default(1.0),
  institutionId: text("institution_id").notNull().default("global"),
  lastHeartbeat: text("last_heartbeat").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  afedNodeIdIdx: index("idx_afed_node_id").on(t.nodeId),
  afedNodeCampusIdx: index("idx_afed_node_campus").on(t.campusId),
}));

export const afedTrainingRounds = sqliteTable("afed_training_rounds", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull().unique(),
  modelId: text("model_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  participantsCount: integer("participants_count").notNull().default(0),
  totalSamples: integer("total_samples").notNull().default(0),
  aggregationAlgorithm: text("aggregation_algorithm").notNull().default("FedAvg"),
  globalLoss: real("global_loss").notNull().default(0),
  globalAccuracy: real("global_accuracy").notNull().default(0),
  roundDurationMs: integer("round_duration_ms").notNull().default(0),
  epsilonConsumed: real("epsilon_consumed").notNull().default(0),
  status: text("status").notNull().default("completed"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  afedRoundModelIdx: index("idx_afed_round_model").on(t.modelId),
  afedRoundNumIdx: index("idx_afed_round_num").on(t.roundNumber),
}));

export const afedModelWeights = sqliteTable("afed_model_weights", {
  id: text("id").primaryKey(),
  modelId: text("model_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  weightsData: text("weights_data").notNull(), // JSON float array
  checksum: text("checksum").notNull(),
  format: text("format").notNull().default("FP32"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  afedWeightModelIdx: index("idx_afed_weight_model").on(t.modelId),
  afedWeightRoundIdx: index("idx_afed_weight_round").on(t.roundNumber),
}));

export const afedPrivacyBudgets = sqliteTable("afed_privacy_budgets", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().unique(),
  totalBudgetEpsilon: real("total_budget_epsilon").notNull().default(10.0),
  consumedEpsilon: real("consumed_epsilon").notNull().default(0),
  remainingEpsilon: real("remaining_epsilon").notNull().default(10.0),
  totalBudgetDelta: real("total_budget_delta").notNull().default(1e-5),
  isExhausted: integer("is_exhausted", { mode: "boolean" }).notNull().default(false),
  institutionId: text("institution_id").notNull().default("global"),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  afedBudgetTenantIdx: index("idx_afed_budget_tenant").on(t.tenantId),
}));

export const afedSmpcSessions = sqliteTable("afed_smpc_sessions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  modelId: text("model_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  threshold: integer("threshold").notNull(),
  participantsData: text("participants_data").notNull(), // JSON
  activePhase: text("active_phase").notNull().default("AGGREGATED"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  afedSmpcSeshIdx: index("idx_afed_smpc_sesh").on(t.sessionId),
}));

export const afedDriftMetrics = sqliteTable("afed_drift_metrics", {
  id: text("id").primaryKey(),
  modelId: text("model_id").notNull(),
  overallPsi: real("overall_psi").notNull().default(0),
  maxFeatureKs: real("max_feature_ks").notNull().default(0),
  driftedFeatureCount: integer("drifted_feature_count").notNull().default(0),
  hasSignificantDrift: integer("has_significant_drift", { mode: "boolean" }).notNull().default(false),
  featureReportsData: text("feature_reports_data").notNull(), // JSON
  institutionId: text("institution_id").notNull().default("global"),
  recordedAt: text("recorded_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  afedDriftModelIdx: index("idx_afed_drift_model").on(t.modelId),
}));

export const afedBenchmarks = sqliteTable("afed_benchmarks", {
  id: text("id").primaryKey(),
  campusId: text("campus_id").notNull(),
  reportingYear: text("reporting_year").notNull().default("2026"),
  retentionRatePercent: real("retention_rate_percent").notNull().default(0),
  graduationRatePercent: real("graduation_rate_percent").notNull().default(0),
  rankPosition: integer("rank_position").notNull().default(1),
  percentilesData: text("percentiles_data").notNull(), // JSON
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  afedBenchCampusIdx: index("idx_afed_bench_campus").on(t.campusId),
}));

export const afedPredictions = sqliteTable("afed_predictions", {
  id: text("id").primaryKey(),
  predictionId: text("prediction_id").notNull().unique(),
  modelId: text("model_id").notNull(),
  predictedClass: integer("predicted_class").notNull().default(0),
  confidenceScore: real("confidence_score").notNull().default(0),
  executedOn: text("executed_on").notNull().default("EDGE_LOCAL"),
  latencyMs: integer("latency_ms").notNull().default(0),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  afedPredIdIdx: index("idx_afed_pred_id").on(t.predictionId),
  afedPredModelIdx: index("idx_afed_pred_model").on(t.modelId),
}));

// ─── Unified Multi-Modal Communication & Intelligent Stakeholder Engagement (Sprint-046: UMC / EngageOS) ───

export const engageTemplates = sqliteTable("engage_templates", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull().default("general"),
  channel: text("channel").notNull().default("email"),
  subjectTemplate: text("subject_template"),
  bodyTemplate: text("body_template").notNull(),
  variablesSchema: text("variables_schema").notNull().default("{}"), // JSON
  brandRulesData: text("brand_rules_data").notNull().default("{}"), // JSON
  isApproved: integer("is_approved", { mode: "boolean" }).notNull().default(false),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  engageTmplIdIdx: index("idx_engage_tmpl_id").on(t.templateId),
  engageTmplChannelIdx: index("idx_engage_tmpl_channel").on(t.channel),
}));

export const engageMessages = sqliteTable("engage_messages", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  campaignId: text("campaign_id"),
  templateId: text("template_id"),
  recipientId: text("recipient_id").notNull(),
  recipientType: text("recipient_type").notNull().default("student"),
  recipientChannelAddress: text("recipient_channel_address").notNull(),
  channel: text("channel").notNull().default("email"),
  priority: text("priority").notNull().default("standard"),
  status: text("status").notNull().default("queued"),
  subject: text("subject"),
  body: text("body").notNull(),
  personalizedData: text("personalized_data").notNull().default("{}"), // JSON
  scheduledAt: text("scheduled_at").notNull().default(sql`(current_timestamp)`),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  engageMsgIdIdx: index("idx_engage_msg_id").on(t.messageId),
  engageMsgRecipientIdx: index("idx_engage_msg_recipient").on(t.recipientId),
  engageMsgStatusIdx: index("idx_engage_msg_status").on(t.status),
}));

export const engageDeliveries = sqliteTable("engage_deliveries", {
  id: text("id").primaryKey(),
  deliveryId: text("delivery_id").notNull().unique(),
  messageId: text("message_id").notNull(),
  channel: text("channel").notNull(),
  provider: text("provider").notNull(),
  providerMessageId: text("provider_message_id"),
  status: text("status").notNull().default("queued"),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  dispatchedAt: text("dispatched_at").notNull().default(sql`(current_timestamp)`),
  deliveredAt: text("delivered_at"),
  openedAt: text("opened_at"),
  clickedAt: text("clicked_at"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  engageDelivIdIdx: index("idx_engage_deliv_id").on(t.deliveryId),
  engageDelivMsgIdx: index("idx_engage_deliv_msg").on(t.messageId),
  engageDelivStatusIdx: index("idx_engage_deliv_status").on(t.status),
}));

export const engagePreferences = sqliteTable("engage_preferences", {
  id: text("id").primaryKey(),
  recipientId: text("recipient_id").notNull().unique(),
  recipientType: text("recipient_type").notNull().default("student"),
  channelPreferences: text("channel_preferences").notNull().default("{}"), // JSON
  categorySubscriptions: text("category_subscriptions").notNull().default("{}"), // JSON
  quietHoursStart: text("quiet_hours_start").notNull().default("21:00"),
  quietHoursEnd: text("quiet_hours_end").notNull().default("07:00"),
  timezone: text("timezone").notNull().default("UTC"),
  isUnsubscribedAll: integer("is_unsubscribed_all", { mode: "boolean" }).notNull().default(false),
  institutionId: text("institution_id").notNull().default("global"),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  engagePrefRecipientIdx: index("idx_engage_pref_recipient").on(t.recipientId),
}));

export const engageWorkflows = sqliteTable("engage_workflows", {
  id: text("id").primaryKey(),
  workflowId: text("workflow_id").notNull().unique(),
  name: text("name").notNull(),
  triggerEvent: text("trigger_event").notNull(),
  triggerConditionData: text("trigger_condition_data").notNull().default("{}"), // JSON
  stepsData: text("steps_data").notNull().default("[]"), // JSON array of sequence nodes
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  engageWfIdIdx: index("idx_engage_wf_id").on(t.workflowId),
  engageWfTriggerIdx: index("idx_engage_wf_trigger").on(t.triggerEvent),
}));

export const engageWorkflowRuns = sqliteTable("engage_workflow_runs", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  workflowId: text("workflow_id").notNull(),
  recipientId: text("recipient_id").notNull(),
  currentStepIndex: integer("current_step_index").notNull().default(0),
  status: text("status").notNull().default("active"),
  stateData: text("state_data").notNull().default("{}"), // JSON
  nextExecutionTime: text("next_execution_time"),
  institutionId: text("institution_id").notNull().default("global"),
  startedAt: text("started_at").notNull().default(sql`(current_timestamp)`),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  engageRunIdIdx: index("idx_engage_run_id").on(t.runId),
  engageRunWfIdx: index("idx_engage_run_wf").on(t.workflowId),
  engageRunStatusIdx: index("idx_engage_run_status").on(t.status),
}));

export const engageChatSessions = sqliteTable("engage_chat_sessions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  stakeholderId: text("stakeholder_id").notNull(),
  stakeholderType: text("stakeholder_type").notNull().default("student"),
  channel: text("channel").notNull().default("web"),
  activeIntent: text("active_intent"),
  contextSlotsData: text("context_slots_data").notNull().default("{}"), // JSON
  status: text("status").notNull().default("bot_active"),
  assignedAgentId: text("assigned_agent_id"),
  institutionId: text("institution_id").notNull().default("global"),
  lastInteractionAt: text("last_interaction_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  engageChatSeshIdIdx: index("idx_engage_chat_sesh_id").on(t.sessionId),
  engageChatStakeholderIdx: index("idx_engage_chat_stakeholder").on(t.stakeholderId),
  engageChatStatusIdx: index("idx_engage_chat_status").on(t.status),
}));

export const engageChatMessages = sqliteTable("engage_chat_messages", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  sessionId: text("session_id").notNull(),
  senderType: text("sender_type").notNull().default("stakeholder"),
  text: text("text").notNull(),
  richPayloadData: text("rich_payload_data").notNull().default("{}"), // JSON
  intentConfidence: real("intent_confidence").notNull().default(1.0),
  sentimentScore: real("sentiment_score").notNull().default(0),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  engageChatMsgIdIdx: index("idx_engage_chat_msg_id").on(t.messageId),
  engageChatMsgSeshIdx: index("idx_engage_chat_msg_sesh").on(t.sessionId),
}));

export const engageTranslations = sqliteTable("engage_translations", {
  id: text("id").primaryKey(),
  contentHash: text("content_hash").notNull().unique(),
  sourceLanguage: text("source_language").notNull().default("en"),
  targetLanguage: text("target_language").notNull(),
  sourceText: text("source_text").notNull(),
  translatedText: text("translated_text").notNull(),
  isHumanVerified: integer("is_human_verified", { mode: "boolean" }).notNull().default(false),
  verifiedBy: text("verified_by"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  engageTransHashIdx: index("idx_engage_trans_hash").on(t.contentHash),
  engageTransLangIdx: index("idx_engage_trans_lang").on(t.targetLanguage),
}));

export const engageAnalyticsEvents = sqliteTable("engage_analytics_events", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  campaignId: text("campaign_id"),
  messageId: text("message_id"),
  deliveryId: text("delivery_id"),
  recipientId: text("recipient_id"),
  eventType: text("event_type").notNull(),
  channel: text("channel").notNull().default("email"),
  metadata: text("metadata").notNull().default("{}"), // JSON
  institutionId: text("institution_id").notNull().default("global"),
  timestamp: text("timestamp").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  engageEvtIdIdx: index("idx_engage_evt_id").on(t.eventId),
  engageEvtTypeIdx: index("idx_engage_evt_type").on(t.eventType),
  engageEvtCampaignIdx: index("idx_engage_evt_campaign").on(t.campaignId),
}));

// ─── Knowledge Mesh & Campus Copilot (Sprint-047 KM-COPILOT) ───

export const kmEntities = sqliteTable("km_entities", {
  id: text("id").primaryKey(),
  entityId: text("entity_id").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'course' | 'major' | 'instructor' | 'policy' | 'facility' | 'requirement'
  code: text("code"),
  description: text("description"),
  metadata: text("metadata").notNull().default("{}"), // JSON
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  kmEntityIdIdx: index("idx_km_entity_id").on(t.entityId),
  kmEntityTypeIdx: index("idx_km_entity_type").on(t.type),
  kmEntityCodeIdx: index("idx_km_entity_code").on(t.code),
}));

export const kmRelations = sqliteTable("km_relations", {
  id: text("id").primaryKey(),
  relationId: text("relation_id").notNull().unique(),
  sourceEntityId: text("source_entity_id").notNull(),
  targetEntityId: text("target_entity_id").notNull(),
  relationType: text("relation_type").notNull(), // 'prerequisite_of' | 'offered_by' | 'fulfills_requirement' | 'governed_by' | 'co_requisite'
  properties: text("properties").notNull().default("{}"), // JSON
  weight: real("weight").notNull().default(1.0),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  kmRelIdIdx: index("idx_km_rel_id").on(t.relationId),
  kmRelSrcIdx: index("idx_km_rel_src").on(t.sourceEntityId),
  kmRelTgtIdx: index("idx_km_rel_tgt").on(t.targetEntityId),
  kmRelTypeIdx: index("idx_km_rel_type").on(t.relationType),
}));

export const kmDocuments = sqliteTable("km_documents", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull().default("academic"), // 'academic' | 'policy' | 'administrative' | 'faculty'
  fileType: text("file_type").notNull().default("pdf"), // 'pdf' | 'docx' | 'md' | 'html'
  contentHash: text("content_hash").notNull(),
  rawText: text("raw_text").notNull(),
  status: text("status").notNull().default("indexed"), // 'pending' | 'processing' | 'indexed' | 'failed'
  metadata: text("metadata").notNull().default("{}"), // JSON
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  kmDocIdIdx: index("idx_km_doc_id").on(t.documentId),
  kmDocCategoryIdx: index("idx_km_doc_category").on(t.category),
  kmDocHashIdx: index("idx_km_doc_hash").on(t.contentHash),
}));

export const kmChunks = sqliteTable("km_chunks", {
  id: text("id").primaryKey(),
  chunkId: text("chunk_id").notNull().unique(),
  documentId: text("document_id").notNull(),
  chunkIndex: integer("chunk_index").notNull().default(0),
  content: text("content").notNull(),
  tokenCount: integer("token_count").notNull().default(0),
  metadata: text("metadata").notNull().default("{}"), // JSON
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  kmChunkIdIdx: index("idx_km_chunk_id").on(t.chunkId),
  kmChunkDocIdx: index("idx_km_chunk_doc").on(t.documentId),
}));

export const kmEmbeddings = sqliteTable("km_embeddings", {
  id: text("id").primaryKey(),
  embeddingId: text("embedding_id").notNull().unique(),
  chunkId: text("chunk_id").notNull(),
  model: text("model").notNull().default("text-embedding-3-small"),
  dimensions: integer("dimensions").notNull().default(1536),
  vectorData: text("vector_data").notNull(), // Serialized Float32 Array JSON
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  kmEmbedIdIdx: index("idx_km_embed_id").on(t.embeddingId),
  kmEmbedChunkIdx: index("idx_km_embed_chunk").on(t.chunkId),
}));

export const kmDegreePrograms = sqliteTable("km_degree_programs", {
  id: text("id").primaryKey(),
  programId: text("program_id").notNull().unique(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  departmentId: text("department_id"),
  totalCreditsRequired: integer("total_credits_required").notNull().default(120),
  minGpa: real("min_gpa").notNull().default(2.0),
  rulesData: text("rules_data").notNull().default("{}"), // JSON requirements
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  kmProgIdIdx: index("idx_km_prog_id").on(t.programId),
  kmProgCodeIdx: index("idx_km_prog_code").on(t.code),
}));

export const kmCoursePrerequisites = sqliteTable("km_course_prerequisites", {
  id: text("id").primaryKey(),
  prereqId: text("prereq_id").notNull().unique(),
  courseCode: text("course_code").notNull(),
  requiredCourseCode: text("required_course_code").notNull(),
  isHardPrerequisite: integer("is_hard_prerequisite", { mode: "boolean" }).notNull().default(true),
  minGradeRequired: text("min_grade_required").notNull().default("C"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  kmPrereqIdIdx: index("idx_km_prereq_id").on(t.prereqId),
  kmPrereqCourseIdx: index("idx_km_prereq_course").on(t.courseCode),
  kmPrereqReqIdx: index("idx_km_prereq_req").on(t.requiredCourseCode),
}));

export const kmAdvisingSessions = sqliteTable("km_advising_sessions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  studentId: text("student_id").notNull(),
  advisorId: text("advisor_id"),
  mode: text("mode").notNull().default("copilot_autonomous"), // 'copilot_autonomous' | 'advisor_supervised' | 'human_takeover'
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'escalated'
  summary: text("summary"),
  contextData: text("context_data").notNull().default("{}"), // JSON
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  kmAdvSeshIdIdx: index("idx_km_adv_sesh_id").on(t.sessionId),
  kmAdvStudentIdx: index("idx_km_adv_student").on(t.studentId),
  kmAdvStatusIdx: index("idx_km_adv_status").on(t.status),
}));

export const kmAdvisingInterventions = sqliteTable("km_advising_interventions", {
  id: text("id").primaryKey(),
  interventionId: text("intervention_id").notNull().unique(),
  studentId: text("student_id").notNull(),
  riskTier: text("risk_tier").notNull().default("nominal"), // 'nominal' | 'advisory' | 'moderate_risk' | 'critical_intervention'
  reason: text("reason").notNull(),
  recommendedActions: text("recommended_actions").notNull().default("[]"), // JSON array
  status: text("status").notNull().default("pending"), // 'pending' | 'in_review' | 'applied' | 'dismissed'
  assignedAdvisorId: text("assigned_advisor_id"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  kmIntervIdIdx: index("idx_km_interv_id").on(t.interventionId),
  kmIntervStudentIdx: index("idx_km_interv_student").on(t.studentId),
  kmIntervRiskIdx: index("idx_km_interv_risk").on(t.riskTier),
}));

export const kmTranslationCache = sqliteTable("km_translation_cache", {
  id: text("id").primaryKey(),
  contentHash: text("content_hash").notNull().unique(),
  sourceLanguage: text("source_language").notNull().default("en"),
  targetLanguage: text("target_language").notNull(),
  sourceText: text("source_text").notNull(),
  translatedText: text("translated_text").notNull(),
  provider: text("provider").notNull().default("google_cloud"), // 'google_cloud' | 'deepl' | 'local_neural'
  qualityScore: real("quality_score").notNull().default(0.9),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  kmTransHashIdx: index("idx_km_trans_hash").on(t.contentHash),
  kmTransLangIdx: index("idx_km_trans_lang").on(t.targetLanguage),
}));

// ─── Autonomous Campus Digital Twin & Spatial Facility Intelligence (Sprint-048 / TWIN-OPS) ───

export const twinFacilities = sqliteTable("twin_facilities", {
  id: text("id").primaryKey(),
  facilityId: text("facility_id").notNull().unique(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  facilityType: text("facility_type").notNull().default("academic"), // 'academic' | 'residential' | 'administrative' | 'recreational' | 'laboratory'
  status: text("status").notNull().default("operational"), // 'operational' | 'maintenance' | 'evacuating' | 'closed'
  totalFloors: integer("total_floors").notNull().default(1),
  totalAreaSqMeters: real("total_area_sq_meters").notNull().default(0),
  geoLocationJson: text("geo_location_json").notNull().default("{}"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  twinFacIdIdx: index("idx_twin_fac_id").on(t.facilityId),
  twinFacTypeIdx: index("idx_twin_fac_type").on(t.facilityType),
  twinFacStatusIdx: index("idx_twin_fac_status").on(t.status),
}));

export const twinSpaces = sqliteTable("twin_spaces", {
  id: text("id").primaryKey(),
  spaceId: text("space_id").notNull().unique(),
  facilityId: text("facility_id").notNull(),
  floorLevel: integer("floor_level").notNull().default(0),
  name: text("name").notNull(),
  code: text("code").notNull(),
  spaceType: text("space_type").notNull().default("classroom"), // 'classroom' | 'laboratory' | 'office' | 'auditorium' | 'study_room' | 'corridor' | 'utility'
  capacity: integer("capacity").notNull().default(30),
  currentOccupancy: integer("current_occupancy").notNull().default(0),
  comfortScore: real("comfort_score").notNull().default(100.0),
  dimensionsJson: text("dimensions_json").notNull().default("{}"),
  polygonGeoJson: text("polygon_geojson").notNull().default("{}"),
  isBookable: integer("is_bookable", { mode: "boolean" }).notNull().default(true),
  status: text("status").notNull().default("available"), // 'available' | 'occupied' | 'reserved' | 'hazard_restricted' | 'maintenance'
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  twinSpaceIdIdx: index("idx_twin_space_id").on(t.spaceId),
  twinSpaceFacIdx: index("idx_twin_space_fac").on(t.facilityId),
  twinSpaceTypeIdx: index("idx_twin_space_type").on(t.spaceType),
  twinSpaceStatusIdx: index("idx_twin_space_status").on(t.status),
}));

export const twin3dModels = sqliteTable("twin_3d_models", {
  id: text("id").primaryKey(),
  modelId: text("model_id").notNull().unique(),
  facilityId: text("facility_id").notNull(),
  spaceId: text("space_id"),
  format: text("format").notNull().default("gltf"), // 'gltf' | 'glb' | 'geojson' | 'bim_ifc'
  lodLevel: integer("lod_level").notNull().default(1),
  modelData: text("model_data").notNull().default("{}"),
  meshVerticesCount: integer("mesh_vertices_count").notNull().default(0),
  fileSizeBytes: integer("file_size_bytes").notNull().default(0),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  twinModelIdIdx: index("idx_twin_model_id").on(t.modelId),
  twinModelFacIdx: index("idx_twin_model_fac").on(t.facilityId),
}));

export const twinSensors = sqliteTable("twin_sensors", {
  id: text("id").primaryKey(),
  sensorId: text("sensor_id").notNull().unique(),
  facilityId: text("facility_id").notNull(),
  spaceId: text("space_id"),
  sensorType: text("sensor_type").notNull().default("temperature"), // 'temperature' | 'humidity' | 'co2' | 'noise' | 'occupancy_pir' | 'energy_power' | 'smoke_fire' | 'ble_gateway'
  protocol: text("protocol").notNull().default("mqtt"), // 'mqtt' | 'coap' | 'http_webhook' | 'ble_mesh'
  status: text("status").notNull().default("online"), // 'online' | 'offline' | 'degraded' | 'calibrating'
  batteryPercent: real("battery_percent").default(100.0),
  samplingIntervalSeconds: integer("sampling_interval_seconds").notNull().default(60),
  calibrationOffset: real("calibration_offset").notNull().default(0.0),
  lastHeartbeat: text("last_heartbeat"),
  coordinatesJson: text("coordinates_json").notNull().default("{\"x\":0,\"y\":0,\"z\":0}"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  twinSensorIdIdx: index("idx_twin_sensor_id").on(t.sensorId),
  twinSensorFacIdx: index("idx_twin_sensor_fac").on(t.facilityId),
  twinSensorSpaceIdx: index("idx_twin_sensor_space").on(t.spaceId),
  twinSensorTypeIdx: index("idx_twin_sensor_type").on(t.sensorType),
  twinSensorStatusIdx: index("idx_twin_sensor_status").on(t.status),
}));

export const twinTelemetry = sqliteTable("twin_telemetry", {
  id: text("id").primaryKey(),
  telemetryId: text("telemetry_id").notNull().unique(),
  sensorId: text("sensor_id").notNull(),
  metricType: text("metric_type").notNull(), // 'temperature_c' | 'humidity_pct' | 'co2_ppm' | 'noise_db' | 'occupancy_count' | 'power_kw' | 'air_quality_index' | 'rssi_dbm'
  numericValue: real("numeric_value").notNull(),
  unit: text("unit").notNull().default("unit"),
  isAnomaly: integer("is_anomaly", { mode: "boolean" }).notNull().default(false),
  rawPayload: text("raw_payload").notNull().default("{}"),
  recordedAt: text("recorded_at").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  twinTelemIdIdx: index("idx_twin_telem_id").on(t.telemetryId),
  twinTelemSensorIdx: index("idx_twin_telem_sensor").on(t.sensorId),
  twinTelemMetricIdx: index("idx_twin_telem_metric").on(t.metricType),
  twinTelemTimeIdx: index("idx_twin_telem_time").on(t.recordedAt),
}));

export const twinAssets = sqliteTable("twin_assets", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull().unique(),
  facilityId: text("facility_id").notNull(),
  spaceId: text("space_id"),
  tagId: text("tag_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("lab_equipment"), // 'lab_equipment' | 'it_hardware' | 'av_multimedia' | 'furniture' | 'medical_device' | 'fleet_vehicle'
  status: text("status").notNull().default("in_place"), // 'in_place' | 'in_transit' | 'geofence_breach' | 'maintenance' | 'missing'
  currentCoordinatesJson: text("current_coordinates_json").notNull().default("{\"x\":0,\"y\":0,\"z\":0}"),
  lastSeenAt: text("last_seen_at"),
  purchaseCost: real("purchase_cost").notNull().default(0.0),
  operationalHours: real("operational_hours").notNull().default(0.0),
  warrantyExpiry: text("warranty_expiry"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  twinAssetIdIdx: index("idx_twin_asset_id").on(t.assetId),
  twinAssetTagIdx: index("idx_twin_asset_tag").on(t.tagId),
  twinAssetFacIdx: index("idx_twin_asset_fac").on(t.facilityId),
  twinAssetStatusIdx: index("idx_twin_asset_status").on(t.status),
}));

export const twinGeofences = sqliteTable("twin_geofences", {
  id: text("id").primaryKey(),
  geofenceId: text("geofence_id").notNull().unique(),
  facilityId: text("facility_id").notNull(),
  spaceId: text("space_id"),
  name: text("name").notNull(),
  perimeterType: text("perimeter_type").notNull().default("polygon"), // 'polygon' | 'bounding_box' | 'radius_sphere'
  boundaryJson: text("boundary_json").notNull().default("{}"),
  alertOnExit: integer("alert_on_exit", { mode: "boolean" }).notNull().default(true),
  alertOnEntry: integer("alert_on_entry", { mode: "boolean" }).notNull().default(false),
  severity: text("severity").notNull().default("high"), // 'low' | 'medium' | 'high' | 'critical'
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  twinGeoIdIdx: index("idx_twin_geo_id").on(t.geofenceId),
  twinGeoFacIdx: index("idx_twin_geo_fac").on(t.facilityId),
}));

export const twinMaintenanceOrders = sqliteTable("twin_maintenance_orders", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  facilityId: text("facility_id").notNull(),
  spaceId: text("space_id"),
  assetId: text("asset_id"),
  sensorId: text("sensor_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'critical'
  status: text("status").notNull().default("pending"), // 'pending' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled'
  source: text("source").notNull().default("ai_predicted"), // 'ai_predicted' | 'sensor_alarm' | 'manual_staff' | 'geofence_breach'
  assignedStaffId: text("assigned_staff_id"),
  estimatedCost: real("estimated_cost").notNull().default(0.0),
  scheduledDate: text("scheduled_date"),
  completedAt: text("completed_at"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  twinMaintIdIdx: index("idx_twin_maint_id").on(t.orderId),
  twinMaintFacIdx: index("idx_twin_maint_fac").on(t.facilityId),
  twinMaintStatusIdx: index("idx_twin_maint_status").on(t.status),
  twinMaintPriorityIdx: index("idx_twin_maint_priority").on(t.priority),
}));

export const twinWayfindingNodes = sqliteTable("twin_wayfinding_nodes", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull().unique(),
  facilityId: text("facility_id").notNull(),
  spaceId: text("space_id"),
  floorLevel: integer("floor_level").notNull().default(0),
  nodeType: text("node_type").notNull().default("hallway_intersection"), // 'room_entrance' | 'hallway_intersection' | 'stairwell' | 'elevator' | 'emergency_exit' | 'outdoor_gate'
  coordinatesJson: text("coordinates_json").notNull().default("{\"x\":0,\"y\":0,\"z\":0}"),
  isAccessible: integer("is_accessible", { mode: "boolean" }).notNull().default(true),
  isExit: integer("is_exit", { mode: "boolean" }).notNull().default(false),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  twinWfNodeIdIdx: index("idx_twin_wf_node_id").on(t.nodeId),
  twinWfNodeFacIdx: index("idx_twin_wf_node_fac").on(t.facilityId),
  twinWfNodeFloorIdx: index("idx_twin_wf_node_floor").on(t.floorLevel),
}));

export const twinWayfindingEdges = sqliteTable("twin_wayfinding_edges", {
  id: text("id").primaryKey(),
  edgeId: text("edge_id").notNull().unique(),
  facilityId: text("facility_id").notNull(),
  sourceNodeId: text("source_node_id").notNull(),
  targetNodeId: text("target_node_id").notNull(),
  distanceMeters: real("distance_meters").notNull().default(1.0),
  transitTimeSeconds: real("transit_time_seconds").notNull().default(1.0),
  isStepFree: integer("is_step_free", { mode: "boolean" }).notNull().default(true),
  isBlocked: integer("is_blocked", { mode: "boolean" }).notNull().default(false),
  hazardLevel: text("hazard_level").notNull().default("none"), // 'none' | 'smoke' | 'fire' | 'construction' | 'flooded'
  hazardReason: text("hazard_reason"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  twinWfEdgeIdIdx: index("idx_twin_wf_edge_id").on(t.edgeId),
  twinWfEdgeFacIdx: index("idx_twin_wf_edge_fac").on(t.facilityId),
  twinWfEdgeSrcIdx: index("idx_twin_wf_edge_src").on(t.sourceNodeId),
  twinWfEdgeTgtIdx: index("idx_twin_wf_edge_tgt").on(t.targetNodeId),
}));

// ─── ECO-MESH / NetZeroOS Autonomous Microgrid & Sustainability (Sprint-049) ───

export const ecoEnergyAssets = sqliteTable("eco_energy_assets", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull().unique(),
  facilityId: text("facility_id").notNull(),
  name: text("name").notNull(),
  assetType: text("asset_type").notNull().default("smart_meter"), // 'smart_meter' | 'solar_inverter' | 'wind_turbine' | 'bess_battery' | 'ev_charger' | 'transformer' | 'generator'
  status: text("status").notNull().default("online"), // 'online' | 'offline' | 'degraded' | 'maintenance' | 'fault'
  capacityKw: real("capacity_kw").notNull().default(0.0),
  ratedVoltage: real("rated_voltage").notNull().default(400.0),
  specificationsJson: text("specifications_json").notNull().default("{}"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  ecoAssetIdIdx: index("idx_eco_asset_id").on(t.assetId),
  ecoAssetFacIdx: index("idx_eco_asset_fac").on(t.facilityId),
  ecoAssetTypeIdx: index("idx_eco_asset_type").on(t.assetType),
  ecoAssetStatusIdx: index("idx_eco_asset_status").on(t.status),
}));

export const ecoGenerationSources = sqliteTable("eco_generation_sources", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().unique(),
  assetId: text("asset_id").notNull(),
  name: text("name").notNull(),
  sourceType: text("source_type").notNull().default("solar_pv"), // 'solar_pv' | 'wind' | 'biomass' | 'diesel_gen' | 'grid_interconnect'
  peakCapacityKw: real("peak_capacity_kw").notNull().default(100.0),
  efficiencyPercent: real("efficiency_percent").notNull().default(21.5),
  tiltAngle: real("tilt_angle").notNull().default(15.0),
  azimuthAngle: real("azimuth_angle").notNull().default(180.0),
  locationJson: text("location_json").notNull().default("{}"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  ecoGenSourceIdIdx: index("idx_eco_gen_source_id").on(t.sourceId),
  ecoGenAssetIdIdx: index("idx_eco_gen_asset_id").on(t.assetId),
  ecoGenTypeIdx: index("idx_eco_gen_type").on(t.sourceType),
}));

export const ecoStorageBatteries = sqliteTable("eco_storage_batteries", {
  id: text("id").primaryKey(),
  batteryId: text("battery_id").notNull().unique(),
  assetId: text("asset_id").notNull(),
  name: text("name").notNull(),
  chemistry: text("chemistry").notNull().default("lfp"), // 'lfp' | 'nmc' | 'solid_state' | 'flow'
  capacityKwh: real("capacity_kwh").notNull().default(500.0),
  maxPowerKw: real("max_power_kw").notNull().default(250.0),
  currentSoCPercent: real("current_soc_percent").notNull().default(65.0),
  minSoCPercent: real("min_soc_percent").notNull().default(20.0),
  maxSoCPercent: real("max_soc_percent").notNull().default(90.0),
  cycleCount: integer("cycle_count").notNull().default(0),
  healthStatus: text("health_status").notNull().default("good"), // 'excellent' | 'good' | 'fair' | 'degraded'
  dispatchMode: text("dispatch_mode").notNull().default("arbitrage"), // 'arbitrage' | 'peak_shaving' | 'emergency_reserve' | 'grid_forming' | 'manual'
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  ecoBatIdIdx: index("idx_eco_bat_id").on(t.batteryId),
  ecoBatAssetIdx: index("idx_eco_bat_asset").on(t.assetId),
  ecoBatModeIdx: index("idx_eco_bat_mode").on(t.dispatchMode),
}));

export const ecoGridTariffs = sqliteTable("eco_grid_tariffs", {
  id: text("id").primaryKey(),
  tariffId: text("tariff_id").notNull().unique(),
  name: text("name").notNull(),
  providerName: text("provider_name").notNull(),
  currency: text("currency").notNull().default("USD"),
  touRatesJson: text("tou_rates_json").notNull().default("[]"),
  demandChargePerKw: real("demand_charge_per_kw").notNull().default(15.0),
  feedInTariffPerKwh: real("feed_in_tariff_per_kwh").notNull().default(0.06),
  effectiveFrom: text("effective_from").notNull(),
  effectiveTo: text("effective_to"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  ecoTariffIdIdx: index("idx_eco_tariff_id").on(t.tariffId),
  ecoTariffProviderIdx: index("idx_eco_tariff_provider").on(t.providerName),
}));

export const ecoTelemetryEnergy = sqliteTable("eco_telemetry_energy", {
  id: text("id").primaryKey(),
  telemetryId: text("telemetry_id").notNull().unique(),
  assetId: text("asset_id").notNull(),
  sourceType: text("source_type").notNull().default("smart_meter"), // 'smart_meter' | 'solar_pv' | 'bess' | 'ev_charger' | 'grid_feed'
  powerKw: real("power_kw").notNull().default(0.0),
  energyKwh: real("energy_kwh").notNull().default(0.0),
  voltageV: real("voltage_v").notNull().default(400.0),
  currentA: real("current_a").notNull().default(0.0),
  powerFactor: real("power_factor").notNull().default(0.98),
  frequencyHz: real("frequency_hz").notNull().default(50.0),
  socPercent: real("soc_percent"),
  carbonGramsPerKwh: real("carbon_grams_per_kwh").notNull().default(350.0),
  recordedAt: text("recorded_at").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  ecoTelemIdIdx: index("idx_eco_telem_id").on(t.telemetryId),
  ecoTelemAssetIdx: index("idx_eco_telem_asset").on(t.assetId),
  ecoTelemTypeIdx: index("idx_eco_telem_type").on(t.sourceType),
  ecoTelemTimeIdx: index("idx_eco_telem_time").on(t.recordedAt),
}));

export const ecoCarbonEmissions = sqliteTable("eco_carbon_emissions", {
  id: text("id").primaryKey(),
  emissionId: text("emission_id").notNull().unique(),
  facilityId: text("facility_id").notNull(),
  departmentId: text("department_id"),
  scope: text("scope").notNull().default("scope_2"), // 'scope_1' | 'scope_2' | 'scope_3'
  category: text("category").notNull().default("electricity"), // 'stationary_combustion' | 'mobile_fleet' | 'electricity' | 'heating_cooling' | 'commute' | 'waste' | 'procurement'
  fuelType: text("fuel_type"),
  quantity: real("quantity").notNull().default(0.0),
  unit: text("unit").notNull().default("kWh"), // 'kWh' | 'liters' | 'kg' | 'km'
  emissionFactor: real("emission_factor").notNull().default(0.35),
  co2EquivalentKg: real("co2_equivalent_kg").notNull().default(0.0),
  activityDate: text("activity_date").notNull(),
  isOffset: integer("is_offset", { mode: "boolean" }).notNull().default(false),
  offsetId: text("offset_id"),
  auditHash: text("audit_hash").notNull().default(""),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  ecoEmissionIdIdx: index("idx_eco_emission_id").on(t.emissionId),
  ecoEmissionFacIdx: index("idx_eco_emission_fac").on(t.facilityId),
  ecoEmissionDeptIdx: index("idx_eco_emission_dept").on(t.departmentId),
  ecoEmissionScopeIdx: index("idx_eco_emission_scope").on(t.scope),
  ecoEmissionDateIdx: index("idx_eco_emission_date").on(t.activityDate),
}));

export const ecoEvChargingStations = sqliteTable("eco_ev_charging_stations", {
  id: text("id").primaryKey(),
  stationId: text("station_id").notNull().unique(),
  facilityId: text("facility_id").notNull(),
  name: text("name").notNull(),
  ocppId: text("ocpp_id").notNull().unique(),
  connectorType: text("connector_type").notNull().default("type2_combo_ccs"), // 'type2_combo_ccs' | 'chademo' | 'type2_ac' | 'tesla_nacs'
  maxPowerKw: real("max_power_kw").notNull().default(50.0),
  status: text("status").notNull().default("available"), // 'available' | 'charging' | 'discharging_v2g' | 'faulted' | 'reserved' | 'offline'
  currentPowerKw: real("current_power_kw").notNull().default(0.0),
  isV2GEnabled: integer("is_v2g_enabled", { mode: "boolean" }).notNull().default(true),
  firmwareVersion: text("firmware_version").notNull().default("v2.0.1"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  ecoEvStationIdIdx: index("idx_eco_ev_station_id").on(t.stationId),
  ecoEvStationFacIdx: index("idx_eco_ev_station_fac").on(t.facilityId),
  ecoEvOcppIdx: index("idx_eco_ev_ocpp").on(t.ocppId),
  ecoEvStatusIdx: index("idx_eco_ev_status").on(t.status),
}));

export const ecoEvFleetSessions = sqliteTable("eco_ev_fleet_sessions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  stationId: text("station_id").notNull(),
  vehicleId: text("vehicle_id").notNull(),
  vehicleType: text("vehicle_type").notNull().default("bus"), // 'bus' | 'maintenance_van' | 'shuttle' | 'staff_commuter'
  driverId: text("driver_id"),
  sessionType: text("session_type").notNull().default("smart_charge"), // 'smart_charge' | 'v2g_discharge' | 'fast_emergency_charge'
  startSoCPercent: real("start_soc_percent").notNull().default(40.0),
  currentSoCPercent: real("current_soc_percent").notNull().default(40.0),
  targetSoCPercent: real("target_soc_percent").notNull().default(85.0),
  energyDeliveredKwh: real("energy_delivered_kwh").notNull().default(0.0),
  energyDischargedKwh: real("energy_discharged_kwh").notNull().default(0.0),
  departureTime: text("departure_time"),
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'interrupted'
  costSavings: real("cost_savings").notNull().default(0.0),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  ecoEvSessionIdIdx: index("idx_eco_ev_session_id").on(t.sessionId),
  ecoEvSessionStationIdx: index("idx_eco_ev_session_station").on(t.stationId),
  ecoEvSessionVehIdx: index("idx_eco_ev_session_veh").on(t.vehicleId),
  ecoEvSessionStatusIdx: index("idx_eco_ev_session_status").on(t.status),
}));

export const ecoEsgReports = sqliteTable("eco_esg_reports", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().unique(),
  title: text("title").notNull(),
  reportingPeriod: text("reporting_period").notNull(), // '2026-Q1', '2026-FY'
  framework: text("framework").notNull().default("ghg_protocol_gri305"), // 'ghg_protocol_gri305' | 'csrd_esrs_e1' | 'sec_climate' | 'tcfd'
  scope1TotalKg: real("scope1_total_kg").notNull().default(0.0),
  scope2LocationKg: real("scope2_location_kg").notNull().default(0.0),
  scope2MarketKg: real("scope2_market_kg").notNull().default(0.0),
  scope3TotalKg: real("scope3_total_kg").notNull().default(0.0),
  netEmissionsKg: real("net_emissions_kg").notNull().default(0.0),
  recOffsetsDeductedKg: real("rec_offsets_deducted_kg").notNull().default(0.0),
  merkleRoot: text("merkle_root").notNull().default(""),
  status: text("status").notNull().default("draft"), // 'draft' | 'under_review' | 'certified' | 'published'
  publishedAt: text("published_at"),
  signedByUserId: text("signed_by_user_id"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  ecoReportIdIdx: index("idx_eco_report_id").on(t.reportId),
  ecoReportPeriodIdx: index("idx_eco_report_period").on(t.reportingPeriod),
  ecoReportStatusIdx: index("idx_eco_report_status").on(t.status),
}));

export const ecoCarbonOffsets = sqliteTable("eco_carbon_offsets", {
  id: text("id").primaryKey(),
  offsetId: text("offset_id").notNull().unique(),
  certificateNumber: text("certificate_number").notNull().unique(),
  registry: text("registry").notNull().default("verra_vcs"), // 'verra_vcs' | 'gold_standard' | 'irec_standard' | 'cdm'
  offsetType: text("offset_type").notNull().default("reforestation"), // 'reforestation' | 'solar_renewable' | 'methane_capture' | 'direct_air_capture' | 'irec_rec'
  vintageYear: integer("vintage_year").notNull().default(2025),
  quantityTonsCo2e: real("quantity_tons_co2e").notNull().default(100.0),
  costPerTon: real("cost_per_ton").notNull().default(25.0),
  status: text("status").notNull().default("active"), // 'active' | 'retired' | 'expired'
  retiredForPeriod: text("retired_for_period"),
  verificationHash: text("verification_hash").notNull().default(""),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  ecoOffsetIdIdx: index("idx_eco_offset_id").on(t.offsetId),
  ecoOffsetCertIdx: index("idx_eco_offset_cert").on(t.certificateNumber),
  ecoOffsetStatusIdx: index("idx_eco_offset_status").on(t.status),
}));

// ─── Autonomous Campus Safety, AI Vision Shield & Edge Physical Security Orchestrator (VISION-SHIELD / SafeCampus OS) ───

export const visionCameras = sqliteTable("vision_cameras", {
  id: text("id").primaryKey(),
  cameraId: text("camera_id").notNull().unique(),
  name: text("name").notNull(),
  facilityId: text("facility_id").notNull(),
  spaceId: text("space_id"),
  zoneType: text("zone_type").notNull().default("perimeter"), // 'perimeter' | 'corridor' | 'entrance' | 'parking' | 'hallway' | 'common_area'
  protocol: text("protocol").notNull().default("onvif"), // 'onvif' | 'rtsp' | 'webrtc'
  streamUrl: text("stream_url").notNull(),
  resolution: text("resolution").notNull().default("1080p"), // '720p' | '1080p' | '4k'
  fps: integer("fps").notNull().default(30),
  fovHorizontalDeg: real("fov_horizontal_deg").notNull().default(90.0),
  fovVerticalDeg: real("fov_vertical_deg").notNull().default(60.0),
  mountingHeightMeters: real("mounting_height_meters").notNull().default(3.5),
  positionX: real("position_x").notNull().default(0.0),
  positionY: real("position_y").notNull().default(0.0),
  positionZ: real("position_z").notNull().default(3.5),
  pitchDeg: real("pitch_deg").notNull().default(-15.0),
  yawDeg: real("yaw_deg").notNull().default(0.0),
  rollDeg: real("roll_deg").notNull().default(0.0),
  ptzCapable: integer("ptz_capable", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("online"), // 'online' | 'offline' | 'degraded' | 'occluded'
  isPrivacyMasked: integer("is_privacy_masked", { mode: "boolean" }).notNull().default(false),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  visionCamIdIdx: index("idx_vision_cam_id").on(t.cameraId),
  visionCamFacIdx: index("idx_vision_cam_fac").on(t.facilityId),
  visionCamZoneIdx: index("idx_vision_cam_zone").on(t.zoneType),
  visionCamStatusIdx: index("idx_vision_cam_status").on(t.status),
}));

export const visionDetectionZones = sqliteTable("vision_detection_zones", {
  id: text("id").primaryKey(),
  zoneId: text("zone_id").notNull().unique(),
  cameraId: text("camera_id").notNull(),
  name: text("name").notNull(),
  zoneType: text("zone_type").notNull().default("perimeter_tripwire"), // 'perimeter_tripwire' | 'crowd_density' | 'restricted_entry' | 'slip_fall_hazard' | 'privacy_exclusion'
  polygonCoordinatesJson: text("polygon_coordinates_json").notNull().default("[]"),
  direction: text("direction").notNull().default("bidirectional"), // 'entry' | 'exit' | 'bidirectional'
  sensitivity: real("sensitivity").notNull().default(0.85),
  maxOccupancyThreshold: integer("max_occupancy_threshold").notNull().default(50),
  loiteringThresholdSeconds: integer("loitering_threshold_seconds").notNull().default(120),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  visionZoneIdIdx: index("idx_vision_zone_id").on(t.zoneId),
  visionZoneCamIdx: index("idx_vision_zone_cam").on(t.cameraId),
  visionZoneTypeIdx: index("idx_vision_zone_type").on(t.zoneType),
}));

export const visionThreatAlerts = sqliteTable("vision_threat_alerts", {
  id: text("id").primaryKey(),
  alertId: text("alert_id").notNull().unique(),
  cameraId: text("camera_id").notNull(),
  zoneId: text("zone_id"),
  threatType: text("threat_type").notNull().default("perimeter_intrusion"), // 'perimeter_intrusion' | 'crowd_surge' | 'stampede_risk' | 'slip_and_fall' | 'loitering' | 'camera_tampering' | 'blacklisted_vehicle' | 'unresponsive_person'
  severity: text("severity").notNull().default("medium"), // 'critical' | 'high' | 'medium' | 'low' | 'informational'
  confidenceScore: real("confidence_score").notNull().default(0.85),
  boundingPolygonJson: text("bounding_polygon_json").notNull().default("[]"),
  snapshotUrl: text("snapshot_url"),
  status: text("status").notNull().default("active"), // 'active' | 'acknowledged' | 'triaged' | 'dispatched' | 'resolved' | 'false_positive'
  detectedAt: text("detected_at").notNull(),
  resolvedAt: text("resolved_at"),
  auditHash: text("audit_hash").notNull().default(""),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  visionAlertIdIdx: index("idx_vision_alert_id").on(t.alertId),
  visionAlertCamIdx: index("idx_vision_alert_cam").on(t.cameraId),
  visionAlertThreatIdx: index("idx_vision_alert_threat").on(t.threatType),
  visionAlertSeverityIdx: index("idx_vision_alert_severity").on(t.severity),
  visionAlertStatusIdx: index("idx_vision_alert_status").on(t.status),
  visionAlertTimeIdx: index("idx_vision_alert_time").on(t.detectedAt),
}));

export const visionSecurityIncidents = sqliteTable("vision_security_incidents", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  threatType: text("threat_type").notNull().default("perimeter_intrusion"),
  severity: text("severity").notNull().default("high"),
  facilityId: text("facility_id").notNull(),
  spaceId: text("space_id"),
  leadGuardId: text("lead_guard_id"),
  status: text("status").notNull().default("open"), // 'open' | 'investigating' | 'dispatched' | 'contained' | 'resolved' | 'closed'
  capJson: text("cap_json").notNull().default("{}"),
  merkleRoot: text("merkle_root").notNull().default(""),
  occurredAt: text("occurred_at").notNull(),
  containedAt: text("contained_at"),
  closedAt: text("closed_at"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  visionIncidentIdIdx: index("idx_vision_incident_id").on(t.incidentId),
  visionIncidentFacIdx: index("idx_vision_incident_fac").on(t.facilityId),
  visionIncidentStatusIdx: index("idx_vision_incident_status").on(t.status),
  visionIncidentSeverityIdx: index("idx_vision_incident_severity").on(t.severity),
  visionIncidentOccurIdx: index("idx_vision_incident_occur").on(t.occurredAt),
}));

export const visionGuardProfiles = sqliteTable("vision_guard_profiles", {
  id: text("id").primaryKey(),
  guardId: text("guard_id").notNull().unique(),
  staffId: text("staff_id").notNull(),
  badgeNumber: text("badge_number").notNull().unique(),
  callSign: text("call_sign").notNull(),
  status: text("status").notNull().default("on_duty"), // 'on_duty' | 'patrolling' | 'dispatched' | 'on_break' | 'off_duty'
  currentLocationX: real("current_location_x").notNull().default(0.0),
  currentLocationY: real("current_location_y").notNull().default(0.0),
  currentLocationZ: real("current_location_z").notNull().default(0.0),
  currentFacilityId: text("current_facility_id"),
  assignedSector: text("assigned_sector"),
  batteryPercent: real("battery_percent").notNull().default(100.0),
  lastHeartbeatAt: text("last_heartbeat_at").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  visionGuardIdIdx: index("idx_vision_guard_id").on(t.guardId),
  visionGuardStaffIdx: index("idx_vision_guard_staff").on(t.staffId),
  visionGuardStatusIdx: index("idx_vision_guard_status").on(t.status),
  visionGuardFacIdx: index("idx_vision_guard_fac").on(t.currentFacilityId),
}));

export const visionGuardDispatches = sqliteTable("vision_guard_dispatches", {
  id: text("id").primaryKey(),
  dispatchId: text("dispatch_id").notNull().unique(),
  incidentId: text("incident_id").notNull(),
  guardId: text("guard_id").notNull(),
  priority: text("priority").notNull().default("high"), // 'urgent' | 'high' | 'medium' | 'low'
  assignedRouteJson: text("assigned_route_json").notNull().default("[]"),
  etaSeconds: integer("eta_seconds").notNull().default(180),
  responseStatus: text("response_status").notNull().default("dispatched"), // 'dispatched' | 'acknowledged' | 'en_route' | 'on_scene' | 'cleared'
  dispatchedAt: text("dispatched_at").notNull(),
  arrivedAt: text("arrived_at"),
  clearedAt: text("cleared_at"),
  notes: text("notes"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  visionDispatchIdIdx: index("idx_vision_dispatch_id").on(t.dispatchId),
  visionDispatchIncIdx: index("idx_vision_dispatch_inc").on(t.incidentId),
  visionDispatchGuardIdx: index("idx_vision_dispatch_guard").on(t.guardId),
  visionDispatchStatusIdx: index("idx_vision_dispatch_status").on(t.responseStatus),
}));

export const visionAlprLogs = sqliteTable("vision_alpr_logs", {
  id: text("id").primaryKey(),
  logId: text("log_id").notNull().unique(),
  cameraId: text("camera_id").notNull(),
  plateNumber: text("plate_number").notNull(),
  confidenceScore: real("confidence_score").notNull().default(0.95),
  direction: text("direction").notNull().default("entry"), // 'entry' | 'exit'
  gateId: text("gate_id").notNull().default("main_gate"),
  vehicleType: text("vehicle_type").notNull().default("car"), // 'car' | 'motorcycle' | 'bus' | 'van' | 'truck'
  permitStatus: text("permit_status").notNull().default("unknown"), // 'authorized_staff' | 'authorized_student' | 'visitor_pass' | 'unauthorized' | 'blacklisted'
  gateActuated: integer("gate_actuated", { mode: "boolean" }).notNull().default(false),
  snapshotUrl: text("snapshot_url"),
  capturedAt: text("captured_at").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  visionAlprLogIdIdx: index("idx_vision_alpr_log_id").on(t.logId),
  visionAlprCamIdx: index("idx_vision_alpr_cam").on(t.cameraId),
  visionAlprPlateIdx: index("idx_vision_alpr_plate").on(t.plateNumber),
  visionAlprPermitIdx: index("idx_vision_alpr_permit").on(t.permitStatus),
  visionAlprTimeIdx: index("idx_vision_alpr_time").on(t.capturedAt),
}));

export const visionVehicleWhitelist = sqliteTable("vision_vehicle_whitelist", {
  id: text("id").primaryKey(),
  permitId: text("permit_id").notNull().unique(),
  plateNumber: text("plate_number").notNull().unique(),
  ownerName: text("owner_name").notNull(),
  ownerType: text("owner_type").notNull().default("staff"), // 'staff' | 'student' | 'vendor' | 'vip' | 'security'
  ownerId: text("owner_id"),
  vehicleMakeModel: text("vehicle_make_model"),
  vehicleColor: text("vehicle_color"),
  validFrom: text("valid_from").notNull(),
  validTo: text("valid_to"),
  isBlacklisted: integer("is_blacklisted", { mode: "boolean" }).notNull().default(false),
  blacklistReason: text("blacklist_reason"),
  status: text("status").notNull().default("active"), // 'active' | 'suspended' | 'expired'
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  visionWhitelistPermitIdx: index("idx_vision_whitelist_permit").on(t.permitId),
  visionWhitelistPlateIdx: index("idx_vision_whitelist_plate").on(t.plateNumber),
  visionWhitelistStatusIdx: index("idx_vision_whitelist_status").on(t.status),
  visionWhitelistOwnerIdx: index("idx_vision_whitelist_owner").on(t.ownerType, t.ownerId),
}));

export const visionLockdownEvents = sqliteTable("vision_lockdown_events", {
  id: text("id").primaryKey(),
  lockdownId: text("lockdown_id").notNull().unique(),
  scope: text("scope").notNull().default("campus_wide"), // 'campus_wide' | 'facility' | 'zone' | 'floor'
  targetFacilityId: text("target_facility_id"),
  targetZoneId: text("target_zone_id"),
  triggerReason: text("trigger_reason").notNull(),
  triggeredByUserId: text("triggered_by_user_id").notNull(),
  status: text("status").notNull().default("active"), // 'active' | 'all_clear' | 'cancelled'
  doorsLockedCount: integer("doors_locked_count").notNull().default(0),
  egressPathsIlluminated: integer("egress_paths_illuminated", { mode: "boolean" }).notNull().default(true),
  ecoMeshIslandingTriggered: integer("eco_mesh_islanding_triggered", { mode: "boolean" }).notNull().default(false),
  triggeredAt: text("triggered_at").notNull(),
  allClearAt: text("all_clear_at"),
  merkleAuditHash: text("merkle_audit_hash").notNull().default(""),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  visionLockdownIdIdx: index("idx_vision_lockdown_id").on(t.lockdownId),
  visionLockdownScopeIdx: index("idx_vision_lockdown_scope").on(t.scope),
  visionLockdownStatusIdx: index("idx_vision_lockdown_status").on(t.status),
  visionLockdownTimeIdx: index("idx_vision_lockdown_time").on(t.triggeredAt),
}));

export const visionPrivacyAuditLogs = sqliteTable("vision_privacy_audit_logs", {
  id: text("id").primaryKey(),
  auditId: text("audit_id").notNull().unique(),
  eventType: text("event_type").notNull().default("face_redaction"), // 'face_redaction' | 'plate_redaction' | 'consent_revoked' | 'rolling_purge' | 'dual_auth_deanon'
  cameraId: text("camera_id"),
  subjectType: text("subject_type").notNull().default("student"), // 'student' | 'staff' | 'visitor'
  facesRedactedCount: integer("faces_redacted_count").notNull().default(0),
  platesRedactedCount: integer("plates_redacted_count").notNull().default(0),
  authorizedByShare1: text("authorized_by_share1"),
  authorizedByShare2: text("authorized_by_share2"),
  deanonReason: text("deanon_reason"),
  privacyNoiseEpsilon: real("privacy_noise_epsilon").notNull().default(1.0),
  auditTimestamp: text("audit_timestamp").notNull(),
  merkleProof: text("merkle_proof").notNull().default(""),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  visionPrivacyAuditIdIdx: index("idx_vision_privacy_audit_id").on(t.auditId),
  visionPrivacyTypeIdx: index("idx_vision_privacy_type").on(t.eventType),
  visionPrivacyCamIdx: index("idx_vision_privacy_cam").on(t.cameraId),
  visionPrivacyTimeIdx: index("idx_vision_privacy_time").on(t.auditTimestamp),
}));

// ─── ADVISE-MESH / CognitiveDegree OS: Curricular Graph & Autonomous Advising (Sprint-051) ───

export const curriculumPrograms = sqliteTable("curriculum_programs", {
  id: text("id").primaryKey(),
  programCode: text("program_code").notNull().unique(),
  title: text("title").notNull(),
  departmentId: text("department_id").references(() => departments.id),
  degreeType: text("degree_type").notNull().default("bachelor"), // 'bachelor' | 'master' | 'doctorate' | 'associate' | 'diploma'
  totalCreditsRequired: integer("total_credits_required").notNull().default(120),
  minimumGpa: real("minimum_gpa").notNull().default(2.0),
  catalogYear: text("catalog_year").notNull().default("2026-2027"),
  status: text("status").notNull().default("active"), // 'active' | 'archived' | 'draft'
  curriculumComplexityIndex: real("curriculum_complexity_index").notNull().default(0.0),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  curriculumProgCodeIdx: index("idx_curriculum_prog_code").on(t.programCode),
  curriculumProgDeptIdx: index("idx_curriculum_prog_dept").on(t.departmentId),
  curriculumProgYearIdx: index("idx_curriculum_prog_year").on(t.catalogYear),
  curriculumProgStatusIdx: index("idx_curriculum_prog_status").on(t.status),
}));

export const curriculumCourses = sqliteTable("curriculum_courses", {
  id: text("id").primaryKey(),
  courseCode: text("course_code").notNull(),
  title: text("title").notNull(),
  departmentId: text("department_id").references(() => departments.id),
  credits: integer("credits").notNull().default(3),
  level: integer("level").notNull().default(100),
  courseType: text("course_type").notNull().default("major_core"), // 'major_core' | 'major_elective' | 'gen_ed' | 'open_elective'
  minGrade: text("min_grade").notNull().default("D"),
  typicalTerm: integer("typical_term").notNull().default(1),
  historicalPassRate: real("historical_pass_rate").notNull().default(0.85),
  blockingFactor: integer("blocking_factor").notNull().default(0),
  description: text("description"),
  syllabusEmbedding: text("syllabus_embedding"),
  status: text("status").notNull().default("active"), // 'active' | 'archived'
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  curriculumCourseCodeIdx: index("idx_curriculum_course_code").on(t.courseCode),
  curriculumCourseDeptIdx: index("idx_curriculum_course_dept").on(t.departmentId),
  curriculumCourseLevelIdx: index("idx_curriculum_course_level").on(t.level),
  curriculumCourseTypeIdx: index("idx_curriculum_course_type").on(t.courseType),
  curriculumCourseInstIdx: index("idx_curriculum_course_inst").on(t.institutionId),
}));

export const curriculumPrerequisites = sqliteTable("curriculum_prerequisites", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => curriculumCourses.id, { onDelete: "cascade" }),
  prerequisiteCourseId: text("prerequisite_course_id").notNull().references(() => curriculumCourses.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("hard_prerequisite"), // 'hard_prerequisite' | 'corequisite' | 'advisory'
  minimumGrade: text("minimum_grade").notNull().default("C"),
  concurrencyAllowed: integer("concurrency_allowed", { mode: "boolean" }).notNull().default(false),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  curriculumPrereqCourseIdx: index("idx_curriculum_prereq_course").on(t.courseId),
  curriculumPrereqTargetIdx: index("idx_curriculum_prereq_target").on(t.prerequisiteCourseId),
  curriculumPrereqTypeIdx: index("idx_curriculum_prereq_type").on(t.type),
}));

export const curriculumDegreePlans = sqliteTable("curriculum_degree_plans", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().unique(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  programId: text("program_id").notNull().references(() => curriculumPrograms.id),
  title: text("title").notNull().default("Primary Degree Plan"),
  targetGraduationTerm: text("target_graduation_term").notNull().default("Spring 2030"),
  totalTerms: integer("total_terms").notNull().default(8),
  status: text("status").notNull().default("draft"), // 'draft' | 'submitted' | 'approved' | 'superseded'
  approvedByAdvisorId: text("approved_by_advisor_id").references(() => staff.id),
  approvedAt: text("approved_at"),
  merkleAuditHash: text("merkle_audit_hash").notNull().default(""),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  curriculumPlanIdIdx: index("idx_curriculum_plan_id").on(t.planId),
  curriculumPlanStudentIdx: index("idx_curriculum_plan_student").on(t.studentId),
  curriculumPlanProgramIdx: index("idx_curriculum_plan_program").on(t.programId),
  curriculumPlanStatusIdx: index("idx_curriculum_plan_status").on(t.status),
}));

export const curriculumPlanCourses = sqliteTable("curriculum_plan_courses", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => curriculumDegreePlans.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => curriculumCourses.id),
  plannedTermIndex: integer("planned_term_index").notNull(),
  termName: text("term_name").notNull(),
  credits: integer("credits").notNull().default(3),
  status: text("status").notNull().default("planned"), // 'planned' | 'enrolled' | 'completed' | 'waived' | 'dropped'
  gradeReceived: text("grade_received"),
  isPrerequisiteSatisfied: integer("is_prerequisite_satisfied", { mode: "boolean" }).notNull().default(true),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  curriculumPlanCoursePlanIdx: index("idx_curriculum_plancourse_plan").on(t.planId),
  curriculumPlanCourseCourseIdx: index("idx_curriculum_plancourse_course").on(t.courseId),
  curriculumPlanCourseTermIdx: index("idx_curriculum_plancourse_term").on(t.plannedTermIndex),
  curriculumPlanCourseStatusIdx: index("idx_curriculum_plancourse_status").on(t.status),
}));

export const curriculumTransferArticulations = sqliteTable("curriculum_transfer_articulations", {
  id: text("id").primaryKey(),
  articulationId: text("articulation_id").notNull().unique(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  sourceInstitution: text("source_institution").notNull(),
  sourceCourseCode: text("source_course_code").notNull(),
  sourceCourseTitle: text("source_course_title").notNull(),
  sourceCredits: real("source_credits").notNull().default(3.0),
  sourceGrade: text("source_grade").notNull(),
  targetCourseId: text("target_course_id").references(() => curriculumCourses.id),
  semanticMatchScore: real("semantic_match_score").notNull().default(0.0),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'faculty_review'
  reviewedByStaffId: text("reviewed_by_staff_id").references(() => staff.id),
  reviewedAt: text("reviewed_at"),
  waiverReason: text("waiver_reason"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  curriculumTransferArtIdIdx: index("idx_curriculum_transfer_art_id").on(t.articulationId),
  curriculumTransferStudentIdx: index("idx_curriculum_transfer_student").on(t.studentId),
  curriculumTransferStatusIdx: index("idx_curriculum_transfer_status").on(t.status),
}));

export const curriculumAdvisingSessions = sqliteTable("curriculum_advising_sessions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  activeDomain: text("active_domain").notNull().default("degree_planner"), // 'degree_planner' | 'career_alignment' | 'transfer_articulation' | 'financial_aid_load' | 'academic_recovery'
  status: text("status").notNull().default("active"), // 'active' | 'resolved' | 'handed_off_to_human'
  assignedCounselorId: text("assigned_counselor_id").references(() => staff.id),
  sessionSummary: text("session_summary"),
  proposedChangesJson: text("proposed_changes_json"),
  confidenceScore: real("confidence_score").notNull().default(0.9),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  curriculumAdvisingSessionIdIdx: index("idx_curriculum_advsession_id").on(t.sessionId),
  curriculumAdvisingStudentIdx: index("idx_curriculum_advsession_student").on(t.studentId),
  curriculumAdvisingDomainIdx: index("idx_curriculum_advsession_domain").on(t.activeDomain),
  curriculumAdvisingStatusIdx: index("idx_curriculum_advsession_status").on(t.status),
}));

export const curriculumAdvisingMessages = sqliteTable("curriculum_advising_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => curriculumAdvisingSessions.id, { onDelete: "cascade" }),
  senderType: text("sender_type").notNull(), // 'student' | 'agent' | 'human_advisor' | 'system'
  agentDomain: text("agent_domain"), // 'degree_planner' | 'career_alignment' | etc.
  messageContent: text("message_content").notNull(),
  citationsJson: text("citations_json"),
  roadmapActionJson: text("roadmap_action_json"),
  tokenCount: integer("token_count").notNull().default(0),
  sentAt: text("sent_at").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  curriculumAdvMessageSessionIdx: index("idx_curriculum_advmsg_session").on(t.sessionId),
  curriculumAdvMessageSenderIdx: index("idx_curriculum_advmsg_sender").on(t.senderType),
  curriculumAdvMessageTimeIdx: index("idx_curriculum_advmsg_time").on(t.sentAt),
}));

export const curriculumRetentionAlerts = sqliteTable("curriculum_retention_alerts", {
  id: text("id").primaryKey(),
  alertId: text("alert_id").notNull().unique(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  riskTier: text("risk_tier").notNull().default("medium"), // 'critical' | 'high' | 'medium' | 'low'
  riskScore: real("risk_score").notNull().default(0.5),
  contributingFactorsJson: text("contributing_factors_json").notNull(),
  recommendedInterventionJson: text("recommended_intervention_json"),
  status: text("status").notNull().default("open"), // 'open' | 'triaged' | 'in_intervention' | 'resolved' | 'dismissed'
  assignedCounselorId: text("assigned_counselor_id").references(() => staff.id),
  engageOsDispatched: integer("engage_os_dispatched", { mode: "boolean" }).notNull().default(false),
  lastContactedAt: text("last_contacted_at"),
  resolvedAt: text("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  curriculumAlertIdIdx: index("idx_curriculum_alert_id").on(t.alertId),
  curriculumAlertStudentIdx: index("idx_curriculum_alert_student").on(t.studentId),
  curriculumAlertRiskIdx: index("idx_curriculum_alert_risk").on(t.riskTier),
  curriculumAlertStatusIdx: index("idx_curriculum_alert_status").on(t.status),
}));

export const curriculumAuditLogs = sqliteTable("curriculum_audit_logs", {
  id: text("id").primaryKey(),
  auditId: text("audit_id").notNull().unique(),
  actionType: text("action_type").notNull(), // 'plan_approved' | 'prerequisite_waived' | 'course_substituted' | 'transfer_approved' | 'retention_overridden'
  targetStudentId: text("target_student_id").references(() => students.id),
  planId: text("plan_id").references(() => curriculumDegreePlans.id),
  performedByUserId: text("performed_by_user_id").notNull(),
  actorRole: text("actor_role").notNull(),
  previousState: text("previous_state"),
  newState: text("new_state"),
  justification: text("justification"),
  merkleProof: text("merkle_proof").notNull().default(""),
  merkleAuditHash: text("merkle_audit_hash").notNull().default(""),
  auditTimestamp: text("audit_timestamp").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  curriculumAuditIdIdx: index("idx_curriculum_audit_id").on(t.auditId),
  curriculumAuditActionIdx: index("idx_curriculum_audit_action").on(t.actionType),
  curriculumAuditStudentIdx: index("idx_curriculum_audit_student").on(t.targetStudentId),
  curriculumAuditTimeIdx: index("idx_curriculum_audit_time").on(t.auditTimestamp),
}));

// ==========================================
// FACILITY-MIND / SmartCampus OS (Sprint-052)
// ==========================================

export const facilityEquipment = sqliteTable("facility_equipment", {
  id: text("id").primaryKey(),
  assetTag: text("asset_tag").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull().default("hvac"), // 'hvac' | 'elevator' | 'plumbing' | 'electrical' | 'generator' | 'fire_safety'
  buildingId: text("building_id").notNull(),
  floorId: text("floor_id").notNull(),
  roomId: text("room_id"),
  spatialCoordinatesJson: text("spatial_coordinates_json"), // { x, y, z }
  manufacturer: text("manufacturer"),
  modelNumber: text("model_number"),
  serialNumber: text("serial_number"),
  installDate: text("install_date"),
  warrantyExpiry: text("warranty_expiry"),
  status: text("status").notNull().default("operational"), // 'operational' | 'degraded' | 'offline' | 'maintenance'
  criticality: text("criticality").notNull().default("medium"), // 'critical' | 'high' | 'medium' | 'low'
  healthScore: real("health_score").notNull().default(100.0),
  metadataJson: text("metadata_json"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  facilityEquipAssetTagIdx: index("idx_facility_equip_asset_tag").on(t.assetTag),
  facilityEquipCategoryIdx: index("idx_facility_equip_category").on(t.category),
  facilityEquipBuildingIdx: index("idx_facility_equip_building").on(t.buildingId),
  facilityEquipStatusIdx: index("idx_facility_equip_status").on(t.status),
  facilityEquipInstitutionIdx: index("idx_facility_equip_institution").on(t.institutionId),
}));

export const facilityTelemetrySensors = sqliteTable("facility_telemetry_sensors", {
  id: text("id").primaryKey(),
  sensorId: text("sensor_id").notNull().unique(),
  equipmentId: text("equipment_id").notNull().references(() => facilityEquipment.id, { onDelete: "cascade" }),
  sensorType: text("sensor_type").notNull().default("temperature"), // 'temperature' | 'vibration' | 'pressure' | 'flow_rate' | 'power_draw' | 'filter_delta_p' | 'refrigerant_pressure' | 'runtime_hours'
  sensorModel: text("sensor_model"),
  protocol: text("protocol").notNull().default("mqtt"), // 'mqtt' | 'modbus' | 'bacnet' | 'rest'
  endpointUrl: text("endpoint_url"),
  pollingIntervalSec: integer("polling_interval_sec").notNull().default(60),
  unit: text("unit").notNull().default("celsius"),
  minThreshold: real("min_threshold"),
  maxThreshold: real("max_threshold"),
  deadbandPercent: real("deadband_percent").notNull().default(1.5),
  status: text("status").notNull().default("active"), // 'active' | 'warning' | 'critical' | 'offline'
  lastReadingValue: real("last_reading_value"),
  lastReadingAt: text("last_reading_at"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  facilitySensorIdIdx: index("idx_facility_sensor_id").on(t.sensorId),
  facilitySensorEquipIdx: index("idx_facility_sensor_equip").on(t.equipmentId),
  facilitySensorTypeIdx: index("idx_facility_sensor_type").on(t.sensorType),
  facilitySensorStatusIdx: index("idx_facility_sensor_status").on(t.status),
}));

export const facilitySensorReadings = sqliteTable("facility_sensor_readings", {
  id: text("id").primaryKey(),
  readingId: text("reading_id").notNull().unique(),
  sensorId: text("sensor_id").notNull().references(() => facilityTelemetrySensors.id, { onDelete: "cascade" }),
  equipmentId: text("equipment_id").notNull().references(() => facilityEquipment.id, { onDelete: "cascade" }),
  readingValue: real("reading_value").notNull(),
  unit: text("unit").notNull().default("celsius"),
  anomalyScore: real("anomaly_score").notNull().default(0.0),
  isAnomaly: integer("is_anomaly", { mode: "boolean" }).notNull().default(false),
  rawPayloadJson: text("raw_payload_json"),
  recordedAt: text("recorded_at").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  facilityReadingIdIdx: index("idx_facility_reading_id").on(t.readingId),
  facilityReadingSensorIdx: index("idx_facility_reading_sensor").on(t.sensorId),
  facilityReadingEquipIdx: index("idx_facility_reading_equip").on(t.equipmentId),
  facilityReadingRecordedIdx: index("idx_facility_reading_recorded").on(t.recordedAt),
  facilityReadingAnomalyIdx: index("idx_facility_reading_anomaly").on(t.isAnomaly),
}));

export const facilityPredictiveModels = sqliteTable("facility_predictive_models", {
  id: text("id").primaryKey(),
  modelId: text("model_id").notNull().unique(),
  equipmentCategory: text("equipment_category").notNull(),
  modelType: text("model_type").notNull(), // 'statistical_drift' | 'vibration_fft' | 'thermal_degradation' | 'rul_estimator'
  version: text("version").notNull().default("1.0.0"),
  status: text("status").notNull().default("active"), // 'active' | 'training' | 'deprecated'
  accuracyMetricsJson: text("accuracy_metrics_json"),
  hyperparametersJson: text("hyperparameters_json"),
  weightsPath: text("weights_path"),
  lastTrainedAt: text("last_trained_at"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  facilityModelIdIdx: index("idx_facility_model_id").on(t.modelId),
  facilityModelCategoryIdx: index("idx_facility_model_category").on(t.equipmentCategory),
  facilityModelTypeIdx: index("idx_facility_model_type").on(t.modelType),
}));

export const facilityAnomalyAlerts = sqliteTable("facility_anomaly_alerts", {
  id: text("id").primaryKey(),
  alertId: text("alert_id").notNull().unique(),
  equipmentId: text("equipment_id").notNull().references(() => facilityEquipment.id, { onDelete: "cascade" }),
  sensorId: text("sensor_id").references(() => facilityTelemetrySensors.id),
  alertType: text("alert_type").notNull().default("sensor_drift"),
  severity: text("severity").notNull().default("medium"), // 'critical' | 'high' | 'medium' | 'low'
  anomalyScore: real("anomaly_score").notNull().default(0.5),
  predictedFailureMode: text("predicted_failure_mode"),
  estimatedRulHours: real("estimated_rul_hours"),
  rootCauseHypothesis: text("root_cause_hypothesis"),
  status: text("status").notNull().default("open"), // 'open' | 'acknowledged' | 'triaged' | 'work_order_created' | 'resolved' | 'false_positive'
  acknowledgedByStaffId: text("acknowledged_by_staff_id").references(() => staff.id),
  acknowledgedAt: text("acknowledged_at"),
  resolutionNotes: text("resolution_notes"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  facilityAlertIdIdx: index("idx_facility_alert_id").on(t.alertId),
  facilityAlertEquipIdx: index("idx_facility_alert_equip").on(t.equipmentId),
  facilityAlertSeverityIdx: index("idx_facility_alert_severity").on(t.severity),
  facilityAlertStatusIdx: index("idx_facility_alert_status").on(t.status),
}));

export const facilityWorkOrders = sqliteTable("facility_work_orders", {
  id: text("id").primaryKey(),
  workOrderNumber: text("work_order_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull().default("routine"), // 'emergency' | 'urgent' | 'routine' | 'preventive'
  category: text("category").notNull().default("general"), // 'electrical' | 'hvac' | 'plumbing' | 'mechanical' | 'elevator' | 'general'
  status: text("status").notNull().default("draft"), // 'draft' | 'scheduled' | 'assigned' | 'in_progress' | 'pending_parts' | 'completed' | 'verified' | 'cancelled'
  equipmentId: text("equipment_id").references(() => facilityEquipment.id),
  anomalyAlertId: text("anomaly_alert_id").references(() => facilityAnomalyAlerts.id),
  buildingId: text("building_id").notNull(),
  floorId: text("floor_id").notNull(),
  roomId: text("room_id"),
  spatialRouteDataJson: text("spatial_route_data_json"),
  assignedTechnicianId: text("assigned_technician_id").references(() => staff.id),
  assignedContractorId: text("assigned_contractor_id"),
  estimatedDurationMinutes: integer("estimated_duration_minutes").notNull().default(60),
  actualDurationMinutes: integer("actual_duration_minutes"),
  scheduledStartTime: text("scheduled_start_time"),
  scheduledEndTime: text("scheduled_end_time"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  verifiedAt: text("verified_at"),
  verifiedByStaffId: text("verified_by_staff_id").references(() => staff.id),
  resolutionSummary: text("resolution_summary"),
  technicianSignature: text("technician_signature"),
  photoEvidenceJson: text("photo_evidence_json"),
  merkleAuditHash: text("merkle_audit_hash").notNull().default(""),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  facilityWoNumberIdx: index("idx_facility_wo_number").on(t.workOrderNumber),
  facilityWoEquipIdx: index("idx_facility_wo_equip").on(t.equipmentId),
  facilityWoStatusIdx: index("idx_facility_wo_status").on(t.status),
  facilityWoPriorityIdx: index("idx_facility_wo_priority").on(t.priority),
  facilityWoTechIdx: index("idx_facility_wo_tech").on(t.assignedTechnicianId),
}));

export const facilityPartsInventory = sqliteTable("facility_parts_inventory", {
  id: text("id").primaryKey(),
  partNumber: text("part_number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("filters"), // 'filters' | 'belts' | 'lubricants' | 'bearings' | 'valves' | 'electrical' | 'general'
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  quantityReserved: integer("quantity_reserved").notNull().default(0),
  reorderThreshold: integer("reorder_threshold").notNull().default(5),
  targetStockLevel: integer("target_stock_level").notNull().default(20),
  unitCost: real("unit_cost").notNull().default(0.0),
  supplierName: text("supplier_name"),
  leadTimeDays: integer("lead_time_days").notNull().default(3),
  compatibleEquipmentCategories: text("compatible_equipment_categories"),
  locationBin: text("location_bin"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  facilityPartNumberIdx: index("idx_facility_part_number").on(t.partNumber),
  facilityPartCategoryIdx: index("idx_facility_part_category").on(t.category),
  facilityPartStockIdx: index("idx_facility_part_stock").on(t.quantityOnHand),
}));

export const facilityWorkOrderParts = sqliteTable("facility_work_order_parts", {
  id: text("id").primaryKey(),
  workOrderId: text("work_order_id").notNull().references(() => facilityWorkOrders.id, { onDelete: "cascade" }),
  partId: text("part_id").notNull().references(() => facilityPartsInventory.id, { onDelete: "cascade" }),
  quantityRequired: integer("quantity_required").notNull().default(1),
  quantityUsed: integer("quantity_used").notNull().default(0),
  unitCostAtTime: real("unit_cost_at_time").notNull().default(0.0),
  status: text("status").notNull().default("allocated"), // 'allocated' | 'consumed' | 'returned'
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  facilityWoPartWoIdx: index("idx_facility_wopart_wo").on(t.workOrderId),
  facilityWoPartPartIdx: index("idx_facility_wopart_part").on(t.partId),
  facilityWoPartStatusIdx: index("idx_facility_wopart_status").on(t.status),
}));

export const facilityContractorRegistry = sqliteTable("facility_contractor_registry", {
  id: text("id").primaryKey(),
  contractorId: text("contractor_id").notNull().unique(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  specializationsJson: text("specializations_json").notNull(),
  ratePerHour: real("rate_per_hour").notNull().default(75.0),
  slaEmergencyHours: integer("sla_emergency_hours").notNull().default(2),
  slaRoutineHours: integer("sla_routine_hours").notNull().default(24),
  performanceRating: real("performance_rating").notNull().default(5.0),
  activeInsuranceExpiry: text("active_insurance_expiry"),
  status: text("status").notNull().default("active"), // 'active' | 'inactive' | 'suspended'
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  facilityContractorIdIdx: index("idx_facility_contractor_id").on(t.contractorId),
  facilityContractorStatusIdx: index("idx_facility_contractor_status").on(t.status),
  facilityContractorRatingIdx: index("idx_facility_contractor_rating").on(t.performanceRating),
}));

export const facilityAuditLogs = sqliteTable("facility_audit_logs", {
  id: text("id").primaryKey(),
  auditId: text("audit_id").notNull().unique(),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(), // 'work_order_created' | 'work_order_completed' | 'technician_assigned' | 'load_shed_executed' | 'safety_override_applied' | 'parts_reordered'
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  prevMerkleRoot: text("prev_merkle_root").notNull().default(""),
  merkleRoot: text("merkle_root").notNull().default(""),
  timestamp: text("timestamp").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  facilityAuditIdIdx: index("idx_facility_audit_id").on(t.auditId),
  facilityAuditActionIdx: index("idx_facility_audit_action").on(t.action),
  facilityAuditEntityIdx: index("idx_facility_audit_entity").on(t.entityType, t.entityId),
  facilityAuditTimeIdx: index("idx_facility_audit_time").on(t.timestamp),
}));

// ─── Sprint-053: Autonomous Research Computing & High-Performance AI Cluster Orchestrator (NEURO-CLUSTER / ResearchCompute OS) ───

export const neuroClusters = sqliteTable("neuro_clusters", {
  id: text("id").primaryKey(),
  clusterId: text("cluster_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  clusterType: text("cluster_type").notNull().default("hybrid"), // 'on_premise' | 'cloud' | 'hybrid'
  schedulerType: text("scheduler_type").notNull().default("slurm"), // 'slurm' | 'k8s' | 'native'
  region: text("region").notNull().default("local-dc-1"),
  totalNodes: integer("total_nodes").notNull().default(0),
  totalGpus: integer("total_gpus").notNull().default(0),
  activeJobsCount: integer("active_jobs_count").notNull().default(0),
  status: text("status").notNull().default("active"), // 'active' | 'maintenance' | 'degraded' | 'offline'
  networkTopology: text("network_topology").notNull().default("infiniband_fat_tree"), // 'infiniband_fat_tree' | 'roce_v2' | 'ethernet_100g'
  configJson: text("config_json"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroClusterIdIdx: index("idx_neuro_cluster_id").on(t.clusterId),
  neuroClusterStatusIdx: index("idx_neuro_cluster_status").on(t.status),
  neuroClusterTypeIdx: index("idx_neuro_cluster_type").on(t.clusterType),
}));

export const neuroNodes = sqliteTable("neuro_nodes", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull().unique(),
  clusterId: text("cluster_id").notNull().references(() => neuroClusters.id, { onDelete: "cascade" }),
  hostname: text("hostname").notNull(),
  ipAddress: text("ip_address").notNull(),
  rackLocation: text("rack_location"), // e.g. "RACK-DC1-A4"
  chassisSlot: integer("chassis_slot"),
  nodeType: text("node_type").notNull().default("compute"), // 'compute' | 'head_node' | 'storage' | 'login'
  cpuCores: integer("cpu_cores").notNull().default(64),
  ramBytes: real("ram_bytes").notNull().default(549755813888), // 512GB
  gpuCount: integer("gpu_count").notNull().default(8),
  gpuModel: text("gpu_model").notNull().default("NVIDIA-H100-SXM5-80GB"),
  status: text("status").notNull().default("ready"), // 'ready' | 'busy' | 'draining' | 'cordoned' | 'offline'
  isCloudBurst: integer("is_cloud_burst", { mode: "boolean" }).notNull().default(false),
  cloudProvider: text("cloud_provider").notNull().default("on_prem"), // 'aws' | 'gcp' | 'runpod' | 'on_prem'
  spotInstanceId: text("spot_instance_id"),
  currentPowerWatts: real("current_power_watts").notNull().default(0.0),
  temperatureCelsius: real("temperature_celsius").notNull().default(35.0),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroNodeIdIdx: index("idx_neuro_node_id").on(t.nodeId),
  neuroNodeClusterIdx: index("idx_neuro_node_cluster").on(t.clusterId),
  neuroNodeStatusIdx: index("idx_neuro_node_status").on(t.status),
  neuroNodeCloudIdx: index("idx_neuro_node_cloud").on(t.isCloudBurst),
}));

export const neuroGpus = sqliteTable("neuro_gpus", {
  id: text("id").primaryKey(),
  gpuId: text("gpu_id").notNull().unique(),
  nodeId: text("node_id").notNull().references(() => neuroNodes.id, { onDelete: "cascade" }),
  gpuIndex: integer("gpu_index").notNull().default(0),
  model: text("model").notNull().default("NVIDIA-H100-SXM5-80GB"),
  vramTotalBytes: real("vram_total_bytes").notNull().default(85899345920), // 80GB
  vramAllocatedBytes: real("vram_allocated_bytes").notNull().default(0),
  utilizationPercent: real("utilization_percent").notNull().default(0.0),
  temperatureCelsius: real("temperature_celsius").notNull().default(40.0),
  powerDrawWatts: real("power_draw_watts").notNull().default(150.0),
  smClockMhz: integer("sm_clock_mhz").notNull().default(1980),
  memoryClockMhz: integer("memory_clock_mhz").notNull().default(1593),
  pcieBandwidthGbps: real("pcie_bandwidth_gbps").notNull().default(64.0),
  nvlinkActive: integer("nvlink_active", { mode: "boolean" }).notNull().default(true),
  numaNode: integer("numa_node").notNull().default(0),
  status: text("status").notNull().default("idle"), // 'idle' | 'allocated' | 'error' | 'offline'
  currentJobId: text("current_job_id"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroGpuIdIdx: index("idx_neuro_gpu_id").on(t.gpuId),
  neuroGpuNodeIdx: index("idx_neuro_gpu_node").on(t.nodeId),
  neuroGpuStatusIdx: index("idx_neuro_gpu_status").on(t.status),
  neuroGpuJobIdx: index("idx_neuro_gpu_job").on(t.currentJobId),
}));

export const neuroJobs = sqliteTable("neuro_jobs", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().unique(),
  jobName: text("job_name").notNull(),
  userId: text("user_id").notNull().references(() => staff.id),
  departmentId: text("department_id").notNull(),
  grantId: text("grant_id"),
  clusterId: text("cluster_id").notNull().references(() => neuroClusters.id),
  jobType: text("job_type").notNull().default("distributed_training"), // 'interactive_notebook' | 'batch_training' | 'distributed_training' | 'inference_service' | 'eval_benchmark'
  priority: text("priority").notNull().default("normal"), // 'low' | 'normal' | 'high' | 'urgent' | 'preemptible'
  status: text("status").notNull().default("pending"), // 'pending' | 'queued' | 'running' | 'checkpointing' | 'completed' | 'failed' | 'cancelled' | 'preempted'
  requestedGpus: integer("requested_gpus").notNull().default(1),
  gpuModelRequirement: text("gpu_model_requirement").notNull().default("ANY"), // 'NVIDIA-H100' | 'NVIDIA-A100' | 'NVIDIA-L40S' | 'ANY'
  minVramBytes: real("min_vram_bytes").notNull().default(25769803776), // 24GB
  containerImage: text("container_image").notNull().default("pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime"),
  entrypointCommand: text("entrypoint_command").notNull().default("python train.py"),
  allocatedNodesJson: text("allocated_nodes_json"), // array of node IDs
  allocatedGpuIdsJson: text("allocated_gpu_ids_json"), // array of GPU IDs
  queuedAt: text("queued_at"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  runtimeSeconds: integer("runtime_seconds").notNull().default(0),
  exitCode: integer("exit_code"),
  errorMessage: text("error_message"),
  tokensCostTotal: real("tokens_cost_total").notNull().default(0.0),
  carbonSavedKg: real("carbon_saved_kg").notNull().default(0.0),
  merkleProofHash: text("merkle_proof_hash").notNull().default(""),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroJobIdIdx: index("idx_neuro_job_id").on(t.jobId),
  neuroJobUserIdx: index("idx_neuro_job_user").on(t.userId),
  neuroJobDeptIdx: index("idx_neuro_job_dept").on(t.departmentId),
  neuroJobStatusIdx: index("idx_neuro_job_status").on(t.status),
  neuroJobClusterIdx: index("idx_neuro_job_cluster").on(t.clusterId),
}));

export const neuroJobCheckpoints = sqliteTable("neuro_job_checkpoints", {
  id: text("id").primaryKey(),
  checkpointId: text("checkpoint_id").notNull().unique(),
  jobId: text("job_id").notNull().references(() => neuroJobs.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull().default(0),
  epochNumber: integer("epoch_number").notNull().default(0),
  lossValue: real("loss_value"),
  metricsJson: text("metrics_json"),
  storageUri: text("storage_uri").notNull(),
  fileSizeBytes: real("file_size_bytes").notNull().default(0),
  sha256Hash: text("sha256_hash").notNull(),
  isPreemptionEmergency: integer("is_preemption_emergency", { mode: "boolean" }).notNull().default(false),
  restoredCount: integer("restored_count").notNull().default(0),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroCheckpointIdIdx: index("idx_neuro_checkpoint_id").on(t.checkpointId),
  neuroCheckpointJobIdx: index("idx_neuro_checkpoint_job").on(t.jobId),
  neuroCheckpointHashIdx: index("idx_neuro_checkpoint_hash").on(t.sha256Hash),
}));

export const neuroFairShareQuotas = sqliteTable("neuro_fair_share_quotas", {
  id: text("id").primaryKey(),
  departmentId: text("department_id").notNull().unique(),
  departmentName: text("department_name").notNull(),
  allocatedShareWeight: real("allocated_share_weight").notNull().default(1.0), // target proportion
  maxConcurrentGpus: integer("max_concurrent_gpus").notNull().default(16),
  historicalUsageDecayed: real("historical_usage_decayed").notNull().default(0.0), // half-life decaying metric
  fairShareScore: real("fair_share_score").notNull().default(1.0), // shareWeight / (historicalUsage + 1)
  activeAllocatedGpus: integer("active_allocated_gpus").notNull().default(0),
  pendingJobsCount: integer("pending_jobs_count").notNull().default(0),
  halfLifeDecayFactor: real("half_life_decay_factor").notNull().default(0.95),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroQuotaDeptIdx: index("idx_neuro_quota_dept").on(t.departmentId),
  neuroQuotaScoreIdx: index("idx_neuro_quota_score").on(t.fairShareScore),
}));

export const neuroCloudProviders = sqliteTable("neuro_cloud_providers", {
  id: text("id").primaryKey(),
  providerKey: text("provider_key").notNull().unique(), // 'aws' | 'gcp' | 'runpod'
  providerName: text("provider_name").notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  apiEndpoint: text("api_endpoint"),
  region: text("region").notNull().default("us-east-1"),
  maxSpotInstances: integer("max_spot_instances").notNull().default(10),
  currentActiveInstances: integer("current_active_instances").notNull().default(0),
  maxPriceUsdPerHour: real("max_price_usd_per_hour").notNull().default(4.50),
  autoArbitrageThresholdDelta: real("auto_arbitrage_threshold_delta").notNull().default(0.25), // 25% minimum savings
  interruptionGraceSeconds: integer("interruption_grace_seconds").notNull().default(120),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroProviderKeyIdx: index("idx_neuro_provider_key").on(t.providerKey),
  neuroProviderEnabledIdx: index("idx_neuro_provider_enabled").on(t.isEnabled),
}));

export const neuroSpotPriceHistory = sqliteTable("neuro_spot_price_history", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(), // 'aws' | 'gcp' | 'runpod'
  region: text("region").notNull(),
  gpuModel: text("gpu_model").notNull(),
  instanceType: text("instance_type").notNull(),
  spotPriceUsd: real("spot_price_usd").notNull(),
  onDemandPriceUsd: real("on_demand_price_usd").notNull(),
  discountPercent: real("discount_percent").notNull(),
  interruptionRiskScore: real("interruption_risk_score").notNull().default(0.1), // 0.0 - 1.0
  recordedAt: text("recorded_at").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroSpotProviderIdx: index("idx_neuro_spot_provider").on(t.provider),
  neuroSpotModelIdx: index("idx_neuro_spot_model").on(t.gpuModel),
  neuroSpotRecordedIdx: index("idx_neuro_spot_recorded").on(t.recordedAt),
}));

export const neuroDatasetProvenance = sqliteTable("neuro_dataset_provenance", {
  id: text("id").primaryKey(),
  datasetId: text("dataset_id").notNull().unique(),
  name: text("name").notNull(),
  version: text("version").notNull().default("1.0.0"),
  description: text("description"),
  sourceUri: text("source_uri").notNull(),
  fileCount: integer("file_count").notNull().default(1),
  totalSizeBytes: real("total_size_bytes").notNull().default(0),
  manifestSha256: text("manifest_sha256").notNull(),
  rootMerkleHash: text("root_merkle_hash").notNull(),
  license: text("license").notNull().default("MIT"),
  nsfNihGrantTagged: text("nsf_nih_grant_tagged"),
  containsPiiPhi: integer("contains_pii_phi", { mode: "boolean" }).notNull().default(false),
  isSealed: integer("is_sealed", { mode: "boolean" }).notNull().default(false),
  sealedAt: text("sealed_at"),
  sealedByUserId: text("sealed_by_user_id").references(() => staff.id),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroDatasetIdIdx: index("idx_neuro_dataset_id").on(t.datasetId),
  neuroDatasetSealedIdx: index("idx_neuro_dataset_sealed").on(t.isSealed),
  neuroDatasetGrantIdx: index("idx_neuro_dataset_grant").on(t.nsfNihGrantTagged),
}));

export const neuroMerkleLineageNodes = sqliteTable("neuro_merkle_lineage_nodes", {
  id: text("id").primaryKey(),
  nodeHash: text("node_hash").notNull().unique(),
  parentNodeHash: text("parent_node_hash"),
  entityType: text("entity_type").notNull(), // 'raw_dataset' | 'preprocessed_shard' | 'model_architecture' | 'hyperparameters' | 'training_epoch' | 'checkpoint_weights'
  entityId: text("entity_id").notNull(),
  jobId: text("job_id").references(() => neuroJobs.id),
  datasetId: text("dataset_id").references(() => neuroDatasetProvenance.id),
  metadataJson: text("metadata_json").notNull(),
  provOType: text("prov_o_type").notNull().default("prov:Entity"), // 'prov:Entity' | 'prov:Activity' | 'prov:Agent'
  inclusionProofJson: text("inclusion_proof_json"),
  timestamp: text("timestamp").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroLineageNodeHashIdx: index("idx_neuro_lineage_node_hash").on(t.nodeHash),
  neuroLineageParentIdx: index("idx_neuro_lineage_parent").on(t.parentNodeHash),
  neuroLineageJobIdx: index("idx_neuro_lineage_job").on(t.jobId),
  neuroLineageDatasetIdx: index("idx_neuro_lineage_dataset").on(t.datasetId),
}));

export const neuroComputeBillingAccounts = sqliteTable("neuro_compute_billing_accounts", {
  id: text("id").primaryKey(),
  accountNumber: text("account_number").notNull().unique(),
  departmentId: text("department_id").notNull(),
  grantId: text("grant_id"),
  grantTitle: text("grant_title"),
  principalInvestigatorId: text("principal_investigator_id").references(() => staff.id),
  tokenBalance: real("token_balance").notNull().default(1000.0),
  tokenAllocatedTotal: real("token_allocated_total").notNull().default(1000.0),
  tokenSpentTotal: real("token_spent_total").notNull().default(0.0),
  softCapPercent: real("soft_cap_percent").notNull().default(80.0),
  hardCapTokens: real("hard_cap_tokens").notNull().default(1000.0),
  isHardCapLocked: integer("is_hard_cap_locked", { mode: "boolean" }).notNull().default(false),
  expiresAt: text("expires_at"),
  status: text("status").notNull().default("active"), // 'active' | 'warning' | 'suspended' | 'expired'
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroBillingAccountIdx: index("idx_neuro_billing_account").on(t.accountNumber),
  neuroBillingDeptIdx: index("idx_neuro_billing_dept").on(t.departmentId),
  neuroBillingGrantIdx: index("idx_neuro_billing_grant").on(t.grantId),
  neuroBillingStatusIdx: index("idx_neuro_billing_status").on(t.status),
}));

export const neuroGrantCreditAllocations = sqliteTable("neuro_grant_credit_allocations", {
  id: text("id").primaryKey(),
  allocationId: text("allocation_id").notNull().unique(),
  accountId: text("account_id").notNull().references(() => neuroComputeBillingAccounts.id, { onDelete: "cascade" }),
  grantNumber: text("grant_number").notNull(),
  fundingAgency: text("funding_agency").notNull().default("NSF"), // 'NSF' | 'NIH' | 'DOE' | 'DARPA' | 'INSTITUTIONAL'
  creditedTokens: real("credited_tokens").notNull(),
  dollarEquivalentUsd: real("dollar_equivalent_usd").notNull(),
  allocatedByUserId: text("allocated_by_user_id").notNull().references(() => staff.id),
  effectiveDate: text("effective_date").notNull(),
  expiryDate: text("expiry_date").notNull(),
  auditNotes: text("audit_notes"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroAllocIdIdx: index("idx_neuro_alloc_id").on(t.allocationId),
  neuroAllocAccountIdx: index("idx_neuro_alloc_account").on(t.accountId),
  neuroAllocGrantIdx: index("idx_neuro_alloc_grant").on(t.grantNumber),
}));

export const neuroBillingLedgerTransactions = sqliteTable("neuro_billing_ledger_transactions", {
  id: text("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  accountId: text("account_id").notNull().references(() => neuroComputeBillingAccounts.id),
  jobId: text("job_id").references(() => neuroJobs.id),
  transactionType: text("transaction_type").notNull().default("compute_debit"), // 'compute_debit' | 'grant_credit' | 'quota_adjustment' | 'refund'
  tokensAmount: real("tokens_amount").notNull(),
  gpuSeconds: integer("gpu_seconds").notNull().default(0),
  gpuModelRateApplied: text("gpu_model_rate_applied"),
  debitAccountCode: text("debit_account_code").notNull().default("EXPENSE:GRANT_COMPUTE"),
  creditAccountCode: text("credit_account_code").notNull().default("REVENUE:HPC_CLUSTER_OPS"),
  balanceAfterTokens: real("balance_after_tokens").notNull(),
  description: text("description").notNull(),
  merkleLeafHash: text("merkle_leaf_hash").notNull().default(""),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroLedgerTxIdIdx: index("idx_neuro_ledger_tx_id").on(t.transactionId),
  neuroLedgerAccountIdx: index("idx_neuro_ledger_account").on(t.accountId),
  neuroLedgerJobIdx: index("idx_neuro_ledger_job").on(t.jobId),
  neuroLedgerTypeIdx: index("idx_neuro_ledger_type").on(t.transactionType),
}));

export const neuroAuditLogs = sqliteTable("neuro_audit_logs", {
  id: text("id").primaryKey(),
  auditId: text("audit_id").notNull().unique(),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(), // 'cluster_registered' | 'job_submitted' | 'job_preempted' | 'spot_arbitrage_burst' | 'grant_debited' | 'lineage_sealed'
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  prevMerkleRoot: text("prev_merkle_root").notNull().default(""),
  merkleRoot: text("merkle_root").notNull().default(""),
  timestamp: text("timestamp").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  neuroAuditIdIdx: index("idx_neuro_audit_id").on(t.auditId),
  neuroAuditActionIdx: index("idx_neuro_audit_action").on(t.action),
  neuroAuditEntityIdx: index("idx_neuro_audit_entity").on(t.entityType, t.entityId),
  neuroAuditTimeIdx: index("idx_neuro_audit_time").on(t.timestamp),
}));

// ─── Autonomous Institutional Procurement & Supply Chain Intelligence (SUPPLY-HIVE / ProcurementOS) ───

export const supplyVendors = sqliteTable("supply_vendors", {
  id: text("id").primaryKey(),
  vendorCode: text("vendor_code").notNull().unique(),
  name: text("name").notNull(),
  legalEntityName: text("legal_entity_name"),
  category: text("category").notNull(), // 'hardware' | 'facilities_maintenance' | 'lab_supplies' | 'office_consumables' | 'software_services' | 'logistics'
  taxId: text("tax_id").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  address: text("address"),
  city: text("city"),
  country: text("country").notNull().default("USA"),
  paymentTerms: text("payment_terms").notNull().default("NET_30"), // 'NET_15' | 'NET_30' | 'NET_60' | 'IMMEDIATE'
  onboardingStatus: text("onboarding_status").notNull().default("pending_verification"), // 'pending_verification' | 'approved' | 'restricted' | 'blocked'
  riskTier: text("risk_tier").notNull().default("low"), // 'low' | 'medium' | 'high' | 'critical'
  riskScore: real("risk_score").notNull().default(10.0),
  esgRating: text("esg_rating").notNull().default("A"), // 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC'
  esgScore: real("esg_score").notNull().default(75.0),
  isSanctionsClean: integer("is_sanctions_clean", { mode: "boolean" }).notNull().default(true),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyVendorCodeIdx: index("idx_supply_vendor_code").on(t.vendorCode),
  supplyVendorCategoryIdx: index("idx_supply_vendor_category").on(t.category),
  supplyVendorStatusIdx: index("idx_supply_vendor_status").on(t.onboardingStatus),
  supplyVendorRiskIdx: index("idx_supply_vendor_risk").on(t.riskTier),
}));

export const supplyVendorCertifications = sqliteTable("supply_vendor_certifications", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull().references(() => supplyVendors.id, { onDelete: "cascade" }),
  certType: text("cert_type").notNull(), // 'ISO_9001' | 'ISO_14001' | 'ISO_27001' | 'SOC2' | 'FAIR_LABOR' | 'CARBON_NEUTRAL' | 'MINORITY_OWNED'
  certNumber: text("cert_number").notNull(),
  issuingAuthority: text("issuing_authority").notNull(),
  issuedDate: text("issued_date").notNull(),
  expiryDate: text("expiry_date").notNull(),
  documentUrl: text("document_url"),
  verificationStatus: text("verification_status").notNull().default("verified"), // 'pending' | 'verified' | 'expired' | 'revoked'
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyCertVendorIdx: index("idx_supply_cert_vendor").on(t.vendorId),
  supplyCertTypeIdx: index("idx_supply_cert_type").on(t.certType),
  supplyCertStatusIdx: index("idx_supply_cert_status").on(t.verificationStatus),
}));

export const supplyVendorRiskAssessments = sqliteTable("supply_vendor_risk_assessments", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull().unique(),
  vendorId: text("vendor_id").notNull().references(() => supplyVendors.id, { onDelete: "cascade" }),
  overallRiskScore: real("overall_risk_score").notNull(),
  financialRiskScore: real("financial_risk_score").notNull().default(20.0),
  complianceRiskScore: real("compliance_risk_score").notNull().default(15.0),
  operationalRiskScore: real("operational_risk_score").notNull().default(25.0),
  sanctionsRegistryChecked: text("sanctions_registry_checked").notNull().default("OFAC_UN_EU"),
  sanctionsMatched: integer("sanctions_matched", { mode: "boolean" }).notNull().default(false),
  pepMatched: integer("pep_matched", { mode: "boolean" }).notNull().default(false),
  adverseMediaFindings: text("adverse_media_findings"),
  recommendedAction: text("recommended_action").notNull().default("approve"), // 'approve' | 'flag_for_review' | 'reject'
  assessedByUserId: text("assessed_by_user_id"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyRiskAssmtIdIdx: index("idx_supply_risk_assmt_id").on(t.assessmentId),
  supplyRiskVendorIdx: index("idx_supply_risk_vendor").on(t.vendorId),
  supplyRiskActionIdx: index("idx_supply_risk_action").on(t.recommendedAction),
}));

export const supplyVendorEsgScores = sqliteTable("supply_vendor_esg_scores", {
  id: text("id").primaryKey(),
  scoreId: text("score_id").notNull().unique(),
  vendorId: text("vendor_id").notNull().references(() => supplyVendors.id, { onDelete: "cascade" }),
  compositeEsgScore: real("composite_esg_score").notNull(),
  environmentalScore: real("environmental_score").notNull(),
  socialScore: real("social_score").notNull(),
  governanceScore: real("governance_score").notNull(),
  scope3CarbonIntensityKgPerUsd: real("scope3_carbon_intensity_kg_per_usd").notNull().default(0.15),
  recycledMaterialPercentage: real("recycled_material_percentage").notNull().default(0.0),
  fairLaborCertified: integer("fair_labor_certified", { mode: "boolean" }).notNull().default(false),
  ratingGrade: text("rating_grade").notNull().default("A"), // 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC'
  auditYear: integer("audit_year").notNull().default(2026),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyEsgScoreIdIdx: index("idx_supply_esg_score_id").on(t.scoreId),
  supplyEsgVendorIdx: index("idx_supply_esg_vendor").on(t.vendorId),
  supplyEsgGradeIdx: index("idx_supply_esg_grade").on(t.ratingGrade),
}));

export const supplyPurchaseRequisitions = sqliteTable("supply_purchase_requisitions", {
  id: text("id").primaryKey(),
  requisitionNumber: text("requisition_number").notNull().unique(),
  departmentId: text("department_id").notNull(),
  requesterId: text("requester_id").notNull().references(() => staff.id),
  sourceType: text("source_type").notNull().default("manual"), // 'manual' | 'facility_work_order' | 'neuro_hpc_compute' | 'predictive_reorder'
  sourceReferenceId: text("source_reference_id"),
  title: text("title").notNull(),
  urgency: text("urgency").notNull().default("standard"), // 'standard' | 'expedited' | 'emergency'
  estimatedTotalUsd: real("estimated_total_usd").notNull(),
  budgetCode: text("budget_code").notNull(),
  requiredByDate: text("required_by_date"),
  currentApprovalTier: text("current_approval_tier").notNull().default("hod"), // 'auto' | 'hod' | 'principal' | 'cfo_board' | 'approved' | 'rejected'
  status: text("status").notNull().default("draft"), // 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'converted_to_po' | 'cancelled'
  rejectionReason: text("rejection_reason"),
  approvedByUserId: text("approved_by_user_id"),
  approvedAt: text("approved_at"),
  notes: text("notes"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyReqNumberIdx: index("idx_supply_req_number").on(t.requisitionNumber),
  supplyReqDeptIdx: index("idx_supply_req_dept").on(t.departmentId),
  supplyReqStatusIdx: index("idx_supply_req_status").on(t.status),
  supplyReqTierIdx: index("idx_supply_req_tier").on(t.currentApprovalTier),
}));

export const supplyPurchaseOrders = sqliteTable("supply_purchase_orders", {
  id: text("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  requisitionId: text("requisition_id").references(() => supplyPurchaseRequisitions.id),
  vendorId: text("vendor_id").notNull().references(() => supplyVendors.id),
  departmentId: text("department_id").notNull(),
  orderDate: text("order_date").notNull(),
  expectedDeliveryDate: text("expected_delivery_date"),
  subtotalUsd: real("subtotal_usd").notNull(),
  taxAmountUsd: real("tax_amount_usd").notNull().default(0.0),
  shippingAmountUsd: real("shipping_amount_usd").notNull().default(0.0),
  totalAmountUsd: real("total_amount_usd").notNull(),
  currency: text("currency").notNull().default("USD"),
  paymentTerms: text("payment_terms").notNull().default("NET_30"),
  shippingAddress: text("shipping_address").notNull(),
  shippingDock: text("shipping_dock").notNull().default("DOCK_A_CENTRAL"),
  status: text("status").notNull().default("issued"), // 'issued' | 'acknowledged' | 'partially_shipped' | 'fulfilled' | 'cancelled'
  isEncumbered: integer("is_encumbered", { mode: "boolean" }).notNull().default(true),
  encumbranceId: text("encumbrance_id"),
  merkleLeafHash: text("merkle_leaf_hash").notNull().default(""),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyPoNumberIdx: index("idx_supply_po_number").on(t.poNumber),
  supplyPoVendorIdx: index("idx_supply_po_vendor").on(t.vendorId),
  supplyPoDeptIdx: index("idx_supply_po_dept").on(t.departmentId),
  supplyPoStatusIdx: index("idx_supply_po_status").on(t.status),
}));

export const supplyPoLineItems = sqliteTable("supply_po_line_items", {
  id: text("id").primaryKey(),
  poId: text("po_id").notNull().references(() => supplyPurchaseOrders.id, { onDelete: "cascade" }),
  lineNumber: integer("line_number").notNull(),
  itemSku: text("item_sku").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("general"),
  unitPriceUsd: real("unit_price_usd").notNull(),
  quantityOrdered: real("quantity_ordered").notNull(),
  quantityReceived: real("quantity_received").notNull().default(0.0),
  quantityInvoiced: real("quantity_invoiced").notNull().default(0.0),
  unitOfMeasure: text("unit_of_measure").notNull().default("EA"), // 'EA' | 'BOX' | 'KG' | 'LITER' | 'HOUR'
  lineTotalUsd: real("line_total_usd").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'partially_received' | 'fully_received' | 'cancelled'
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyPoLinePoIdx: index("idx_supply_po_line_po").on(t.poId),
  supplyPoLineSkuIdx: index("idx_supply_po_line_sku").on(t.itemSku),
  supplyPoLineStatusIdx: index("idx_supply_po_line_status").on(t.status),
}));

export const supplyGoodsReceipts = sqliteTable("supply_goods_receipts", {
  id: text("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull().unique(),
  poId: text("po_id").notNull().references(() => supplyPurchaseOrders.id),
  vendorId: text("vendor_id").notNull().references(() => supplyVendors.id),
  receivedDate: text("received_date").notNull(),
  receivedByUserId: text("received_by_user_id").notNull().references(() => staff.id),
  warehouseBay: text("warehouse_bay").notNull().default("BAY_1"),
  dockTag: text("dock_tag").notNull().default("DOCK_A"),
  carrierName: text("carrier_name"),
  trackingNumber: text("tracking_number"),
  packageCondition: text("package_condition").notNull().default("good"), // 'good' | 'damaged' | 'tampered'
  inspectionNotes: text("inspection_notes"),
  receiverSignature: text("receiver_signature").notNull().default("VERIFIED"),
  status: text("status").notNull().default("verified"), // 'verified' | 'quarantined' | 'rejected'
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyReceiptNumberIdx: index("idx_supply_receipt_number").on(t.receiptNumber),
  supplyReceiptPoIdx: index("idx_supply_receipt_po").on(t.poId),
  supplyReceiptVendorIdx: index("idx_supply_receipt_vendor").on(t.vendorId),
  supplyReceiptStatusIdx: index("idx_supply_receipt_status").on(t.status),
}));

export const supplyVendorInvoices = sqliteTable("supply_vendor_invoices", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  vendorId: text("vendor_id").notNull().references(() => supplyVendors.id),
  poId: text("po_id").references(() => supplyPurchaseOrders.id),
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date").notNull(),
  subtotalUsd: real("subtotal_usd").notNull(),
  taxAmountUsd: real("tax_amount_usd").notNull().default(0.0),
  totalAmountUsd: real("total_amount_usd").notNull(),
  currency: text("currency").notNull().default("USD"),
  documentUrl: text("document_url"),
  status: text("status").notNull().default("submitted"), // 'submitted' | 'under_match' | 'matched' | 'discrepancy' | 'approved_for_payment' | 'paid' | 'rejected'
  voucherNumber: text("voucher_number"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyInvNumberIdx: index("idx_supply_inv_number").on(t.invoiceNumber),
  supplyInvVendorIdx: index("idx_supply_inv_vendor").on(t.vendorId),
  supplyInvPoIdx: index("idx_supply_inv_po").on(t.poId),
  supplyInvStatusIdx: index("idx_supply_inv_status").on(t.status),
}));

export const supplyThreeWayMatches = sqliteTable("supply_three_way_matches", {
  id: text("id").primaryKey(),
  matchId: text("match_id").notNull().unique(),
  invoiceId: text("invoice_id").notNull().references(() => supplyVendorInvoices.id, { onDelete: "cascade" }),
  poId: text("po_id").notNull().references(() => supplyPurchaseOrders.id),
  receiptId: text("receipt_id").references(() => supplyGoodsReceipts.id),
  matchStatus: text("match_status").notNull().default("matched"), // 'matched' | 'price_variance' | 'quantity_variance' | 'missing_receipt' | 'override_approved'
  priceVariancePercent: real("price_variance_percent").notNull().default(0.0),
  quantityVarianceUnits: real("quantity_variance_units").notNull().default(0.0),
  dollarVarianceUsd: real("dollar_variance_usd").notNull().default(0.0),
  isToleranceCompliant: integer("is_tolerance_compliant", { mode: "boolean" }).notNull().default(true),
  overrideApprovedByUserId: text("override_approved_by_user_id"),
  overrideJustification: text("override_justification"),
  debitMemoGenerated: integer("debit_memo_generated", { mode: "boolean" }).notNull().default(false),
  debitMemoAmountUsd: real("debit_memo_amount_usd").notNull().default(0.0),
  paymentVoucherCode: text("payment_voucher_code"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyMatchIdIdx: index("idx_supply_match_id").on(t.matchId),
  supplyMatchInvoiceIdx: index("idx_supply_match_invoice").on(t.invoiceId),
  supplyMatchPoIdx: index("idx_supply_match_po").on(t.poId),
  supplyMatchStatusIdx: index("idx_supply_match_status").on(t.matchStatus),
}));

export const supplyContracts = sqliteTable("supply_contracts", {
  id: text("id").primaryKey(),
  contractCode: text("contract_code").notNull().unique(),
  vendorId: text("vendor_id").notNull().references(() => supplyVendors.id),
  title: text("title").notNull(),
  contractType: text("contract_type").notNull().default("MSA"), // 'MSA' | 'SOW' | 'SLA_SERVICE' | 'EQUIPMENT_LEASE' | 'SOFTWARE_LICENSE'
  totalValueUsd: real("total_value_usd").notNull(),
  effectiveStartDate: text("effective_start_date").notNull(),
  effectiveEndDate: text("effective_end_date").notNull(),
  renewalNoticeDays: integer("renewal_notice_days").notNull().default(60),
  slaUptimeTargetPercent: real("sla_uptime_target_percent").notNull().default(99.9),
  slaPenaltyRatePerOutageHourUsd: real("sla_penalty_rate_per_outage_hour_usd").notNull().default(500.0),
  status: text("status").notNull().default("active"), // 'draft' | 'active' | 'expiring_soon' | 'renewed' | 'expired' | 'terminated'
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyContractCodeIdx: index("idx_supply_contract_code").on(t.contractCode),
  supplyContractVendorIdx: index("idx_supply_contract_vendor").on(t.vendorId),
  supplyContractStatusIdx: index("idx_supply_contract_status").on(t.status),
  supplyContractEndIdx: index("idx_supply_contract_end").on(t.effectiveEndDate),
}));

export const supplyContractMilestones = sqliteTable("supply_contract_milestones", {
  id: text("id").primaryKey(),
  milestoneId: text("milestone_id").notNull().unique(),
  contractId: text("contract_id").notNull().references(() => supplyContracts.id, { onDelete: "cascade" }),
  milestoneNumber: integer("milestone_number").notNull(),
  title: text("title").notNull(),
  deliverableDescription: text("deliverable_description").notNull(),
  amountUsd: real("amount_usd").notNull(),
  dueDate: text("due_date").notNull(),
  completionDate: text("completion_date"),
  deliverableEvidenceUrl: text("deliverable_evidence_url"),
  approvedByUserId: text("approved_by_user_id"),
  status: text("status").notNull().default("pending"), // 'pending' | 'submitted' | 'approved' | 'paid' | 'delayed'
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyMilestoneIdIdx: index("idx_supply_milestone_id").on(t.milestoneId),
  supplyMilestoneContractIdx: index("idx_supply_milestone_contract").on(t.contractId),
  supplyMilestoneStatusIdx: index("idx_supply_milestone_status").on(t.status),
}));

export const supplyBudgetEncumbrances = sqliteTable("supply_budget_encumbrances", {
  id: text("id").primaryKey(),
  encumbranceNumber: text("encumbrance_number").notNull().unique(),
  departmentId: text("department_id").notNull(),
  budgetCode: text("budget_code").notNull(),
  poId: text("po_id").notNull().references(() => supplyPurchaseOrders.id),
  encumberedAmountUsd: real("encumbered_amount_usd").notNull(),
  liquidatedAmountUsd: real("liquidated_amount_usd").notNull().default(0.0),
  remainingEncumberedUsd: real("remaining_encumbered_usd").notNull(),
  status: text("status").notNull().default("active"), // 'active' | 'partially_liquidated' | 'fully_liquidated' | 'released'
  debitAccountCode: text("debit_account_code").notNull().default("GL:ENCUMBRANCE_EXPENSE"),
  creditAccountCode: text("credit_account_code").notNull().default("GL:ENCUMBRANCE_RESERVE"),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyEncumberNumIdx: index("idx_supply_encumber_num").on(t.encumbranceNumber),
  supplyEncumberDeptIdx: index("idx_supply_encumber_dept").on(t.departmentId),
  supplyEncumberPoIdx: index("idx_supply_encumber_po").on(t.poId),
  supplyEncumberStatusIdx: index("idx_supply_encumber_status").on(t.status),
}));

export const supplyAuditLogs = sqliteTable("supply_audit_logs", {
  id: text("id").primaryKey(),
  auditId: text("audit_id").notNull().unique(),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(), // 'requisition_created' | 'requisition_approved' | 'po_issued' | 'goods_received' | 'three_way_matched' | 'discrepancy_overridden' | 'encumbrance_locked' | 'contract_signed'
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  prevMerkleRoot: text("prev_merkle_root").notNull().default(""),
  merkleRoot: text("merkle_root").notNull().default(""),
  timestamp: text("timestamp").notNull(),
  institutionId: text("institution_id").notNull().default("global"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  supplyAuditIdIdx: index("idx_supply_audit_id").on(t.auditId),
  supplyAuditActionIdx: index("idx_supply_audit_action").on(t.action),
  supplyAuditEntityIdx: index("idx_supply_audit_entity").on(t.entityType, t.entityId),
  supplyAuditTimeIdx: index("idx_supply_audit_time").on(t.timestamp),
}));

// ─── Academic Timetables & Institutional Management (TGCIS & Multi-Campus) ───

export const timetableSlots = sqliteTable("timetable_slots", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slotOrder: integer("slot_order").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isBreak: integer("is_break", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  instSlotIdx: index("idx_timetable_slots_inst").on(t.institutionId),
}));

export const timetableEntries = sqliteTable("timetable_entries", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  academicYearId: text("academic_year_id").references(() => academicYears.id, { onDelete: "set null" }),
  classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  slotId: text("slot_id").notNull().references(() => timetableSlots.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 1 (Mon) to 7 (Sun)
  subjectName: text("subject_name").notNull(),
  teacherId: text("teacher_id").references(() => staff.id, { onDelete: "set null" }),
  roomNumber: text("room_number"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  entryClassDayIdx: index("idx_timetable_entries_class_day").on(t.classId, t.dayOfWeek),
  entryTeacherIdx: index("idx_timetable_entries_teacher").on(t.teacherId),
  entryInstIdx: index("idx_timetable_entries_inst").on(t.institutionId),
}));

export const teacherSubstitutions = sqliteTable("teacher_substitutions", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  timetableEntryId: text("timetable_entry_id").notNull().references(() => timetableEntries.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  originalTeacherId: text("original_teacher_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  substituteTeacherId: text("substitute_teacher_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  reason: text("reason"),
  status: text("status").notNull().default("assigned"), // 'assigned' | 'confirmed' | 'completed' | 'cancelled'
  assignedById: text("assigned_by_id").references(() => staff.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  substDateIdx: index("idx_substitutions_date").on(t.date),
  substTeacherIdx: index("idx_substitutions_sub_teacher").on(t.substituteTeacherId),
}));

export const studentEnquiries = sqliteTable("student_enquiries", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  applicantName: text("applicant_name").notNull(),
  guardianName: text("guardian_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  appliedGradeOrCourse: text("applied_grade_or_course").notNull(),
  academicYearId: text("academic_year_id").references(() => academicYears.id, { onDelete: "set null" }),
  previousSchoolOrCollege: text("previous_school_or_college"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // 'pending' | 'under_review' | 'admitted' | 'rejected'
  reviewedById: text("reviewed_by_id").references(() => staff.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  enquiryInstStatusIdx: index("idx_student_enquiries_inst_status").on(t.institutionId, t.status),
}));

export const campusAffiliations = sqliteTable("campus_affiliations", {
  id: text("id").primaryKey(),
  campusName: text("campus_name").notNull(),
  contactPerson: text("contact_person").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  locationAddress: text("location_address").notNull(),
  campusType: text("campus_type").notNull().default("affiliated"), // 'off_campus' | 'affiliated'
  totalCapacity: integer("total_capacity").default(0),
  facilitiesDescription: text("facilities_description"),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  approvedById: text("approved_by_id").references(() => staff.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  affiliationStatusIdx: index("idx_campus_affiliations_status").on(t.status),
}));

export const circularCampusCompliance = sqliteTable("circular_campus_compliance", {
  id: text("id").primaryKey(),
  circularId: text("circular_id").notNull().references(() => circulars.id, { onDelete: "cascade" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // 'pending' | 'acknowledged' | 'in_progress' | 'completed'
  completionEvidenceUrl: text("completion_evidence_url"),
  coordinatorRemarks: text("coordinator_remarks"),
  completedAt: text("completed_at"),
  verifiedById: text("verified_by_id").references(() => staff.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  complianceCircInstIdx: uniqueIndex("idx_circular_compliance_circ_inst").on(t.circularId, t.institutionId),
}));

// ─── Sprint-056: Examination PDF Generator, Universal Multi-Format Export Engine & Mobile Academic Push Synchronization (DOC-GEN / ExportHub) ───

export const docTemplates = sqliteTable("doc_templates", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  templateCode: text("template_code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'report_card' | 'hall_ticket' | 'certificate' | 'fee_receipt' | 'custom'
  layoutConfig: text("layout_config"), // JSON configuration (margins, orientation, colors)
  contentTemplate: text("content_template").notNull(), // Handlebars/HTML template
  cssStyles: text("css_styles"),
  version: integer("version").notNull().default(1),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("active"), // 'draft' | 'active' | 'archived'
  createdById: text("created_by_id").references(() => staff.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  docTemplateInstIdx: index("idx_doc_templates_inst").on(t.institutionId),
  docTemplateCodeIdx: index("idx_doc_templates_code").on(t.templateCode),
  docTemplateCategoryIdx: index("idx_doc_templates_category").on(t.category),
}));

export const docGeneratedRecords = sqliteTable("doc_generated_records", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  templateId: text("template_id").references(() => docTemplates.id, { onDelete: "set null" }),
  documentType: text("document_type").notNull(), // 'report_card' | 'hall_ticket' | 'certificate' | 'fee_receipt' | 'custom'
  recipientType: text("recipient_type").notNull().default("student"), // 'student' | 'guardian' | 'staff' | 'external'
  recipientId: text("recipient_id").notNull(),
  academicYearId: text("academic_year_id").references(() => academicYears.id, { onDelete: "set null" }),
  examId: text("exam_id").references(() => exams.id, { onDelete: "set null" }),
  documentHash: text("document_hash").notNull().unique(),
  serialNumber: text("serial_number").notNull().unique(),
  title: text("title").notNull(),
  fileUrl: text("file_url"),
  fileSizeBytes: integer("file_size_bytes").notNull().default(0),
  status: text("status").notNull().default("valid"), // 'valid' | 'revoked' | 'expired'
  metadataJson: text("metadata_json"),
  generatedById: text("generated_by_id").references(() => staff.id, { onDelete: "set null" }),
  issuedAt: text("issued_at").notNull().default(sql`(current_timestamp)`),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  docGenInstIdx: index("idx_doc_gen_inst").on(t.institutionId),
  docGenRecipientIdx: index("idx_doc_gen_recipient").on(t.recipientType, t.recipientId),
  docGenHashIdx: index("idx_doc_gen_hash").on(t.documentHash),
  docGenSerialIdx: index("idx_doc_gen_serial").on(t.serialNumber),
  docGenStatusIdx: index("idx_doc_gen_status").on(t.status),
}));

export const docVerificationSignatures = sqliteTable("doc_verification_signatures", {
  id: text("id").primaryKey(),
  documentRecordId: text("document_record_id").notNull().references(() => docGeneratedRecords.id, { onDelete: "cascade" }),
  documentHash: text("document_hash").notNull().unique(),
  signature: text("signature").notNull(),
  signerPublicKey: text("signer_public_key"),
  signingAlgorithm: text("signing_algorithm").notNull().default("sha256WithRSAEncryption"),
  merkleRoot: text("merkle_root"),
  merkleProof: text("merkle_proof"),
  verificationCount: integer("verification_count").notNull().default(0),
  lastVerifiedAt: text("last_verified_at"),
  revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
  revokedReason: text("revoked_reason"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  docVerifHashIdx: index("idx_doc_verif_hash").on(t.documentHash),
  docVerifRecordIdx: index("idx_doc_verif_record").on(t.documentRecordId),
}));

export const exportJobs = sqliteTable("export_jobs", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  jobType: text("job_type").notNull(), // 'students' | 'timetables' | 'attendance' | 'grades' | 'finances' | 'audit_logs' | 'custom'
  format: text("format").notNull().default("csv"), // 'csv' | 'xlsx' | 'json' | 'pdf'
  filterParamsJson: text("filter_params_json"),
  selectedColumnsJson: text("selected_columns_json"),
  status: text("status").notNull().default("queued"), // 'queued' | 'processing' | 'completed' | 'failed' | 'expired'
  progressPercent: integer("progress_percent").notNull().default(0),
  totalRecords: integer("total_records").notNull().default(0),
  processedRecords: integer("processed_records").notNull().default(0),
  downloadUrl: text("download_url"),
  fileSizeBytes: integer("file_size_bytes").notNull().default(0),
  errorMessage: text("error_message"),
  downloadToken: text("download_token"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  completedAt: text("completed_at"),
}, (t) => ({
  exportJobsInstIdx: index("idx_export_jobs_inst").on(t.institutionId),
  exportJobsUserIdx: index("idx_export_jobs_user").on(t.userId),
  exportJobsStatusIdx: index("idx_export_jobs_status").on(t.status),
}));

export const exportTemplates = sqliteTable("export_templates", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(),
  columnMappingJson: text("column_mapping_json").notNull(),
  defaultFormat: text("default_format").notNull().default("csv"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  createdById: text("created_by_id").references(() => staff.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  exportTemplatesInstIdx: index("idx_export_templates_inst").on(t.institutionId),
  exportTemplatesEntityIdx: index("idx_export_templates_entity").on(t.entityType),
}));

export const mobileSyncEvents = sqliteTable("mobile_sync_events", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // 'timetable_updated' | 'substitution_assigned' | 'exam_scheduled' | 'grades_published' | 'hall_ticket_released'
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  payloadJson: text("payload_json").notNull(),
  targetAudience: text("target_audience").notNull().default("all"), // 'all' | 'teachers' | 'students' | 'guardians' | 'class'
  targetId: text("target_id"),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  mobileSyncInstIdx: index("idx_mobile_sync_inst").on(t.institutionId),
  mobileSyncTypeIdx: index("idx_mobile_sync_type").on(t.eventType),
  mobileSyncTimeIdx: index("idx_mobile_sync_time").on(t.createdAt),
}));

export const mobileDeviceTokens = sqliteTable("mobile_device_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  deviceToken: text("device_token").notNull().unique(),
  platform: text("platform").notNull().default("android"), // 'android' | 'ios' | 'web'
  deviceModel: text("device_model"),
  appVersion: text("app_version"),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
  lastSeenAt: text("last_seen_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  mobileDeviceUserIdx: index("idx_mobile_device_user").on(t.userId),
  mobileDeviceInstIdx: index("idx_mobile_device_inst").on(t.institutionId),
  mobileDeviceTokenIdx: index("idx_mobile_device_token").on(t.deviceToken),
}));

export const mobilePushLogs = sqliteTable("mobile_push_logs", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  syncEventId: text("sync_event_id").references(() => mobileSyncEvents.id, { onDelete: "set null" }),
  recipientUserId: text("recipient_user_id").notNull(),
  deviceTokenId: text("device_token_id").references(() => mobileDeviceTokens.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  dataPayloadJson: text("data_payload_json"),
  status: text("status").notNull().default("pending"), // 'pending' | 'delivered' | 'failed'
  errorMessage: text("error_message"),
  deliveredAt: text("delivered_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  mobilePushInstIdx: index("idx_mobile_push_inst").on(t.institutionId),
  mobilePushUserIdx: index("idx_mobile_push_user").on(t.recipientUserId),
  mobilePushStatusIdx: index("idx_mobile_push_status").on(t.status),
}));

export const docAuditLogs = sqliteTable("doc_audit_logs", {
  id: text("id").primaryKey(),
  auditId: text("audit_id").notNull().unique(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(), // 'template_created' | 'template_updated' | 'doc_generated' | 'doc_revoked' | 'export_initiated' | 'push_dispatched' | 'doc_verified'
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  timestamp: text("timestamp").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  docAuditIdIdx: index("idx_doc_audit_id").on(t.auditId),
  docAuditActionIdx: index("idx_doc_audit_action").on(t.action),
  docAuditEntityIdx: index("idx_doc_audit_entity").on(t.entityType, t.entityId),
  docAuditTimeIdx: index("idx_doc_audit_time").on(t.timestamp),
}));

// ─── FEE-HIVE / FinanceOS (Sprint-057) ───

export const feeStructures = sqliteTable("fee_structures", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  academicYear: text("academic_year").notNull(),
  programId: text("program_id"),
  gradeLevel: text("grade_level"),
  term: text("term").notNull().default("annual"),
  quota: text("quota").notNull().default("general"), // 'general' | 'merit' | 'management' | 'nri' | 'sports'
  residentialType: text("residential_type").notNull().default("day_scholar"), // 'day_scholar' | 'hosteller' | 'boarder'
  currency: text("currency").notNull().default("INR"),
  totalAmount: real("total_amount").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  metadataJson: text("metadata_json"),
  createdById: text("created_by_id").references(() => staff.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feeStructInstIdx: index("idx_fee_structures_inst").on(t.institutionId),
  feeStructCodeIdx: index("idx_fee_structures_code").on(t.code),
  feeStructYearIdx: index("idx_fee_structures_year").on(t.academicYear),
}));

export const feeStructureComponents = sqliteTable("fee_structure_components", {
  id: text("id").primaryKey(),
  feeStructureId: text("fee_structure_id").notNull().references(() => feeStructures.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  componentType: text("component_type").notNull().default("tuition"), // 'tuition' | 'admission' | 'hostel' | 'transport' | 'lab' | 'library' | 'exam' | 'extracurricular' | 'misc'
  amount: real("amount").notNull().default(0),
  isMandatory: integer("is_mandatory", { mode: "boolean" }).notNull().default(true),
  isRefundable: integer("is_refundable", { mode: "boolean" }).notNull().default(false),
  taxRatePercent: real("tax_rate_percent").notNull().default(0),
  glAccountCode: text("gl_account_code").notNull().default("GL:4100-FEE_REVENUE"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feeCompStructIdx: index("idx_fee_components_struct").on(t.feeStructureId),
  feeCompTypeIdx: index("idx_fee_components_type").on(t.componentType),
}));

export const feeStudentAllocations = sqliteTable("fee_student_allocations", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  feeStructureId: text("fee_structure_id").notNull().references(() => feeStructures.id, { onDelete: "cascade" }),
  academicYear: text("academic_year").notNull(),
  baseAmount: real("base_amount").notNull().default(0),
  concessionAmount: real("concession_amount").notNull().default(0),
  netPayableAmount: real("net_payable_amount").notNull().default(0),
  paidAmount: real("paid_amount").notNull().default(0),
  balanceAmount: real("balance_amount").notNull().default(0),
  status: text("status").notNull().default("unpaid"), // 'unpaid' | 'partial' | 'paid' | 'waived' | 'overdue'
  allocationDate: text("allocation_date").notNull().default(sql`(current_timestamp)`),
  dueDate: text("due_date"),
  remarks: text("remarks"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feeAllocInstIdx: index("idx_fee_alloc_inst").on(t.institutionId),
  feeAllocStudentIdx: index("idx_fee_alloc_student").on(t.studentId),
  feeAllocStructIdx: index("idx_fee_alloc_struct").on(t.feeStructureId),
  feeAllocStatusIdx: index("idx_fee_alloc_status").on(t.status),
}));

export const feeInstallments = sqliteTable("fee_installments", {
  id: text("id").primaryKey(),
  allocationId: text("allocation_id").notNull().references(() => feeStudentAllocations.id, { onDelete: "cascade" }),
  installmentNumber: integer("installment_number").notNull().default(1),
  title: text("title").notNull(),
  dueDate: text("due_date").notNull(),
  gracePeriodDays: integer("grace_period_days").notNull().default(7),
  amount: real("amount").notNull().default(0),
  paidAmount: real("paid_amount").notNull().default(0),
  balanceAmount: real("balance_amount").notNull().default(0),
  fineAmount: real("fine_amount").notNull().default(0),
  fineWaivedAmount: real("fine_waived_amount").notNull().default(0),
  status: text("status").notNull().default("pending"), // 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'waived'
  lastPaymentDate: text("last_payment_date"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feeInstAllocIdx: index("idx_fee_inst_alloc").on(t.allocationId),
  feeInstDueIdx: index("idx_fee_inst_due").on(t.dueDate),
  feeInstStatusIdx: index("idx_fee_inst_status").on(t.status),
}));

export const feePayments = sqliteTable("fee_payments", {
  id: text("id").primaryKey(),
  paymentNumber: text("payment_number").notNull().unique(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  allocationId: text("allocation_id").notNull().references(() => feeStudentAllocations.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  amount: real("amount").notNull().default(0),
  fineAmount: real("fine_amount").notNull().default(0),
  discountAmount: real("discount_amount").notNull().default(0),
  netAmount: real("net_amount").notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  paymentMethod: text("payment_method").notNull(), // 'razorpay' | 'stripe' | 'upi' | 'cash' | 'pos_card' | 'bank_transfer' | 'cheque' | 'dd'
  paymentStatus: text("payment_status").notNull().default("completed"), // 'initiated' | 'pending' | 'completed' | 'failed' | 'refunded' | 'chargeback'
  gatewayOrderId: text("gateway_order_id"),
  gatewayPaymentId: text("gateway_payment_id"),
  transactionReference: text("transaction_reference"),
  counterRegisterId: text("counter_register_id"),
  payerName: text("payer_name"),
  payerPhone: text("payer_phone"),
  payerEmail: text("payer_email"),
  receiptNumber: text("receipt_number"),
  paidAt: text("paid_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feePayInstIdx: index("idx_fee_pay_inst").on(t.institutionId),
  feePayAllocIdx: index("idx_fee_pay_alloc").on(t.allocationId),
  feePayStudentIdx: index("idx_fee_pay_student").on(t.studentId),
  feePayNumberIdx: index("idx_fee_pay_number").on(t.paymentNumber),
  feePayStatusIdx: index("idx_fee_pay_status").on(t.paymentStatus),
}));

export const feePaymentTransactions = sqliteTable("fee_payment_transactions", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id").notNull().references(() => feePayments.id, { onDelete: "cascade" }),
  installmentId: text("installment_id").references(() => feeInstallments.id, { onDelete: "set null" }),
  componentId: text("component_id").references(() => feeStructureComponents.id, { onDelete: "set null" }),
  allocatedAmount: real("allocated_amount").notNull().default(0),
  glDebitAccount: text("gl_debit_account").notNull().default("GL:1100-BANK_CASH"),
  glCreditAccount: text("gl_credit_account").notNull().default("GL:1200-FEE_RECEIVABLE"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feeTxPaymentIdx: index("idx_fee_tx_payment").on(t.paymentId),
  feeTxInstIdx: index("idx_fee_tx_installment").on(t.installmentId),
}));

export const feeReceipts = sqliteTable("fee_receipts", {
  id: text("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull().unique(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  paymentId: text("payment_id").notNull().unique().references(() => feePayments.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  docGeneratedRecordId: text("doc_generated_record_id"),
  receiptHash: text("receipt_hash").notNull().unique(),
  signature: text("signature").notNull(),
  qrPayload: text("qr_payload").notNull(),
  receiptHtml: text("receipt_html"),
  receiptPdfUrl: text("receipt_pdf_url"),
  downloadCount: integer("download_count").notNull().default(0),
  issuedAt: text("issued_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feeRcptInstIdx: index("idx_fee_rcpt_inst").on(t.institutionId),
  feeRcptNumberIdx: index("idx_fee_rcpt_number").on(t.receiptNumber),
  feeRcptHashIdx: index("idx_fee_rcpt_hash").on(t.receiptHash),
  feeRcptStudentIdx: index("idx_fee_rcpt_student").on(t.studentId),
}));

export const feeScholarships = sqliteTable("fee_scholarships", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  category: text("category").notNull().default("merit"), // 'merit' | 'need_based' | 'sports' | 'sibling' | 'staff_ward' | 'orphan' | 'special_grant'
  discountType: text("discount_type").notNull().default("percentage"), // 'percentage' | 'fixed_amount'
  discountValue: real("discount_value").notNull().default(0),
  targetComponentType: text("target_component_type").default("tuition"),
  totalBudget: real("total_budget").notNull().default(0),
  disbursedAmount: real("disbursed_amount").notNull().default(0),
  academicYear: text("academic_year").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feeSchInstIdx: index("idx_fee_sch_inst").on(t.institutionId),
  feeSchCodeIdx: index("idx_fee_sch_code").on(t.code),
  feeSchYearIdx: index("idx_fee_sch_year").on(t.academicYear),
}));

export const feeConcessions = sqliteTable("fee_concessions", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  scholarshipId: text("scholarship_id").references(() => feeScholarships.id, { onDelete: "set null" }),
  allocationId: text("allocation_id").notNull().references(() => feeStudentAllocations.id, { onDelete: "cascade" }),
  amount: real("amount").notNull().default(0),
  reason: text("reason").notNull(),
  supportingDocUrl: text("supporting_doc_url"),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'revoked'
  appliedById: text("applied_by_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  approvedById: text("approved_by_id").references(() => staff.id, { onDelete: "set null" }),
  decisionNotes: text("decision_notes"),
  decisionDate: text("decision_date"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feeConcInstIdx: index("idx_fee_conc_inst").on(t.institutionId),
  feeConcStudentIdx: index("idx_fee_conc_student").on(t.studentId),
  feeConcAllocIdx: index("idx_fee_conc_alloc").on(t.allocationId),
  feeConcStatusIdx: index("idx_fee_conc_status").on(t.status),
}));

export const feeCounterRegisters = sqliteTable("fee_counter_registers", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  cashierId: text("cashier_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  counterName: text("counter_name").notNull(),
  openingFloat: real("opening_float").notNull().default(0),
  closingCashDeclared: real("closing_cash_declared"),
  systemCashTotal: real("system_cash_total").notNull().default(0),
  systemPosTotal: real("system_pos_total").notNull().default(0),
  systemChequeTotal: real("system_cheque_total").notNull().default(0),
  cashDropsTotal: real("cash_drops_total").notNull().default(0),
  varianceAmount: real("variance_amount").notNull().default(0),
  status: text("status").notNull().default("open"), // 'open' | 'closed' | 'verified' | 'disputed'
  openedAt: text("opened_at").notNull().default(sql`(current_timestamp)`),
  closedAt: text("closed_at"),
  supervisorId: text("supervisor_id").references(() => staff.id, { onDelete: "set null" }),
  supervisorNotes: text("supervisor_notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feeCountInstIdx: index("idx_fee_count_inst").on(t.institutionId),
  feeCountCashierIdx: index("idx_fee_count_cashier").on(t.cashierId),
  feeCountStatusIdx: index("idx_fee_count_status").on(t.status),
}));

export const feeDefaulterLogs = sqliteTable("fee_defaulter_logs", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  allocationId: text("allocation_id").notNull().references(() => feeStudentAllocations.id, { onDelete: "cascade" }),
  agingDays: integer("aging_days").notNull().default(0),
  agingBucket: text("aging_bucket").notNull().default("current"), // 'current' | '1_30' | '31_60' | '61_90' | '90_plus'
  overdueAmount: real("overdue_amount").notNull().default(0),
  riskScore: integer("risk_score").notNull().default(0),
  actionTaken: text("action_taken").notNull().default("reminder_sent"), // 'reminder_sent' | 'hall_ticket_blocked' | 'guardian_contacted' | 'escalated_to_principal'
  channel: text("channel").default("whatsapp"), // 'whatsapp' | 'sms' | 'email' | 'manual_call'
  dispatchedAt: text("dispatched_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feeDefInstIdx: index("idx_fee_def_inst").on(t.institutionId),
  feeDefStudentIdx: index("idx_fee_def_student").on(t.studentId),
  feeDefBucketIdx: index("idx_fee_def_bucket").on(t.agingBucket),
}));

export const feeReconciliationBatches = sqliteTable("fee_reconciliation_batches", {
  id: text("id").primaryKey(),
  batchNumber: text("batch_number").notNull().unique(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull().default("bank_statement"), // 'razorpay_settlement' | 'stripe_payout' | 'bank_statement' | 'pos_terminal'
  statementDate: text("statement_date").notNull(),
  totalTransactions: integer("total_transactions").notNull().default(0),
  matchedTransactions: integer("matched_transactions").notNull().default(0),
  unmatchedTransactions: integer("unmatched_transactions").notNull().default(0),
  totalSettledAmount: real("total_settled_amount").notNull().default(0),
  feeChargesAmount: real("fee_charges_amount").notNull().default(0),
  netPayoutAmount: real("net_payout_amount").notNull().default(0),
  discrepancyAmount: real("discrepancy_amount").notNull().default(0),
  status: text("status").notNull().default("reconciled"), // 'in_progress' | 'reconciled' | 'discrepancy_flagged'
  reconciledById: text("reconciled_by_id").references(() => staff.id, { onDelete: "set null" }),
  reconciledAt: text("reconciled_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feeReconInstIdx: index("idx_fee_recon_inst").on(t.institutionId),
  feeReconBatchIdx: index("idx_fee_recon_batch").on(t.batchNumber),
  feeReconStatusIdx: index("idx_fee_recon_status").on(t.status),
}));

export const feeAuditLogs = sqliteTable("fee_audit_logs", {
  id: text("id").primaryKey(),
  auditId: text("audit_id").notNull().unique(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(), // 'structure_created' | 'structure_updated' | 'fee_allocated' | 'payment_received' | 'payment_refunded' | 'receipt_issued' | 'scholarship_approved' | 'concession_granted' | 'counter_shift_closed' | 'statement_reconciled' | 'defaulter_notified'
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  timestamp: text("timestamp").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  feeAuditIdIdx: index("idx_fee_audit_id").on(t.auditId),
  feeAuditActionIdx: index("idx_fee_audit_action").on(t.action),
  feeAuditEntityIdx: index("idx_fee_audit_entity").on(t.entityType, t.entityId),
  feeAuditTimeIdx: index("idx_fee_audit_time").on(t.timestamp),
}));

// ─── ALUMNI-HUB / EndowmentOS (Sprint-058) ───

export const alumniProfiles = sqliteTable("alumni_profiles", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  studentId: text("student_id").references(() => students.id, { onDelete: "set null" }),
  userId: text("user_id").references(() => staff.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  maidenName: text("maiden_name"),
  email: text("email").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  headline: text("headline"),
  bio: text("bio"),
  currentCompany: text("current_company"),
  currentDesignation: text("current_designation"),
  currentIndustry: text("current_industry"),
  currentCity: text("current_city"),
  currentCountry: text("current_country"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  portfolioUrl: text("portfolio_url"),
  graduationBatchYear: integer("graduation_batch_year").notNull(),
  primaryDegree: text("primary_degree").notNull(),
  primaryDepartment: text("primary_department").notNull(),
  credentialHash: text("credential_hash"),
  isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
  verifiedAt: text("verified_at"),
  verifiedById: text("verified_by_id").references(() => staff.id, { onDelete: "set null" }),
  isMentor: integer("is_mentor", { mode: "boolean" }).notNull().default(false),
  isHiring: integer("is_hiring", { mode: "boolean" }).notNull().default(false),
  privacyConsentLevel: text("privacy_consent_level").notNull().default("alumni_only"), // 'public' | 'alumni_only' | 'hidden'
  showEmail: integer("show_email", { mode: "boolean" }).notNull().default(false),
  showPhone: integer("show_phone", { mode: "boolean" }).notNull().default(false),
  showLocation: integer("show_location", { mode: "boolean" }).notNull().default(true),
  showCompany: integer("show_company", { mode: "boolean" }).notNull().default(true),
  status: text("status").notNull().default("active"), // 'pending_claim' | 'active' | 'archived' | 'suspended'
  claimedAt: text("claimed_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumProfInstIdx: index("idx_alum_prof_inst").on(t.institutionId),
  alumProfEmailIdx: index("idx_alum_prof_email").on(t.email),
  alumProfBatchIdx: index("idx_alum_prof_batch").on(t.graduationBatchYear),
  alumProfStatusIdx: index("idx_alum_prof_status").on(t.status),
  alumProfStudentIdx: index("idx_alum_prof_student").on(t.studentId),
}));

export const alumniEducations = sqliteTable("alumni_educations", {
  id: text("id").primaryKey(),
  alumniProfileId: text("alumni_profile_id").notNull().references(() => alumniProfiles.id, { onDelete: "cascade" }),
  institutionName: text("institution_name").notNull(),
  degree: text("degree").notNull(),
  fieldOfStudy: text("field_of_study").notNull(),
  startYear: integer("start_year").notNull(),
  endYear: integer("end_year"),
  gradeCgpa: text("grade_cgpa"),
  honors: text("honors"),
  activities: text("activities"),
  isInstitutional: integer("is_institutional", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumEduProfIdx: index("idx_alum_edu_prof").on(t.alumniProfileId),
}));

export const alumniExperiences = sqliteTable("alumni_experiences", {
  id: text("id").primaryKey(),
  alumniProfileId: text("alumni_profile_id").notNull().references(() => alumniProfiles.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  title: text("title").notNull(),
  employmentType: text("employment_type").default("full_time"), // 'full_time' | 'part_time' | 'contract' | 'internship' | 'founder'
  industry: text("industry").notNull(),
  location: text("location"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
  description: text("description"),
  skills: text("skills"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumExpProfIdx: index("idx_alum_exp_prof").on(t.alumniProfileId),
  alumExpCompanyIdx: index("idx_alum_exp_company").on(t.company),
}));

export const alumniMentorshipProfiles = sqliteTable("alumni_mentorship_profiles", {
  id: text("id").primaryKey(),
  alumniProfileId: text("alumni_profile_id").notNull().unique().references(() => alumniProfiles.id, { onDelete: "cascade" }),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  expertiseAreas: text("expertise_areas").notNull(), // JSON array
  targetMenteeTypes: text("target_mentee_types").notNull().default("all"), // 'undergrads' | 'graduates' | 'all'
  maxActiveMentees: integer("max_active_mentees").notNull().default(3),
  activeMenteeCount: integer("active_mentee_count").notNull().default(0),
  preferredLanguages: text("preferred_languages").default("English"),
  availabilityHoursPerMonth: real("availability_hours_per_month").notNull().default(4),
  meetingType: text("meeting_type").notNull().default("virtual"), // 'virtual' | 'in_person' | 'hybrid'
  meetingLink: text("meeting_link"),
  bioMentor: text("bio_mentor"),
  averageRating: real("average_rating").notNull().default(5.0),
  totalReviewsCount: integer("total_reviews_count").notNull().default(0),
  totalHoursDelivered: real("total_hours_delivered").notNull().default(0),
  isAcceptingRequests: integer("is_accepting_requests", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumMentorInstIdx: index("idx_alum_mentor_inst").on(t.institutionId),
  alumMentorProfIdx: index("idx_alum_mentor_prof").on(t.alumniProfileId),
}));

export const alumniMentorshipRequests = sqliteTable("alumni_mentorship_requests", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  mentorshipProfileId: text("mentorship_profile_id").notNull().references(() => alumniMentorshipProfiles.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  requestTopic: text("request_topic").notNull(),
  requestGoals: text("request_goals").notNull(),
  studentNotes: text("student_notes"),
  compatibilityScore: real("compatibility_score").notNull().default(0),
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'
  responseNotes: text("response_notes"),
  respondedAt: text("responded_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumReqInstIdx: index("idx_alum_req_inst").on(t.institutionId),
  alumReqMentorIdx: index("idx_alum_req_mentor").on(t.mentorshipProfileId),
  alumReqStudentIdx: index("idx_alum_req_student").on(t.studentId),
  alumReqStatusIdx: index("idx_alum_req_status").on(t.status),
}));

export const alumniMentorshipSessions = sqliteTable("alumni_mentorship_sessions", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull().references(() => alumniMentorshipRequests.id, { onDelete: "cascade" }),
  mentorshipProfileId: text("mentorship_profile_id").notNull().references(() => alumniMentorshipProfiles.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  scheduledStart: text("scheduled_start").notNull(),
  scheduledEnd: text("scheduled_end").notNull(),
  meetingUrl: text("meeting_url"),
  status: text("status").notNull().default("scheduled"), // 'scheduled' | 'in_progress' | 'completed' | 'no_show' | 'cancelled'
  sessionNotes: text("session_notes"),
  mentorRating: integer("mentor_rating"),
  mentorFeedback: text("mentor_feedback"),
  studentRating: integer("student_rating"),
  studentFeedback: text("student_feedback"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumSessReqIdx: index("idx_alum_sess_req").on(t.requestId),
  alumSessMentorIdx: index("idx_alum_sess_mentor").on(t.mentorshipProfileId),
  alumSessStudentIdx: index("idx_alum_sess_student").on(t.studentId),
  alumSessStatusIdx: index("idx_alum_sess_status").on(t.status),
}));

export const alumniJobPostings = sqliteTable("alumni_job_postings", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  postedByAlumniId: text("posted_by_alumni_id").references(() => alumniProfiles.id, { onDelete: "set null" }),
  company: text("company").notNull(),
  title: text("title").notNull(),
  roleType: text("role_type").notNull().default("full_time"), // 'full_time' | 'internship' | 'part_time' | 'contract'
  workplaceType: text("workplace_type").notNull().default("onsite"), // 'remote' | 'hybrid' | 'onsite'
  location: text("location").notNull(),
  departmentTarget: text("department_target"),
  experienceLevel: text("experience_level").default("entry_level"), // 'entry_level' | 'mid_level' | 'senior'
  minSalary: real("min_salary"),
  maxSalary: real("max_salary"),
  salaryCurrency: text("salary_currency").notNull().default("INR"),
  description: text("description").notNull(),
  requirements: text("requirements").notNull(),
  skillsRequired: text("skills_required"), // JSON array
  applicationUrl: text("application_url"),
  contactEmail: text("contact_email"),
  allowDirectApply: integer("allow_direct_apply", { mode: "boolean" }).notNull().default(true),
  hasAlumniReferral: integer("has_alumni_referral", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("draft"), // 'draft' | 'pending_review' | 'published' | 'rejected' | 'expired' | 'closed'
  moderatedById: text("moderated_by_id").references(() => staff.id, { onDelete: "set null" }),
  moderationNotes: text("moderation_notes"),
  publishedAt: text("published_at"),
  expiresAt: text("expires_at"),
  viewsCount: integer("views_count").notNull().default(0),
  applicationsCount: integer("applications_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumJobInstIdx: index("idx_alum_job_inst").on(t.institutionId),
  alumJobStatusIdx: index("idx_alum_job_status").on(t.status),
  alumJobCompanyIdx: index("idx_alum_job_company").on(t.company),
}));

export const alumniJobApplications = sqliteTable("alumni_job_applications", {
  id: text("id").primaryKey(),
  jobPostingId: text("job_posting_id").notNull().references(() => alumniJobPostings.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  resumeUrl: text("resume_url").notNull(),
  coverLetter: text("cover_letter"),
  portfolioLink: text("portfolio_link"),
  status: text("status").notNull().default("applied"), // 'applied' | 'shortlisted' | 'interviewing' | 'offered' | 'hired' | 'rejected' | 'withdrawn'
  referralEndorsedById: text("referral_endorsed_by_id").references(() => alumniProfiles.id, { onDelete: "set null" }),
  referralNotes: text("referral_notes"),
  recruiterFeedback: text("recruiter_feedback"),
  appliedAt: text("applied_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumAppJobIdx: index("idx_alum_app_job").on(t.jobPostingId),
  alumAppStudentIdx: index("idx_alum_app_student").on(t.studentId),
  alumAppStatusIdx: index("idx_alum_app_status").on(t.status),
}));

export const alumniDonationCampaigns = sqliteTable("alumni_donation_campaigns", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  code: text("code").notNull().unique(),
  category: text("category").notNull().default("general_endowment"), // 'scholarship_fund' | 'infrastructure' | 'research_chair' | 'student_welfare' | 'general_endowment'
  description: text("description").notNull(),
  targetAmount: real("target_amount").notNull().default(0),
  raisedAmount: real("raised_amount").notNull().default(0),
  donorCount: integer("donor_count").notNull().default(0),
  bannerImageUrl: text("banner_image_url"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  status: text("status").notNull().default("active"), // 'draft' | 'active' | 'completed' | 'paused' | 'archived'
  isTaxExempt80G: integer("is_tax_exempt_80g", { mode: "boolean" }).notNull().default(true),
  matchingDonorName: text("matching_donor_name"),
  matchingRatio: real("matching_ratio").default(1.0),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumCampInstIdx: index("idx_alum_camp_inst").on(t.institutionId),
  alumCampCodeIdx: index("idx_alum_camp_code").on(t.code),
  alumCampStatusIdx: index("idx_alum_camp_status").on(t.status),
}));

export const alumniDonations = sqliteTable("alumni_donations", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  campaignId: text("campaign_id").notNull().references(() => alumniDonationCampaigns.id, { onDelete: "cascade" }),
  alumniProfileId: text("alumni_profile_id").references(() => alumniProfiles.id, { onDelete: "set null" }),
  donorName: text("donor_name").notNull(),
  donorEmail: text("donor_email").notNull(),
  donorPhone: text("donor_phone"),
  donorPanTaxId: text("donor_pan_tax_id"),
  isAnonymous: integer("is_anonymous", { mode: "boolean" }).notNull().default(false),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  paymentGateway: text("payment_gateway").notNull().default("razorpay"), // 'razorpay' | 'stripe' | 'upi' | 'bank_wire' | 'cash_cheque'
  gatewayTransactionId: text("gateway_transaction_id").unique(),
  status: text("status").notNull().default("initiated"), // 'initiated' | 'confirmed' | 'failed' | 'refunded'
  glJournalId: text("gl_journal_id"),
  receipt80GNumber: text("receipt_80g_number").unique(),
  receipt80GHash: text("receipt_80g_hash").unique(),
  receipt80GPdfUrl: text("receipt_80g_pdf_url"),
  recognitionTier: text("recognition_tier").notNull().default("supporter"), // 'supporter' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'trustee_circle'
  isCorporateMatching: integer("is_corporate_matching", { mode: "boolean" }).notNull().default(false),
  corporateEmployerName: text("corporate_employer_name"),
  confirmedAt: text("confirmed_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumDonInstIdx: index("idx_alum_don_inst").on(t.institutionId),
  alumDonCampIdx: index("idx_alum_don_camp").on(t.campaignId),
  alumDonAlumIdx: index("idx_alum_don_alum").on(t.alumniProfileId),
  alumDonRcptIdx: index("idx_alum_don_rcpt").on(t.receipt80GNumber),
  alumDonStatusIdx: index("idx_alum_don_status").on(t.status),
}));

export const alumniChapters = sqliteTable("alumni_chapters", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("regional"), // 'regional' | 'international' | 'industry' | 'batch'
  country: text("country").notNull(),
  city: text("city").notNull(),
  description: text("description"),
  presidentAlumniId: text("president_alumni_id").references(() => alumniProfiles.id, { onDelete: "set null" }),
  secretaryAlumniId: text("secretary_alumni_id").references(() => alumniProfiles.id, { onDelete: "set null" }),
  treasurerAlumniId: text("treasurer_alumni_id").references(() => alumniProfiles.id, { onDelete: "set null" }),
  memberCount: integer("member_count").notNull().default(0),
  status: text("status").notNull().default("active"), // 'forming' | 'active' | 'inactive'
  bannerUrl: text("banner_url"),
  foundedDate: text("founded_date"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumChapInstIdx: index("idx_alum_chap_inst").on(t.institutionId),
  alumChapCodeIdx: index("idx_alum_chap_code").on(t.code),
  alumChapStatusIdx: index("idx_alum_chap_status").on(t.status),
}));

export const alumniChapterMembers = sqliteTable("alumni_chapter_members", {
  id: text("id").primaryKey(),
  chapterId: text("chapter_id").notNull().references(() => alumniChapters.id, { onDelete: "cascade" }),
  alumniProfileId: text("alumni_profile_id").notNull().references(() => alumniProfiles.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // 'president' | 'secretary' | 'treasurer' | 'coordinator' | 'member'
  status: text("status").notNull().default("approved"), // 'pending' | 'approved' | 'rejected' | 'left'
  joinedAt: text("joined_at").notNull().default(sql`(current_timestamp)`),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumMemChapIdx: index("idx_alum_mem_chap").on(t.chapterId),
  alumMemProfIdx: index("idx_alum_mem_prof").on(t.alumniProfileId),
}));

export const alumniEvents = sqliteTable("alumni_events", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  chapterId: text("chapter_id").references(() => alumniChapters.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  eventType: text("event_type").notNull().default("reunion"), // 'reunion' | 'networking' | 'webinar' | 'fundraiser' | 'career_fair' | 'annual_meet'
  format: text("format").notNull().default("in_person"), // 'in_person' | 'virtual' | 'hybrid'
  venue: text("venue"),
  virtualMeetingUrl: text("virtual_meeting_url"),
  startDateTime: text("start_date_time").notNull(),
  endDateTime: text("end_date_time").notNull(),
  description: text("description").notNull(),
  bannerUrl: text("banner_url"),
  ticketPrice: real("ticket_price").notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  capacity: integer("capacity").notNull().default(100),
  registeredCount: integer("registered_count").notNull().default(0),
  attendedCount: integer("attended_count").notNull().default(0),
  status: text("status").notNull().default("published"), // 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled'
  organizerAlumniId: text("organizer_alumni_id").references(() => alumniProfiles.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumEvtInstIdx: index("idx_alum_evt_inst").on(t.institutionId),
  alumEvtChapIdx: index("idx_alum_evt_chap").on(t.chapterId),
  alumEvtStatusIdx: index("idx_alum_evt_status").on(t.status),
  alumEvtDateIdx: index("idx_alum_evt_date").on(t.startDateTime),
}));

export const alumniEventRsvps = sqliteTable("alumni_event_rsvps", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => alumniEvents.id, { onDelete: "cascade" }),
  alumniProfileId: text("alumni_profile_id").references(() => alumniProfiles.id, { onDelete: "set null" }),
  studentId: text("student_id").references(() => students.id, { onDelete: "set null" }),
  attendeeName: text("attendee_name").notNull(),
  attendeeEmail: text("attendee_email").notNull(),
  ticketNumber: text("ticket_number").notNull().unique(),
  ticketPassQr: text("ticket_pass_qr").notNull(),
  ticketPassHash: text("ticket_pass_hash").notNull().unique(),
  paymentStatus: text("payment_status").notNull().default("free"), // 'free' | 'pending' | 'paid' | 'refunded'
  amountPaid: real("amount_paid").notNull().default(0),
  isCheckedIn: integer("is_checked_in", { mode: "boolean" }).notNull().default(false),
  checkedInAt: text("checked_in_at"),
  checkedInById: text("checked_in_by_id").references(() => staff.id, { onDelete: "set null" }),
  rsvpStatus: text("rsvp_status").notNull().default("confirmed"), // 'confirmed' | 'waitlisted' | 'cancelled'
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumRsvpEvtIdx: index("idx_alum_rsvp_evt").on(t.eventId),
  alumRsvpTicketIdx: index("idx_alum_rsvp_ticket").on(t.ticketNumber),
  alumRsvpHashIdx: index("idx_alum_rsvp_hash").on(t.ticketPassHash),
}));

export const alumniAuditLogs = sqliteTable("alumni_audit_logs", {
  id: text("id").primaryKey(),
  auditId: text("audit_id").notNull().unique(),
  institutionId: text("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(), // 'profile_created' | 'graduation_transitioned' | 'profile_verified' | 'mentorship_matched' | 'session_completed' | 'job_posted' | 'job_application_submitted' | 'donation_received' | '80g_receipt_issued' | 'chapter_created' | 'event_checkin'
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  timestamp: text("timestamp").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  alumAuditIdIdx: index("idx_alum_audit_id").on(t.auditId),
  alumAuditActionIdx: index("idx_alum_audit_action").on(t.action),
  alumAuditEntityIdx: index("idx_alum_audit_entity").on(t.entityType, t.entityId),
  alumAuditTimeIdx: index("idx_alum_audit_time").on(t.timestamp),
}));



