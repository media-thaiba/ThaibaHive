import { z } from "zod";

export const paginationSchema = z.object({
  page: z.preprocess(
    (val) => (val === null || val === undefined ? undefined : val),
    z.coerce.number().int().min(1).default(1)
  ),
  limit: z.preprocess(
    (val) => (val === null || val === undefined ? undefined : val),
    z.coerce.number().int().min(1).max(100).default(20)
  ),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const pushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["android", "ios", "web"]).default("android"),
  deviceModel: z.string().optional(),
});

export type PushTokenInput = z.infer<typeof pushTokenSchema>;

export const staffCreateSchema = z.object({
  email: z.string().email(),
  employeeId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  designation: z.string().optional(),
  role: z.string().optional(),
  password: z.string().min(8).optional(),
  departmentIds: z.array(z.string()).optional(),
  institutionIds: z.array(z.string()).optional(),
  aadhaar: z.string().optional(),
  pan: z.string().optional(),
  bankAccount: z.string().optional(),
  ifscCode: z.string().optional(),
});

export const taskCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedToId: z.string().optional(),
  departmentId: z.string().optional(),
  dueDate: z.string().optional(),
});

export const leaveCreateSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  daysCount: z.number().positive(),
  reason: z.string().optional(),
});

export const announcementCreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  priority: z.enum(["normal", "high", "urgent"]).optional(),
  targetRole: z.enum(["super_admin", "admin", "principal", "hod", "staff"]).optional(),
  targetDepartmentId: z.string().optional(),
  targetInstitutionId: z.string().optional(),
  pinnedUntil: z.string().optional(),
});

export const eventCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  eventType: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  location: z.string().optional(),
  departmentId: z.string().optional(),
  institutionId: z.string().optional(),
  maxAttendees: z.number().int().positive().optional(),
});

export const assetCreateSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  institutionId: z.string().optional(),
  assignedToId: z.string().optional(),
  location: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.number().nonnegative().optional(),
  warrantyEnd: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export const expenseClaimCreateSchema = z
  .object({
    amount: z.number().positive(),
    category: z.string().min(1),
    description: z.string().min(1),
    receiptUrl: z.string().optional(),
  })
  .refine(
    (data) => data.amount < 1000 || (data.receiptUrl && data.receiptUrl.trim().length > 0),
    {
      message: "Receipt attachment is required for expense claims of ₹1,000 or more",
      path: ["receiptUrl"],
    }
  );

export const expenseClaimReviewSchema = z.object({
  status: z.enum(["pending_hod", "pending_finance", "approved", "disbursed", "rejected"]),
  reviewNotes: z.string().optional().nullable(),
}).refine(
  (data) => data.status !== "rejected" || (data.reviewNotes && data.reviewNotes.trim().length > 0),
  {
    message: "A comment is required when rejecting an expense claim",
    path: ["reviewNotes"],
  }
);

export const purchaseCreateSchema = z.object({
  itemName: z.string().min(1),
  quantity: z.number().int().positive(),
  estimatedCost: z.number().nonnegative(),
  justification: z.string().optional(),
});

export const visitorCreateSchema = z.object({
  name: z.string().min(1).max(100).refine((val) => !/[<>]/.test(val), {
    message: "Visitor name cannot contain HTML markup",
  }),
  contact: z.string().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  hostStaffId: z.string().optional(),
  purpose: z.string().min(1).max(255).refine((val) => !/[<>]/.test(val), {
    message: "Purpose cannot contain HTML markup",
  }),
  notes: z.string().optional(),
});

export const vehicleCreateSchema = z.object({
  registrationNumber: z.string().min(1),
  model: z.string().min(1),
  type: z.string().min(1),
  capacity: z.number().int().positive().optional(),
  fuelType: z.string().optional(),
  institutionId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const circularCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  fileUrl: z.string().min(1),
  fileType: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  category: z.string().optional(),
  targetRole: z.string().optional(),
  targetDepartmentId: z.string().optional(),
  targetInstitutionId: z.string().optional(),
});

export const helpDeskTicketCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().optional(),
  priority: z.string().optional(),
  assignedToId: z.string().optional(),
});

export const recognitionCreateSchema = z.object({
  recipientId: z.string().min(1),
  recognitionType: z.string().min(1),
  message: z.string().optional(),
  date: z.string().optional(),
});

export const canteenCreateSchema = z.object({
  date: z.string().min(1),
  mealType: z.string().min(1),
  status: z.string().min(1),
  guestCount: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export const bookingCreateSchema = z.object({
  resourceId: z.string().min(1),
  title: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  notes: z.string().optional(),
  description: z.string().optional(),
});

export const pollCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  targetRole: z.string().optional(),
  targetDepartmentId: z.string().optional(),
  targetInstitutionId: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const checkInSchema = z
  .object({
    method: z.enum(["nfc", "qr"]),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    accuracy: z.number().optional(),
    wifiSsid: z.string().optional(),
    nfcTagId: z.string().optional(),
    qrCode: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.method === "nfc") return !!data.nfcTagId;
      if (data.method === "qr") return !!data.qrCode;
      return false;
    },
    { message: "NFC check-in requires nfcTagId; QR check-in requires qrCode" }
  );

export const chatRoomCreateSchema = z.object({
  name: z.string().min(1).optional(),
  participantIds: z.array(z.string()).min(1),
  isDirectMessage: z.boolean().optional().default(false),
});

export const chatMessageCreateSchema = z.object({
  text: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.enum(["text", "image", "document", "voice"]).optional().default("text"),
}).refine(
  (data) => !!(data.text || data.mediaUrl),
  { message: "Message must have text or media" }
);

export const chatParticipantAddSchema = z.object({
  staffId: z.string().min(1),
  role: z.enum(["Manager", "Member"]).optional().default("Member"),
});

export const verificationSettingsSchema = z.object({
  institutionId: z.string().nullable().optional(),
  isEnabled: z.boolean().optional(),
  shadowMode: z.boolean().optional(),
  checkIntervalMinutes: z.number().int().min(1).max(180).optional(),
  gracePeriodMinutes: z.number().int().min(0).max(60).optional(),
  autoCheckoutOnViolation: z.boolean().optional(),
  geofenceRadiusMeters: z.number().int().min(10).max(5000).optional(),
  lowBatteryIntervalMinutes: z.number().int().min(1).max(180).optional(),
  criticalBatterySuspend: z.boolean().optional(),
});

export const mediaFolderCreateSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
});

export const mediaAssetCreateSchema = z.object({
  name: z.string().min(1),
  fileUrl: z.string().min(1),
  thumbnailUrl: z.string().optional().nullable(),
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
  fileType: z.enum(["image", "video", "audio", "document"]),
  status: z.enum(["ready", "processing", "failed"]).optional().default("ready"),
  folderId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const mediaUploadCompleteSchema = z.object({
  clientEventId: z.string().uuid(),
  path: z.string().min(1).max(512),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i, "sha256 must be a 64-char hex digest"),
  name: z.string().min(1).max(255),
  mime: z.string().min(1).max(128),
  size: z.number().int().positive().max(100 * 1024 * 1024, "Files larger than 100 MB are not supported"),
  folderId: z.string().optional().nullable(),
});

export const mediaShareLinkCreateSchema = z.object({
  assetId: z.string().optional().nullable(),
  folderId: z.string().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  // min(8) — this endpoint is public and unauthenticated, so brute-force resistance matters
  password: z.string().min(8).optional().nullable(),
}).refine(d => !!(d.assetId || d.folderId), {
  message: "Either assetId or folderId is required",
});

export const mediaBatchDownloadSchema = z.object({
  assetIds: z.array(z.string().min(1)).max(100).optional(),
  token: z.string().optional(),
  folderId: z.string().optional(),
  password: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

export const dailyReportCreateSchema = z.object({
  date: z.string().min(1),
  summary: z.string().optional(),
  status: z.enum(["draft", "submitted"]).optional(),
  tasks: z.array(z.object({
    taskId: z.string().optional().nullable(),
    description: z.string().min(1),
    hoursSpent: z.number().min(0.1).max(24),
    status: z.enum(["completed", "in_progress"]).optional(),
  })).optional(),
});

export const dailyReportUpdateSchema = z.object({
  date: z.string().min(1).optional(),
  summary: z.string().optional(),
  status: z.enum(["draft", "submitted"]).optional(),
  tasks: z.array(z.object({
    taskId: z.string().optional().nullable(),
    description: z.string().min(1),
    hoursSpent: z.number().min(0.1).max(24),
    status: z.enum(["completed", "in_progress"]).optional(),
  })).optional(),
});

export const dailyReportReviewSchema = z.object({
  status: z.enum(["reviewed", "rejected"]),
  reviewerComment: z.string().optional().nullable(),
}).refine(
  (data) => data.status !== "rejected" || (data.reviewerComment && data.reviewerComment.trim().length > 0),
  {
    message: "A comment is required when rejecting a report",
    path: ["reviewerComment"],
  }
);

export const performanceReviewCreateSchema = z.object({
  staffId: z.string().min(1),
  period: z.string().min(1),
  goals: z.array(z.string()).optional(),
});

export const performanceReviewUpdateSchema = z.object({
  goals: z.array(z.string()).optional(),
  achievements: z.string().optional(),
  areasForImprovement: z.string().optional(),
  managerComments: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  status: z.enum(["draft", "submitted", "completed"]).optional(),
});

export const grievanceCreateSchema = z.object({
  isAnonymous: z.boolean().optional().default(true),
  category: z.enum(["workplace", "harassment", "infrastructure", "payroll", "management", "general"]).optional().default("general"),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().min(1, "Description is required"),
});

export const grievanceUpdateSchema = z.object({
  status: z.enum(["open", "in_review", "resolved", "dismissed"]).optional(),
  response: z.string().optional(),
}).refine(
  (data) => data.status !== undefined || data.response !== undefined,
  { message: "At least one of status or response must be provided" }
);

export const financialTransactionCreateSchema = z.object({
  institutionId: z.string().min(1, "institutionId required"),
  type: z.string().min(1, "type required"),
  category: z.string().min(1, "category required"),
  amount: z.number().positive("amount must be a positive number"),
  description: z.string().optional(),
  transactionDate: z.string().min(1, "transactionDate required"),
  notes: z.string().optional(),
});

export const systemUpdatePostSchema = z.object({
  version: z.string().optional(),
  downloadUrl: z.string().optional(),
  releaseNotes: z.string().optional(),
  isForceUpdate: z.boolean().optional(),
  sha256: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
});

export const globalSearchSchema = z.object({
  q: z
    .string()
    .min(1, "Search query is required")
    .max(100, "Search query too long")
    .regex(/^[\p{L}\p{N}\s\-@.]+$/u, "Invalid characters in search query")
    .transform((s) => s.replace(/[%_]/g, "").trim()),
  entityTypes: z
    .array(
      z.enum([
        "students",
        "staff",
        "tasks",
        "events",
        "announcements",
        "daily-reports",
        "purchase-requests",
        "help-desk-tickets",
        "recognition",
        "asset-inventory",
        "circulars",
        "bookings",
        "polls",
        "comments",
        "media-assets",
      ])
    )
    .optional()
    .default([
      "students",
      "staff",
      "tasks",
      "events",
      "announcements",
      "daily-reports",
      "purchase-requests",
      "help-desk-tickets",
      "recognition",
      "asset-inventory",
      "circulars",
      "bookings",
      "polls",
      "comments",
      "media-assets",
    ]),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export const studentSearchSchema = z.object({
  query: z.string().min(1),
  admissionNo: z.string().optional(),
  classId: z.string().optional(),
  name: z.string().optional(),
  institutionId: z.string().optional(),
});

export const staffSearchSchema = z.object({
  query: z.string().min(1),
  email: z.string().email().optional(),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  institutionId: z.string().optional(),
  role: z.enum(["super_admin", "admin", "principal", "hod", "staff"]).optional(),
});

export const taskSearchSchema = z.object({
  query: z.string().min(1),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedToId: z.string().optional(),
  departmentId: z.string().optional(),
  assignedById: z.string().optional(),
});

export const eventSearchSchema = z.object({
  query: z.string().min(1),
  eventType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  departmentId: z.string().optional(),
  institutionId: z.string().optional(),
});

export const departmentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  headUserId: z.string().optional().nullable(),
  institutionId: z.string().optional().nullable(),
});

export const institutionUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  type: z.enum(["campus", "college", "school"]).optional(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
});

export const examCreateSchema = z.object({
  title: z.string().min(1),
  academicYear: z.string().min(1),
  term: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  gradeScaleId: z.string().optional(),
  institutionId: z.string().optional(),
});

export const examScheduleCreateSchema = z.object({
  examId: z.string().min(1),
  courseId: z.string().optional(),
  subjectName: z.string().min(1),
  examDate: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  durationMinutes: z.number().int().positive().default(180),
  maxMarks: z.number().positive().default(100),
  passMarks: z.number().positive().default(40),
  roomNumber: z.string().optional(),
});

export const hallTicketIssueSchema = z.object({
  examId: z.string().min(1),
  studentId: z.string().min(1),
  overrideFeeLock: z.boolean().optional().default(false),
  overrideReason: z.string().optional(),
});

export const markEntryBatchSchema = z.object({
  examScheduleId: z.string().min(1),
  doubleBlind: z.boolean().optional().default(false),
  entries: z.array(z.object({
    studentId: z.string().min(1),
    marksObtained: z.number().min(0).nullable().optional(),
    isAbsent: z.boolean().optional().default(false),
    remarks: z.string().optional(),
  })).min(1),
});

// ─── Services Module Validation Schemas (Sprint-006) ───

export const vehicleBookingSchema = z.object({
  vehicleId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().optional(),
  purpose: z.string().min(1),
  destination: z.string().optional(),
  notes: z.string().optional(),
});

export const canteenItemCreateSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["breakfast", "lunch", "snacks", "beverages"]).default("snacks"),
  price: z.number().positive(),
  isAvailable: z.boolean().optional().default(true),
  dietaryFlags: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const canteenMenuPublishSchema = z.object({
  date: z.string().min(1),
  mealType: z.enum(["breakfast", "lunch", "snacks"]).default("lunch"),
  itemsJson: z.string().min(1),
});

export const canteenPassCreateSchema = z.object({
  userId: z.string().min(1),
  passCode: z.string().min(1),
  balance: z.number().min(0).default(0.0),
  dailyLimit: z.number().positive().optional(),
});

export const canteenRedeemSchema = z.object({
  passCode: z.string().min(1),
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
  idempotencyKey: z.string().optional(),
});

export const visitorPreRegisterSchema = z.object({
  visitorName: z.string().min(1),
  visitorPhone: z.string().min(1),
  visitorEmail: z.string().email().optional().or(z.literal("")),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  hostStaffId: z.string().min(1),
  purpose: z.string().min(1),
  expectedDate: z.string().min(1),
  expectedTimeWindow: z.string().optional(),
});

export const visitorPassVerifySchema = z.object({
  qrPayload: z.string().min(1),
  gatekeeperId: z.string().optional(),
});

// ─── Performance Reviews & HR Development Schemas (Sprint-007) ───

export const performanceCycleCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  cycleType: z.enum(["annual", "semi_annual", "quarterly"]).default("quarterly"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  selfAssessmentDeadline: z.string().min(1, "Self assessment deadline is required"),
  managerReviewDeadline: z.string().min(1, "Manager review deadline is required"),
});

export const competencyFrameworkCreateSchema = z.object({
  name: z.string().min(1, "Framework name is required"),
  departmentId: z.string().optional(),
  roleScope: z.string().optional().default("all"),
  metricsJson: z.string().min(1, "Metrics JSON configuration is required"),
});

export const evaluationFormCreateSchema = z.object({
  frameworkId: z.string().min(1, "Framework ID is required"),
  title: z.string().min(1, "Form title is required"),
  description: z.string().optional(),
  metricsConfigJson: z.string().min(1, "Metrics config JSON is required"),
  ratingScale: z.string().optional().default("1-5"),
});

export const selfAssessmentSubmitSchema = z.object({
  ratings: z.array(
    z.object({
      metricId: z.string().min(1),
      score: z.number().min(1).max(5),
      comments: z.string().optional(),
    })
  ).min(1, "At least one metric rating is required"),
  selfComments: z.string().optional(),
});

export const managerEvaluationSubmitSchema = z.object({
  ratings: z.array(
    z.object({
      metricId: z.string().min(1),
      score: z.number().min(1).max(5),
      comments: z.string().optional(),
    })
  ).min(1, "At least one metric rating is required"),
  managerComments: z.string().optional(),
  recommendedGrade: z.enum(["A+", "A", "B", "C", "D"]).optional(),
});

export const performanceGoalCreateSchema = z.object({
  reviewId: z.string().optional(),
  title: z.string().min(1, "Goal title is required"),
  description: z.string().optional(),
  targetDate: z.string().min(1, "Target date is required"),
  progressPercentage: z.number().int().min(0).max(100).optional().default(0),
});

export const feedbackRequestCreateSchema = z.object({
  reviewId: z.string().min(1),
  peerStaffId: z.string().min(1),
  feedbackText: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
});

// ─── AI Predictive Analytics & Sync Engine Validation Schemas (Sprint-008) ───

export const aiPredictionRunSchema = z.object({
  domain: z.enum(["attendance", "fees", "academic", "operational"]),
  targetEntityId: z.string().optional(),
  targetEntityType: z.enum(["student", "staff", "department"]).optional(),
  timeframeDays: z.coerce.number().int().min(7).max(365).optional().default(30),
});

export const aiAnomalyUpdateSchema = z.object({
  status: z.enum(["unresolved", "investigating", "resolved", "dismissed"]),
  resolutionNotes: z.string().optional(),
});

export const deltaSyncQuerySchema = z.object({
  sinceVersion: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
  deviceId: z.string().min(1, "deviceId is required"),
});

export const syncPushPayloadSchema = z.object({
  deviceId: z.string().min(1, "deviceId is required"),
  clientSyncVersion: z.number().int().min(0),
  changes: z.array(
    z.object({
      entityType: z.string().min(1),
      entityId: z.string().min(1),
      action: z.enum(["CREATE", "UPDATE", "DELETE"]),
      data: z.record(z.string(), z.any()),
      clientTimestamp: z.string().optional(),
    })
  ),
});

// ─── Multi-Campus Regional Analytics & Enterprise Data Warehouse Validation Schemas (Sprint-009) ───

export const regionalGroupCreateSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  code: z.string().min(1, "Group code is required"),
  description: z.string().optional(),
  regionalDirectorId: z.string().optional(),
});

export const regionalClusterAssignSchema = z.object({
  regionalGroupId: z.string().min(1, "regionalGroupId is required"),
  institutionId: z.string().min(1, "institutionId is required"),
  clusterCategory: z.enum(["standard", "tier_1", "tier_2", "rural", "urban"]).default("standard"),
});

export const regionalAccessGrantSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  regionalGroupId: z.string().min(1, "regionalGroupId is required"),
  role: z.enum(["regional_admin", "regional_auditor"]),
  expiresAt: z.string().optional(),
});

export const regionalBenchmarkQuerySchema = z.object({
  regionalGroupId: z.string().min(1, "regionalGroupId is required"),
  period: z.enum(["30d", "60d", "90d", "term", "annual"]).default("30d"),
  metricDomain: z.enum(["attendance", "fees", "academic", "ai_risk", "all"]).default("all"),
});

export const regionalHodRankingQuerySchema = z.object({
  regionalGroupId: z.string().min(1, "regionalGroupId is required"),
  discipline: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const pushAlertDispatchSchema = z.object({
  alertId: z.string().min(1, "alertId is required"),
  severity: z.enum(["critical", "high", "medium", "info"]).default("critical"),
  title: z.string().min(1, "title is required"),
  body: z.string().min(1, "body is required"),
  targetRegionalGroupId: z.string().optional(),
  targetRoles: z.array(z.string()).optional(),
});

export const dwEtlTriggerSchema = z.object({
  regionalGroupId: z.string().optional(),
  runType: z.enum(["incremental", "full"]).default("incremental"),
});

// ─── Autonomous Enterprise Operations & Self-Healing Platform Engine Validation Schemas (Sprint-010) ───

export const autonomousWorkflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required"),
  triggerType: z.enum(["anomaly_detected", "threshold_breached", "schedule"]).default("anomaly_detected"),
  status: z.enum(["active", "paused", "disabled"]).default("active"),
});

export const remediationTicketSchema = z.object({
  anomalyId: z.string().optional(),
  ruleId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  severity: z.enum(["critical", "high", "medium", "low"]).default("high"),
  category: z.enum(["attendance", "finance", "academics", "operations"]).default("attendance"),
  affectedStudentId: z.string().optional(),
  assignedStaffId: z.string().optional(),
  autoAssign: z.boolean().optional().default(true),
});

export const financialForecastQuerySchema = z.object({
  campusId: z.string().optional(),
  horizonDays: z.coerce.number().int().min(7).max(365).default(90),
  confidenceLevel: z.coerce.number().min(0.5).max(0.99).default(0.95),
});

export const complianceReportSchema = z.object({
  frameworkCode: z.string().min(1, "frameworkCode is required"),
  institutionId: z.string().optional(),
  format: z.enum(["pdf", "csv", "json"]).default("pdf"),
});

// ─── Autonomous Enterprise AI Agent Swarms & Cross-Regional AI Copilots Schemas (Sprint-011) ───

export const copilotQuerySchema = z.object({
  agentType: z.enum(["academic_advisor", "financial_controller", "compliance_auditor"]).default("academic_advisor"),
  campusId: z.string().optional(),
  query: z.string().min(1, "query is required"),
  contextParams: z.record(z.string(), z.any()).optional(),
});

export const copilotFeedbackSchema = z.object({
  recommendationId: z.string().min(1, "recommendationId is required"),
  approvalStatus: z.enum(["APPROVED", "REJECTED", "MODIFIED"]),
  feedbackNotes: z.string().optional(),
});

export const agentConfigSchema = z.object({
  agentType: z.enum(["academic_advisor", "financial_controller", "compliance_auditor"]),
  name: z.string().min(1, "Name is required"),
  isActive: z.boolean().default(true),
  capabilities: z.array(z.string()).optional(),
});

export const timeSeriesQuerySchema = z.object({
  campusId: z.string().optional(),
  granularity: z.enum(["monthly", "quarterly", "weekly"]).default("monthly"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// ─── Sprint-012: Real-Time Event Streaming & Predictive Allocation Schemas ───

export const realtimeStreamQuerySchema = z.object({
  channels: z.array(z.string()).optional(),
  connectionType: z.enum(["websocket", "sse"]).default("websocket"),
  lastEventId: z.string().optional(),
});

export const triggerRuleSchema = z.object({
  ruleName: z.string().min(1, "ruleName is required"),
  eventType: z.enum(["absenteeism", "fee_default", "grade_drop", "compliance_warning"]),
  conditions: z.record(z.string(), z.any()),
  actionChannel: z.enum(["sms", "push", "email", "webhook"]),
  recipientGroup: z.enum(["parents", "staff", "hods", "principals"]),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  isActive: z.boolean().default(true),
});

export const retentionPredictionQuerySchema = z.object({
  campusId: z.string().optional(),
  riskThreshold: z.coerce.number().min(0).max(1).default(0.7),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export const budgetSimulationSchema = z.object({
  scenarioName: z.string().min(1, "scenarioName is required"),
  campusIds: z.array(z.string()).optional(),
  staffCostDelta: z.number().default(0),
  tuitionFeeDelta: z.number().default(0),
  facilityBudgetDelta: z.number().default(0),
  scholarshipAllocationDelta: z.number().default(0),
});

// ─── Sprint-013: Autonomous Federated Governance & Operational Resilience Schemas ───

export const federatedPolicySchema = z.object({
  title: z.string().min(1, "title is required"),
  category: z.string().default("general"),
  content: z.record(z.string(), z.any()),
  status: z.enum(["DRAFT", "PROPAGATING", "ACTIVE", "CONFLICT", "SUPERSEDED"]).default("DRAFT"),
  effectiveDate: z.string().optional(),
});

export const crossTenantRoleMappingSchema = z.object({
  sourceTenantId: z.string().min(1, "sourceTenantId is required"),
  targetTenantId: z.string().min(1, "targetTenantId is required"),
  sourceRole: z.string().min(1, "sourceRole is required"),
  targetRole: z.string().min(1, "targetRole is required"),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
  isActive: z.boolean().default(true),
});

export const circuitBreakerConfigSchema = z.object({
  serviceName: z.string().min(1, "serviceName is required"),
  maxFailureRate: z.number().min(0.01).max(1.0).default(0.2),
  maxMedianLatencyMs: z.number().min(50).max(10000).default(2000),
  cooldownPeriodSec: z.number().min(5).max(3600).default(60),
});

export const offlineSyncPayloadSchema = z.object({
  deviceId: z.string().min(1, "deviceId is required"),
  mutations: z.array(
    z.object({
      id: z.string().min(1),
      mutationType: z.enum(["CREATE", "UPDATE", "DELETE"]),
      entityType: z.string().min(1),
      payload: z.record(z.string(), z.any()),
      clientTimestamp: z.string().min(1),
    })
  ).min(1, "At least one mutation payload is required"),
});

export const voiceQuerySchema = z.object({
  audioStreamBase64: z.string().optional(),
  transcriptText: z.string().optional(),
  audioFormat: z.enum(["pcm", "wav", "webm", "mp3"]).default("pcm"),
  language: z.string().default("en-US"),
});

export const executiveAnalyticsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  institutionId: z.string().optional(),
});

export type ExecutiveAnalyticsQuery = z.infer<typeof executiveAnalyticsQuerySchema>;

export const syncPolicyUpdateSchema = z.object({
  minBandwidthKbps: z.number().int().min(0).max(1000000).optional(),
  maxLatencyMs: z.number().int().min(0).max(60000).optional(),
  batchSize: z.number().int().min(1).max(200).optional(),
  compressionLevel: z.number().int().min(1).max(9).optional(),
  retryBackoffMs: z.number().int().min(1000).max(120000).optional(),
});

export type SyncPolicyUpdateInput = z.infer<typeof syncPolicyUpdateSchema>;

// ─── Sprint-025: Workspace Preferences ───────────────────────────────────────

export const workspacePreferenceUpdateSchema = z.object({
  workspaceType: z.enum(["principal", "teacher", "cashier", "parent"]),
  layoutConfig: z
    .array(
      z.object({
        widgetId: z.string().min(1),
        enabled: z.boolean(),
        order: z.number().int().min(0),
      })
    )
    .min(1)
    .max(20),
});

export type WorkspacePreferenceUpdateInput = z.infer<typeof workspacePreferenceUpdateSchema>;

export const reportScheduleCreateSchema = z.object({
  title: z.string().min(1),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  format: z.enum(["pdf", "excel"]),
  recipients: z.array(z.string().email()).min(1),
  isActive: z.boolean().default(true),
});

export type ReportScheduleCreateInput = z.infer<typeof reportScheduleCreateSchema>;

// ─── Sprint-028: Scheduled Jobs and Telemetry ─────────────────────────────────

export const jobFilterSchema = z.object({
  status: z.enum(["queued", "processing", "success", "failed", "paused", "cancelled"]).optional(),
  type: z.enum(["attendance", "finance", "academics"]).optional(),
  institutionId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type JobFilterInput = z.infer<typeof jobFilterSchema>;

export const jobTriggerSchema = z.object({
  type: z.enum(["attendance", "finance", "academics"]),
  format: z.enum(["pdf", "excel"]),
  options: z.union([
    z.record(z.string(), z.any()),
    z.string().refine((val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, { message: "Invalid JSON options string" })
  ]),
  institutionId: z.string().min(1),
});

export type JobTriggerInput = z.infer<typeof jobTriggerSchema>;

export const jobUpdateSchema = z.object({
  status: z.enum(["queued", "paused", "cancelled"]),
});

export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;

// ─── Sprint-033: Mobile Sync Telemetry ───────────────────────────────────────

export const mobileSyncTelemetryEventSchema = z.object({
  id: z.string().min(1),
  batchSize: z.number().int().nonnegative(),
  syncDurationMs: z.number().nonnegative(),
  networkType: z.enum(["wifi", "cellular", "ethernet", "offline", "unknown"]).default("unknown"),
  retryCount: z.number().int().nonnegative().default(0),
  conflictCount: z.number().int().nonnegative().default(0),
  success: z.boolean().default(true),
  errorCode: z.string().optional().nullable(),
  timestamp: z.string().optional(),
});

export const mobileSyncTelemetryBatchSchema = z.object({
  deviceId: z.string().min(1),
  appVersion: z.string().optional().default("1.0.0"),
  reportedAt: z.string().optional(),
  events: z.array(mobileSyncTelemetryEventSchema).min(1).max(100),
});

export type MobileSyncTelemetryBatchInput = z.infer<typeof mobileSyncTelemetryBatchSchema>;

// ─── Autonomous Federated Learning & EdgeMesh Validation Schemas (Sprint-044) ───

export const afedModelRegisterSchema = z.object({
  modelId: z.string().min(1, "modelId is required"),
  name: z.string().min(1, "name is required"),
  domain: z.enum(["retention", "financial", "resource_demand", "academic", "energy"]).default("retention"),
  version: z.string().default("1.0.0"),
  architecture: z.string().default("logistic_regression"),
  inputDimensions: z.number().int().min(1).default(5),
  outputDimensions: z.number().int().min(1).default(1),
  featureNames: z.array(z.string()).default([]),
  targetName: z.string().default("target"),
  hyperparameters: z.object({
    learningRate: z.number().default(0.01),
    batchSize: z.number().default(32),
    localEpochs: z.number().default(3),
    l2ClipNorm: z.number().optional().default(1.0),
    differentialPrivacyEpsilon: z.number().optional(),
  }).optional(),
  initialWeights: z.array(z.number()).optional(),
});

export const afedRoundAggregateSchema = z.object({
  modelId: z.string().min(1, "modelId is required"),
  roundNumber: z.number().int().min(0).optional(),
  algorithm: z.enum(["FedAvg", "FedProx"]).default("FedAvg"),
  aggregationAlgorithm: z.enum(["FedAvg", "FedProx"]).optional(),
  clientUpdates: z.array(
    z.object({
      nodeId: z.string().min(1),
      modelId: z.string().optional(),
      weights: z.array(z.number()),
      sampleCount: z.number().int().min(1),
      localLoss: z.number().optional(),
      localAccuracy: z.number().optional(),
      trainingDurationMs: z.number().optional(),
    })
  ).min(1, "At least one client update is required"),
});

export const afedNodeRegisterSchema = z.object({
  nodeId: z.string().min(1, "nodeId is required"),
  campusId: z.string().min(1, "campusId is required"),
  campusName: z.string().min(1, "campusName is required"),
  status: z.enum(["idle", "training", "reporting", "offline"]).default("idle"),
  computeTier: z.enum(["edge_device", "campus_server", "cloud_coordinator"]).default("campus_server"),
  sampleCount: z.number().int().min(0).default(0),
  availableMemoryMb: z.number().int().default(1024),
  networkLatencyMs: z.number().default(20),
});

export const afedPrivacyBudgetResetSchema = z.object({
  tenantId: z.string().min(1, "tenantId is required"),
  newBudgetEpsilon: z.number().min(0.1).max(100.0).default(10.0),
  reason: z.string().min(1, "reason is required"),
});

export const afedDriftEvaluateSchema = z.object({
  modelId: z.string().min(1, "modelId is required"),
  features: z.array(
    z.object({
      featureName: z.string().min(1),
      baselineValues: z.array(z.number()).min(1),
      currentValues: z.array(z.number()).min(1),
    })
  ).min(1, "At least one feature distribution is required"),
  autoTriggerRetraining: z.boolean().default(false),
});

export const afedInferencePredictSchema = z.object({
  modelId: z.string().min(1, "modelId is required"),
  inputVector: z.array(z.number()).min(1, "inputVector cannot be empty"),
  allowCloudFallback: z.boolean().default(true),
});

export const afedBenchmarkQuerySchema = z.object({
  reportingYear: z.string().default("2026"),
});

// ─── Sprint-103: Finance Operations Validation Schemas ───

export const taxJurisdictionCreateSchema = z.object({
  countryCode: z.string().min(2).max(3),
  regionCode: z.string().min(1).max(10),
  jurisdictionName: z.string().min(1),
  defaultTaxRate: z.number().min(0).max(1),
  taxCode: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});
export type TaxJurisdictionCreateInput = z.infer<typeof taxJurisdictionCreateSchema>;

export const taxRateOverrideCreateSchema = z.object({
  institutionId: z.string().min(1).optional(),
  jurisdictionId: z.string().min(1),
  category: z.enum(["tuition", "hostel", "transport", "supplies", "services", "general"]),
  overrideRate: z.number().min(0).max(1),
  exemptionReason: z.string().optional(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional(),
  isActive: z.boolean().default(true),
});
export type TaxRateOverrideCreateInput = z.infer<typeof taxRateOverrideCreateSchema>;

export const purchaseApprovalTierCreateSchema = z.object({
  institutionId: z.string().min(1).optional(),
  tierLevel: z.number().int().min(1).max(10),
  name: z.string().min(1),
  minAmount: z.number().min(0).default(0),
  maxAmount: z.number().positive().optional(),
  requiredRole: z.enum(["hod", "principal", "admin", "super_admin", "accounts", "purchase"]),
  requiresSequentialApproval: z.boolean().default(true),
  autoEscalateHours: z.number().int().min(1).default(48),
});
export type PurchaseApprovalTierCreateInput = z.infer<typeof purchaseApprovalTierCreateSchema>;

export const purchaseApprovalActionSchema = z.object({
  purchaseRequestId: z.string().min(1),
  action: z.enum(["approved", "rejected", "escalated", "delegated"]),
  comments: z.string().optional(),
  tierLevel: z.number().int().min(1).optional(),
});
export type PurchaseApprovalActionInput = z.infer<typeof purchaseApprovalActionSchema>;

export const payrollSalaryStructureCreateSchema = z.object({
  institutionId: z.string().min(1).optional(),
  staffId: z.string().min(1),
  baseSalary: z.number().positive(),
  hraAllowance: z.number().min(0).default(0),
  daAllowance: z.number().min(0).default(0),
  specialAllowance: z.number().min(0).default(0),
  pfDeductionRate: z.number().min(0).max(1).default(0.12),
  taxBracketCode: z.string().default("STANDARD"),
  currency: z.string().default("INR"),
  effectiveDate: z.string().min(1),
});
export type PayrollSalaryStructureCreateInput = z.infer<typeof payrollSalaryStructureCreateSchema>;

export const payrollGeneratePeriodSchema = z.object({
  institutionId: z.string().min(1).optional(),
  payPeriodMonth: z.number().int().min(1).max(12),
  payPeriodYear: z.number().int().min(2020).max(2100),
  staffIds: z.array(z.string().min(1)).optional(),
});
export type PayrollGeneratePeriodInput = z.infer<typeof payrollGeneratePeriodSchema>;

export const payrollRecordStatusUpdateSchema = z.object({
  status: z.enum(["draft", "approved", "disbursed", "voided"]),
  paymentReference: z.string().optional(),
});
export type PayrollRecordStatusUpdateInput = z.infer<typeof payrollRecordStatusUpdateSchema>;

export const financialReconciliationCreateSchema = z.object({
  institutionId: z.string().min(1).optional(),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  bankStatementEntries: z.array(
    z.object({
      referenceId: z.string().min(1),
      transactionDate: z.string().min(1),
      amount: z.number(),
      description: z.string().optional(),
    })
  ).optional().default([]),
  notes: z.string().optional(),
});
export type FinancialReconciliationCreateInput = z.infer<typeof financialReconciliationCreateSchema>;

export const financialReconciliationItemMatchSchema = z.object({
  matchStatus: z.enum(["matched", "unmatched", "manual_override", "variance"]),
  matchedWithId: z.string().optional(),
  varianceAmount: z.number().optional().default(0),
  resolutionNotes: z.string().optional(),
});
export type FinancialReconciliationItemMatchInput = z.infer<typeof financialReconciliationItemMatchSchema>;

// ─── Phase 3: offline sync flush (payload v2) + conflict resolution ───

export type SyncDerivedEntity = {
  entityType: string;
  mutationType: "CREATE" | "UPDATE" | "DELETE";
};

/**
 * Server-authoritative action → entity derivation. Clients may send
 * mutationType/entityType (payload v2) but the server always re-derives from
 * this map and rejects client values that disagree.
 */
export const SYNC_ACTION_ENTITY_MAP: Record<string, SyncDerivedEntity> = {
  leave_apply: { entityType: "leave", mutationType: "CREATE" },
  leave_cancel: { entityType: "leave", mutationType: "UPDATE" },
  task_create: { entityType: "task", mutationType: "CREATE" },
  task_update: { entityType: "task", mutationType: "UPDATE" },
  task_delete: { entityType: "task", mutationType: "DELETE" },
  expense_create: { entityType: "expense", mutationType: "CREATE" },
  attendance_nfc_checkin: { entityType: "attendance", mutationType: "CREATE" },
  attendance_punch: { entityType: "attendance", mutationType: "UPDATE" },
  approval_approve: { entityType: "approval", mutationType: "UPDATE" },
  approval_reject: { entityType: "approval", mutationType: "UPDATE" },
  finance_purchase_action: { entityType: "purchase", mutationType: "UPDATE" },
  finance_reconciliation_match: { entityType: "reconciliation_item", mutationType: "UPDATE" },
};

export function deriveSyncEntity(action: string): SyncDerivedEntity | null {
  return SYNC_ACTION_ENTITY_MAP[action] ?? null;
}

export const attendancePunchSchema = z.object({
  mode: z.literal("out"),
  at: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export type AttendancePunchInput = z.infer<typeof attendancePunchSchema>;

export const syncConflictResolveSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
});
export type SyncConflictResolveInput = z.infer<typeof syncConflictResolveSchema>;

/** Identity/tenant columns clients can never overwrite via conflict resolve. */
export const SYNC_IMMUTABLE_RESOLVE_FIELDS = [
  "id",
  "institutionId",
  "tenantId",
  "createdAt",
  "staffId",
  "userId",
  "deviceId",
  "createdById",
] as const;

// ─── Phase 6: Real-Time Chat & Messaging Mesh ───

export const createChatChannelSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["direct", "group", "announcement"]).default("group"),
  memberIds: z.array(z.string()).default([]),
  avatarUrl: z.string().url().optional().nullable(),
});
export type CreateChatChannelInput = z.infer<typeof createChatChannelSchema>;

export const updateChatChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});
export type UpdateChatChannelInput = z.infer<typeof updateChatChannelSchema>;

export const addChatMembersSchema = z.object({
  staffIds: z.array(z.string().min(1)).min(1),
  role: z.enum(["member", "admin"]).default("member"),
});
export type AddChatMembersInput = z.infer<typeof addChatMembersSchema>;

export const sendChatMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  type: z.enum(["text", "image", "file", "system"]).default("text"),
  clientMessageId: z.string().optional().nullable(),
  replyToId: z.string().optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
});
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;

export const editChatMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});
export type EditChatMessageInput = z.infer<typeof editChatMessageSchema>;

export const markChatReadSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1),
});
export type MarkChatReadInput = z.infer<typeof markChatReadSchema>;

export const uploadAiDocumentSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  documentType: z.enum(["fee_receipt", "medical_certificate", "identity_card", "cctv_incident", "general_document"]),
  fileUrl: z.string().optional(),
  rawText: z.string().optional(),
  fileBase64: z.string().optional(),
  fileSizeBytes: z.number().int().nonnegative().optional(),
  targetEntityType: z.string().optional(),
  targetEntityId: z.string().optional(),
});
export type UploadAiDocumentInput = z.infer<typeof uploadAiDocumentSchema>;

export const confirmAiDocumentSchema = z.object({
  confirmedData: z.record(z.string(), z.any()).optional(),
  targetEntityType: z.string().optional(),
  targetEntityId: z.string().optional(),
});
export type ConfirmAiDocumentInput = z.infer<typeof confirmAiDocumentSchema>;

export const createVoiceSessionSchema = z.object({
  channelType: z.enum(["voice", "text", "omni"]).default("voice"),
  context: z.record(z.string(), z.any()).optional(),
});
export type CreateVoiceSessionInput = z.infer<typeof createVoiceSessionSchema>;

export const voiceInteractSchema = z.object({
  sessionId: z.string().min(1),
  audioBase64: z.string().optional(),
  clientTranscript: z.string().optional(),
  format: z.enum(["pcm", "wav", "mp3", "opus"]).default("pcm"),
  voiceProfile: z.enum(["neutral_professional", "friendly_campus", "urgent_alert", "academic_tutor"]).default("neutral_professional"),
  language: z.string().default("en-US"),
  returnAudio: z.boolean().default(true),
});
export type VoiceInteractInput = z.infer<typeof voiceInteractSchema>;

export const ragQuerySchema = z.object({
  query: z.string().min(1).max(2000),
  topK: z.coerce.number().int().min(1).max(50).default(10),
  vectorWeight: z.coerce.number().min(0).max(1).default(0.6),
  keywordWeight: z.coerce.number().min(0).max(1).default(0.4),
  sourceTypes: z.array(z.enum(["policy", "circular", "academic", "hr", "fee", "general"])).optional(),
  minScore: z.coerce.number().min(0).max(1).default(0.1),
});

export type RagQueryInput = z.infer<typeof ragQuerySchema>;

export const ragCorpusIngestSchema = z.object({
  documents: z.array(z.object({
    content: z.string().min(1).max(50000),
    sourceType: z.enum(["policy", "circular", "academic", "hr", "fee", "general"]),
    sourceId: z.string().min(1),
    title: z.string().min(1).max(500),
  })).min(1).max(50),
});

export type RagCorpusIngestInput = z.infer<typeof ragCorpusIngestSchema>;

export const remediationTriggerSchema = z.object({
  planId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.enum(["anomaly", "copilot", "manual", "scheduled"]).default("copilot"),
  steps: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      tool: z.string().min(1),
      params: z.record(z.string(), z.any()).default({}),
      requiresHitl: z.boolean().optional(),
      requiresStepUpAuth: z.boolean().optional(),
      hitlRole: z.string().optional(),
      compensatingAction: z
        .object({
          tool: z.string().min(1),
          params: z.record(z.string(), z.any()).default({}),
        })
        .optional(),
    })
  ).min(1),
});
export type RemediationTriggerInput = z.infer<typeof remediationTriggerSchema>;

export const remediationApproveSchema = z.object({
  gateId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  stepUpFreshnessSeconds: z.number().nonnegative().optional(),
});
export type RemediationApproveInput = z.infer<typeof remediationApproveSchema>;

// ============================================
// Phase 9: Hardware Radar & IoT Mesh Schemas
// ============================================

export const hardwareDeviceRegisterSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  type: z.enum([
    "beacon",
    "gate_kiosk",
    "nfc_reader",
    "camera",
    "biometric_scanner",
    "environmental_sensor",
    "patrol_device",
  ]),
  model: z.string().optional(),
  firmwareVersion: z.string().optional(),
  macAddress: z.string().min(6, "MAC address is required").optional(),
  ipAddress: z.string().optional(),
  zoneId: z.string().optional(),
  coordinatesX: z.number().optional(),
  coordinatesY: z.number().optional(),
  coordinatesZ: z.number().optional(),
  certificateThumbprint: z.string().optional(),
  hmacKeyId: z.string().optional(),
  configurationJson: z.string().optional(),
  metadataJson: z.string().optional(),
});
export type HardwareDeviceRegisterInput = z.infer<typeof hardwareDeviceRegisterSchema>;

export const hardwareDeviceUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum([
    "beacon",
    "gate_kiosk",
    "nfc_reader",
    "camera",
    "biometric_scanner",
    "environmental_sensor",
    "patrol_device",
  ]).optional(),
  model: z.string().optional(),
  firmwareVersion: z.string().optional(),
  ipAddress: z.string().optional(),
  status: z.enum(["online", "offline", "maintenance", "decommissioned", "quarantined"]).optional(),
  zoneId: z.string().nullable().optional(),
  coordinatesX: z.number().optional(),
  coordinatesY: z.number().optional(),
  coordinatesZ: z.number().optional(),
  configurationJson: z.string().optional(),
  metadataJson: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type HardwareDeviceUpdateInput = z.infer<typeof hardwareDeviceUpdateSchema>;

export const hardwareHeartbeatSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  firmwareVersion: z.string().optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  cpuUsagePercent: z.number().min(0).max(100).optional(),
  memoryUsagePercent: z.number().min(0).max(100).optional(),
  networkLatencyMs: z.number().nonnegative().optional(),
  packetLossPercent: z.number().min(0).max(100).optional(),
  temperatureCelsius: z.number().optional(),
  humidityPercent: z.number().min(0).max(100).optional(),
  coordinatesX: z.number().optional(),
  coordinatesY: z.number().optional(),
  coordinatesZ: z.number().optional(),
  metadataJson: z.string().optional(),
});
export type HardwareHeartbeatInput = z.infer<typeof hardwareHeartbeatSchema>;

export const hardwareTelemetryIngestSchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  zoneId: z.string().optional(),
  logType: z.enum([
    "heartbeat",
    "rssi_scan",
    "battery",
    "temperature",
    "humidity",
    "motion",
    "firmware_status",
    "certificate_expiry",
    "network_stats",
  ]),
  rssi: z.number().optional(),
  snr: z.number().optional(),
  batteryLevel: z.number().optional(),
  temperatureCelsius: z.number().optional(),
  humidityPercent: z.number().optional(),
  motionDetected: z.boolean().optional(),
  firmwareVersion: z.string().optional(),
  certificateExpiryDays: z.number().optional(),
  cpuUsagePercent: z.number().optional(),
  memoryUsagePercent: z.number().optional(),
  networkLatencyMs: z.number().optional(),
  packetLossPercent: z.number().optional(),
  coordinatesX: z.number().optional(),
  coordinatesY: z.number().optional(),
  coordinatesZ: z.number().optional(),
  merkleRoot: z.string().optional(),
  merkleProof: z.string().optional(),
  metadataJson: z.string().optional(),
  timestamp: z.string().optional(),
});
export type HardwareTelemetryIngestInput = z.infer<typeof hardwareTelemetryIngestSchema>;

export const firmwareReleaseSchema = z.object({
  version: z.string().min(1, "Firmware version is required"),
  deviceType: z.enum([
    "beacon",
    "gate_kiosk",
    "nfc_reader",
    "camera",
    "biometric_scanner",
    "environmental_sensor",
    "patrol_device",
  ]),
  targetModel: z.string().optional(),
  binaryUrl: z.string().url("Valid binary URL required"),
  binarySha256: z.string().length(64, "SHA-256 hash must be 64 characters"),
  signature: z.string().min(1, "Cryptographic signature is required"),
  releaseNotes: z.string().optional(),
  minCurrentVersion: z.string().optional(),
  rolloutStage: z.enum(["draft", "staged", "canary_1", "staging_10", "fleet_100", "aborted", "completed"]).default("draft"),
});
export type FirmwareReleaseInput = z.infer<typeof firmwareReleaseSchema>;

export const hardwareZoneSchema = z.object({
  name: z.string().min(1, "Zone name is required"),
  type: z.enum([
    "building",
    "floor",
    "room",
    "corridor",
    "gate",
    "parking",
    "outdoor",
    "muster_point",
  ]),
  parentZoneId: z.string().optional(),
  floorNumber: z.number().int().default(0),
  coordinatesX: z.number().optional(),
  coordinatesY: z.number().optional(),
  coordinatesZ: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  pathLossExponent: z.number().min(1.5).max(5.0).default(3.0),
  wallAttenuationDb: z.number().nonnegative().default(0),
  isMusterPoint: z.boolean().default(false),
  emergencyEgressRoute: z.string().optional(),
  boundaryCoordinates: z.array(z.tuple([z.number(), z.number()])).optional(),
  metadataJson: z.string().optional(),
});
export type HardwareZoneInput = z.infer<typeof hardwareZoneSchema>;

export const hardwareZoneUpdateSchema = hardwareZoneSchema.partial();
export type HardwareZoneUpdateInput = z.infer<typeof hardwareZoneUpdateSchema>;

export const trilaterationCalculateSchema = z.object({
  observations: z
    .array(
      z.object({
        anchorId: z.string().min(1),
        coordinates: z.object({
          x: z.number(),
          y: z.number(),
          z: z.number().optional(),
        }),
        rssi: z.number().min(-120).max(0),
        txPower1m: z.number().optional(),
        pathLossExponent: z.number().optional(),
        wallAttenuationDb: z.number().optional(),
      })
    )
    .min(1, "At least 1 anchor observation is required"),
});
export type TrilaterationCalculateInput = z.infer<typeof trilaterationCalculateSchema>;

export const gateAccessVerifySchema = z.object({
  badgeId: z.string().min(1, "Badge ID / Credential is required"),
  deviceId: z.string().min(1, "Device ID is required"),
  zoneId: z.string().optional(),
  direction: z.enum(["in", "out"]).default("in"),
  authenticationMethod: z.enum([
    "nfc",
    "ble",
    "qr",
    "face",
    "fingerprint",
    "pin",
    "hybrid",
    "emergency_override",
  ]).default("nfc"),
  pin: z.string().optional(),
  stepUpToken: z.string().optional(),
  stepUpAuthMethod: z.enum(["biometric", "pin", "supervisor_approval"]).optional(),
  emergencyOverride: z.boolean().default(false),
  rssi: z.number().optional(),
  snr: z.number().optional(),
  distanceEstimateMeters: z.number().optional(),
  coordinatesX: z.number().optional(),
  coordinatesY: z.number().optional(),
  coordinatesZ: z.number().optional(),
  metadataJson: z.string().optional(),
});
export type GateAccessVerifyInput = z.infer<typeof gateAccessVerifySchema>;

export const gateLockdownSchema = z.object({
  zoneId: z.string().optional(),
  isLocked: z.boolean(),
  reason: z.string().optional(),
  emergencyType: z.enum(["active_threat", "fire", "medical", "drill", "manual_override"]).default("active_threat"),
});
export type GateLockdownInput = z.infer<typeof gateLockdownSchema>;

export const hardwareBadgeRegisterSchema = z.object({
  badgeId: z.string().min(1, "Badge identifier is required"),
  badgeType: z.enum(["nfc_card", "ble_beacon", "qr_code", "hybrid"]),
  credentialType: z.enum(["staff_id", "student_id", "visitor_pass", "contractor_badge", "emergency_responder"]),
  staffId: z.string().optional(),
  studentId: z.string().optional(),
  encodedData: z.string().optional(),
  certificateThumbprint: z.string().optional(),
  hmacKeyId: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  accessRulesJson: z.string().optional(),
  metadataJson: z.string().optional(),
});
export type HardwareBadgeRegisterInput = z.infer<typeof hardwareBadgeRegisterSchema>;

export const hardwareBadgeRevokeSchema = z.object({
  reason: z.string().min(1, "Revocation reason is required"),
});
export type HardwareBadgeRevokeInput = z.infer<typeof hardwareBadgeRevokeSchema>;

export const biometricEnrollSchema = z.object({
  ownerType: z.enum(["staff", "student", "visitor"]),
  ownerId: z.string().min(1, "Owner ID is required"),
  modality: z.enum(["face", "fingerprint", "iris", "palm_vein"]),
  templateVector: z.array(z.number()).min(16, "Template vector must contain embeddings"),
  algorithm: z.string().default("facenet-512d-v1"),
  qualityScore: z.number().min(0).max(1).default(0.95),
  enrolledByDeviceId: z.string().optional(),
  enrolledByStaffId: z.string().optional(),
  metadataJson: z.string().optional(),
});
export type BiometricEnrollInput = z.infer<typeof biometricEnrollSchema>;

export const biometricVerifySchema = z.object({
  ownerType: z.enum(["staff", "student", "visitor"]).optional(),
  ownerId: z.string().optional(),
  modality: z.enum(["face", "fingerprint", "iris", "palm_vein"]).default("face"),
  probeVector: z.array(z.number()).min(16, "Probe vector must contain embeddings"),
  threshold: z.number().min(0).max(1).default(0.75),
  challengeNonce: z.string().optional(),
  challengeSignature: z.string().optional(),
});
export type BiometricVerifyInput = z.infer<typeof biometricVerifySchema>;

export const biometricSyncSchema = z.object({
  since: z.string().optional(), // ISO date string for delta sync
  limit: z.coerce.number().int().min(1).max(500).default(100),
  modality: z.enum(["face", "fingerprint", "iris", "palm_vein"]).optional(),
});
export type BiometricSyncInput = z.infer<typeof biometricSyncSchema>;

export const biometricZeroizeSchema = z.object({
  ownerType: z.enum(["staff", "student", "visitor"]),
  ownerId: z.string().min(1, "Owner ID is required"),
  modality: z.enum(["face", "fingerprint", "iris", "palm_vein"]).optional(),
  reason: z.string().min(1, "Zeroization reason is required"),
});
export type BiometricZeroizeInput = z.infer<typeof biometricZeroizeSchema>;

// ============================================
// Phase 10: AI Agent Marketplace Validation Schemas
// ============================================

export const agentPluginManifestSchema = z.object({
  permissions: z.array(z.string()).default([]),
  resourceBudget: z
    .object({
      maxExecutionTimeMs: z.number().int().positive().optional(),
      maxMemoryMb: z.number().int().positive().optional(),
      maxTokens: z.number().int().positive().optional(),
    })
    .optional(),
  entryDslRef: z.string().optional(),
  egressUrls: z.array(z.string().url()).optional(),
  configSchema: z.record(z.string(), z.unknown()).optional(),
  environmentVariables: z.array(z.string()).optional(),
}).passthrough();
export type AgentPluginManifest = z.infer<typeof agentPluginManifestSchema>;

export const agentPluginPublishSchema = z.object({
  pluginKey: z
    .string()
    .min(3)
    .max(128)
    .regex(/^[a-z0-9-_.]+$/, "pluginKey must be alphanumeric with dashes, underscores, or dots"),
  displayName: z.string().min(2).max(128),
  summary: z.string().min(3).max(512),
  description: z.string().optional(),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, "version must follow semantic versioning (e.g. 1.0.0)"),
  scope: z.enum(["global", "institution_private", "institution_shared"]).default("institution_private"),
  category: z.enum(["finance", "facilities", "vision", "compliance", "academic", "hr", "general"]),
  capabilities: z.array(z.string()).default([]),
  manifest: agentPluginManifestSchema,
});
export type AgentPluginPublishInput = z.infer<typeof agentPluginPublishSchema>;

export const agentPluginApproveSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(512).optional(),
});
export type AgentPluginApproveInput = z.infer<typeof agentPluginApproveSchema>;

export const agentPluginInstallSchema = z.object({
  requestedPermissions: z.array(z.string()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().default(true).optional(),
});
export type AgentPluginInstallInput = z.infer<typeof agentPluginInstallSchema>;

export const agentPluginReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(1024).optional(),
});
export type AgentPluginReviewInput = z.infer<typeof agentPluginReviewSchema>;

// ============================================
// Phase 10: Visual Workflow Studio Validation Schemas
// ============================================

export const studioNodeDataSchema = z.object({
  label: z.string().min(1).max(128),
  nodeType: z.enum(["trigger", "action", "agentStep", "branch", "approval", "wait", "parallel", "notification", "hardware"]),
  agent: z.string().max(128).optional(),
  tool: z.string().max(128).optional(),
  input: z.record(z.string(), z.unknown()).optional(),
  condition: z.string().max(512).optional(),
  waitMs: z.number().int().min(0).max(3_600_000).optional(),
  approval: z
    .object({
      required: z.boolean(),
      permission: z.string().max(128).optional(),
      severity: z.enum(["critical", "high", "medium", "low"]).optional(),
      autoExpireHours: z.number().int().positive().optional(),
      onExpiry: z.enum(["escalate", "hold", "reject"]).optional(),
    })
    .optional(),
  trigger: z
    .object({
      type: z.enum(["manual", "schedule", "event", "anomaly"]),
      cron: z.string().max(64).optional(),
      topic: z.string().max(128).optional(),
      subsystem: z.string().max(128).optional(),
      severityThreshold: z.enum(["low", "medium", "high", "critical"]).optional(),
    })
    .optional(),
});

export const studioCanvasStateSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        type: z.string().max(64).optional(),
        position: z.object({ x: z.number(), y: z.number() }),
        data: studioNodeDataSchema,
      })
    )
    .min(1)
    .max(200),
  edges: z
    .array(
      z.object({
        id: z.string().max(128).optional(),
        source: z.string().min(1).max(64),
        target: z.string().min(1).max(64),
        sourceHandle: z.string().max(64).nullable().optional(),
        label: z.string().max(64).optional(),
      })
    )
    .max(400),
});
export type StudioCanvasStateInput = z.infer<typeof studioCanvasStateSchema>;

export const workflowGraphCreateSchema = z.object({
  graphName: z.string().min(2).max(128),
  description: z.string().max(512).optional(),
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "key must be alphanumeric with dashes or underscores"),
  canvasState: studioCanvasStateSchema,
});
export type WorkflowGraphCreateInput = z.infer<typeof workflowGraphCreateSchema>;

export const workflowGraphUpdateSchema = z.object({
  graphName: z.string().min(2).max(128).optional(),
  description: z.string().max(512).optional(),
  canvasState: studioCanvasStateSchema.optional(),
});
export type WorkflowGraphUpdateInput = z.infer<typeof workflowGraphUpdateSchema>;

// ============================================
// Phase 10: Gemini Live Streaming Validation Schemas
// ============================================

export const liveSessionStartSchema = z.object({
  sessionType: z.enum(["cctv_analysis", "operator_console"]).default("cctv_analysis"),
  cameraZoneId: z.string().max(64).optional(),
  modelId: z.string().max(64).default("gemini-3.8-live"),
  keyframeIntervalSeconds: z.number().int().min(1).max(10).default(1),
  maxDurationSeconds: z.number().int().min(30).max(3600).default(900),
  systemInstruction: z.string().max(2048).optional(),
});
export type LiveSessionStartInput = z.infer<typeof liveSessionStartSchema>;

export const liveSessionEventSchema = z.object({
  type: z.enum(["audio", "keyframe", "text"]),
  pcm16Base64: z.string().optional(),
  jpegBase64: z.string().optional(),
  mimeType: z.string().max(64).optional(),
  text: z.string().max(4096).optional(),
  timestamp: z.number().int().positive().optional(),
});
export type LiveSessionEventInput = z.infer<typeof liveSessionEventSchema>;




















