import { z } from "zod";

export const FeeReceiptSchema = z.object({
  receiptNumber: z.string().min(1),
  studentId: z.string().optional(),
  studentName: z.string().min(1),
  paymentDate: z.string(),
  totalAmount: z.number().positive(),
  paymentMode: z.enum(["cash", "card", "online", "cheque", "upi"]).default("online"),
  lineItems: z.array(
    z.object({
      description: z.string().min(1),
      amount: z.number().nonnegative(),
    })
  ).min(1),
  transactionRef: z.string().optional(),
});

export const MedicalCertificateSchema = z.object({
  studentOrStaffId: z.string().optional(),
  patientName: z.string().min(1),
  doctorName: z.string().min(1),
  doctorRegistrationNumber: z.string().min(1),
  hospitalOrClinic: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  diagnosis: z.string().min(1),
  fitnessToResume: z.boolean().default(true),
});

export const StudentIdCardSchema = z.object({
  studentId: z.string().min(1),
  fullName: z.string().min(1),
  academicYear: z.string(),
  className: z.string().min(1),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export const CctvIncidentSchema = z.object({
  timestamp: z.string(),
  locationZone: z.string().min(1),
  incidentType: z.enum(["unauthorized_entry", "crowd_anomaly", "smoke_fire", "perimeter_breach", "general_alert"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(1),
  detectedObjects: z.array(z.string()).default([]),
});

export const GeneralDocumentSchema = z.object({
  title: z.string().min(1),
  documentType: z.string().default("general"),
  summary: z.string().min(1),
  extractedKeyValues: z.record(z.string(), z.any()).default({}),
});

export type FeeReceiptData = z.infer<typeof FeeReceiptSchema>;
export type MedicalCertificateData = z.infer<typeof MedicalCertificateSchema>;
export type StudentIdCardData = z.infer<typeof StudentIdCardSchema>;
export type CctvIncidentData = z.infer<typeof CctvIncidentSchema>;
export type GeneralDocumentData = z.infer<typeof GeneralDocumentSchema>;
