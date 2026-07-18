import { pgTable as sqliteTable, text, integer, doublePrecision as real, boolean, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const institutions = sqliteTable("institutions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  type: text("type").notNull().default("campus"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").references(() => institutions.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  description: text("description"),
  headUserId: text("head_user_id").references(() => staff.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const subDepartments = sqliteTable("sub_departments", {
  id: text("id").primaryKey(),
  departmentId: text("department_id").notNull().references(() => departments.id),
  name: text("name").notNull(),
  code: text("code"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

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
  isActive: boolean("is_active").notNull().default(true),
  tokenVersion: integer("token_version").notNull().default(0),
  isFirstLogin: boolean("is_first_login").notNull().default(true),
  onboardingCompletedAt: text("onboarding_completed_at"),
  passwordHash: text("password_hash"),
  nfcTagId: text("nfc_tag_id").unique(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  nfcTagIdx: uniqueIndex("idx_staff_nfc_tag").on(t.nfcTagId),
}));

export const staffDepartments = sqliteTable("staff_departments", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  departmentId: text("department_id").notNull().references(() => departments.id),
  isPrimary: boolean("is_primary").notNull().default(false),
});

export const staffInstitutions = sqliteTable("staff_institutions", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  institutionId: text("institution_id").notNull().references(() => institutions.id),
});

export const shifts = sqliteTable("shifts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  gracePeriodMinutes: integer("grace_period_minutes").notNull().default(15),
  departmentId: text("department_id").references(() => departments.id),
  applicableToAll: boolean("applicable_to_all").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const staffShifts = sqliteTable("staff_shifts", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  shiftId: text("shift_id").notNull().references(() => shifts.id),
  effectiveFrom: text("effective_from").notNull(),
  effectiveTo: text("effective_to"),
}, (t) => ({
  staffDateIdx: uniqueIndex("staff_date_idx").on(t.staffId, t.effectiveFrom),
}));

export const attendanceLogs = sqliteTable("attendance_logs", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
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
}, (t) => ({
  staffDateIdx: uniqueIndex("idx_attendance_staff_date").on(t.staffId, t.date),
}));

export const attendanceLocations = sqliteTable("attendance_locations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  institutionId: text("institution_id").references(() => institutions.id),
  nfcTagId: text("nfc_tag_id").unique(),
  qrSecret: text("qr_secret").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  latitude: real("latitude"),
  longitude: real("longitude"),
  radius: real("radius"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  nfcTagIdx: uniqueIndex("idx_location_nfc_tag").on(t.nfcTagId),
}));

export const leaveTypes = sqliteTable("leave_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  daysAllowed: real("days_allowed").notNull(),
  requiresApproval: boolean("requires_approval").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
});

export const leaveBalances = sqliteTable("leave_balances", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  leaveTypeId: text("leave_type_id").notNull().references(() => leaveTypes.id),
  totalDays: real("total_days").notNull(),
  usedDays: real("used_days").notNull().default(0),
  year: integer("year").notNull(),
}, (t) => ({
  staffLeaveYearIdx: uniqueIndex("idx_leave_balances_staff_leave_year").on(t.staffId, t.leaveTypeId, t.year),
}));

export const leaveRequests = sqliteTable("leave_requests", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  leaveTypeId: text("leave_type_id").notNull().references(() => leaveTypes.id),
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
  taskId: text("task_id").notNull().references(() => tasks.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const dailyReports = sqliteTable("daily_reports", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
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
  reportId: text("report_id").notNull().references(() => dailyReports.id),
  taskId: text("task_id").references(() => tasks.id),
  description: text("description").notNull(),
  hoursSpent: real("hours_spent"),
  status: text("status").notNull().default("completed"),
});

export const announcements = sqliteTable("announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("normal"),
  targetRole: text("target_role"),
  targetDepartmentId: text("target_department_id").references(() => departments.id),
  targetInstitutionId: text("target_institution_id").references(() => institutions.id),
  createdById: text("created_by_id").notNull().references(() => staff.id),
  isActive: boolean("is_active").notNull().default(true),
  pinnedUntil: text("pinned_until"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const announcementReads = sqliteTable("announcement_reads", {
  id: text("id").primaryKey(),
  announcementId: text("announcement_id").notNull().references(() => announcements.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  readAt: text("read_at").notNull().default(sql`(current_timestamp)`),
});

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
  createdById: text("created_by_id").notNull().references(() => staff.id),
  maxAttendees: integer("max_attendees"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const eventRsvps = sqliteTable("event_rsvps", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  status: text("status").notNull().default("pending"),
  respondedAt: text("responded_at").notNull().default(sql`(current_timestamp)`),
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
  targetDepartmentId: text("target_department_id").references(() => departments.id),
  targetInstitutionId: text("target_institution_id").references(() => institutions.id),
  uploadedById: text("uploaded_by_id").notNull().references(() => staff.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const polls = sqliteTable("polls", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  targetRole: text("target_role"),
  targetDepartmentId: text("target_department_id").references(() => departments.id),
  targetInstitutionId: text("target_institution_id").references(() => institutions.id),
  createdById: text("created_by_id").notNull().references(() => staff.id),
  expiresAt: text("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const pollResponses = sqliteTable("poll_responses", {
  id: text("id").primaryKey(),
  pollId: text("poll_id").notNull().references(() => polls.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  selectedOption: integer("selected_option").notNull(),
  respondedAt: text("responded_at").notNull().default(sql`(current_timestamp)`),
}, (t) => ({
  pollStaffIdx: uniqueIndex("idx_poll_responses_poll_staff").on(t.pollId, t.staffId),
}));

export const bookingResources = sqliteTable("booking_resources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  capacity: integer("capacity"),
  location: text("location"),
  institutionId: text("institution_id").references(() => institutions.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  resourceId: text("resource_id").notNull().references(() => bookingResources.id),
  bookerId: text("booker_id").notNull().references(() => staff.id),
  title: text("title").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").notNull().default("pending"),
  approvedById: text("approved_by_id").references(() => staff.id),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const helpDeskTickets = sqliteTable("help_desk_tickets", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("it"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  submittedById: text("submitted_by_id").notNull().references(() => staff.id),
  assignedToId: text("assigned_to_id").references(() => staff.id),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const helpDeskComments = sqliteTable("help_desk_comments", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull().references(() => helpDeskTickets.id),
  staffId: text("staff_id").notNull().references(() => staff.id),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("general"),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const staffRecognition = sqliteTable("staff_recognition", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  recognitionType: text("recognition_type").notNull(),
  message: text("message"),
  recognizedById: text("recognized_by_id").references(() => staff.id),
  date: text("date").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

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
  isActive: boolean("is_active").notNull().default(true),
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
});

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
});

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

export const grievances = sqliteTable("grievances", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").references(() => staff.id),
  isAnonymous: boolean("is_anonymous").notNull().default(true),
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

export const staffAvailability = sqliteTable("staff_availability", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().unique().references(() => staff.id),
  status: text("status").notNull().default("available"),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const performanceReviews = sqliteTable("performance_reviews", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staff.id),
  reviewerId: text("reviewer_id").notNull().references(() => staff.id),
  period: text("period").notNull(),
  rating: integer("rating"),
  goals: jsonb("goals").$type<string[]>(),
  achievements: text("achievements"),
  areasForImprovement: text("areas_for_improvement"),
  managerComments: text("manager_comments"),
  status: text("status").notNull().default("draft"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  staffId: text("staff_id").references(() => staff.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

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
});

export const vehicles = sqliteTable("vehicles", {
  id: text("id").primaryKey(),
  registrationNumber: text("registration_number").notNull().unique(),
  model: text("model").notNull(),
  type: text("type").notNull(),
  capacity: integer("capacity").notNull().default(1),
  fuelType: text("fuel_type").notNull().default("petrol"),
  institutionId: text("institution_id").references(() => institutions.id),
  isActive: boolean("is_active").notNull().default(true),
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

export const approvalDelegations = sqliteTable("approval_delegations", {
  id: text("id").primaryKey(),
  delegatorId: text("delegator_id").notNull().references(() => staff.id),
  delegateId: text("delegate_id").notNull().references(() => staff.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  reason: text("reason"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const checklistTemplates = sqliteTable("checklist_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("onboarding"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
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

// ─── WebView Auth Handoff (nonce replay protection) ───

export const usedNonces = sqliteTable("used_nonces", {
  jti: text("jti").primaryKey(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const staffChecklistTasks = sqliteTable("staff_checklist_tasks", {
  id: text("id").primaryKey(),
  checklistId: text("checklist_id").notNull().references(() => staffChecklists.id),
  title: text("title").notNull(),
  description: text("description"),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedById: text("completed_by_id").references(() => staff.id),
  completedAt: text("completed_at"),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});
