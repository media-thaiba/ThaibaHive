import { z } from "zod";

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

export const expenseClaimCreateSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().min(1),
  receiptUrl: z.string().optional(),
});

export const purchaseCreateSchema = z.object({
  itemName: z.string().min(1),
  quantity: z.number().int().positive(),
  estimatedCost: z.number().nonnegative(),
  justification: z.string().optional(),
});

export const visitorCreateSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  hostStaffId: z.string().optional(),
  purpose: z.string().min(1),
  notes: z.string().optional(),
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

export const vehicleCreateSchema = z.object({
  registrationNumber: z.string().min(1),
  model: z.string().min(1),
  type: z.string().min(1),
  capacity: z.number().int().positive().optional(),
  fuelType: z.string().optional(),
  institutionId: z.string().optional(),
  notes: z.string().optional(),
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