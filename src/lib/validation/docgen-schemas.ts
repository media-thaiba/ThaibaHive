import { z } from 'zod';

export const createDocTemplateSchema = z.object({
  institutionId: z.string().min(1, 'Institution ID is required'),
  templateCode: z.string().min(1, 'Template code is required'),
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['report_card', 'hall_ticket', 'certificate', 'fee_receipt', 'custom']),
  layoutConfig: z.string().optional(),
  contentTemplate: z.string().min(1, 'Content template markup is required'),
  cssStyles: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

export const generateDocSchema = z.object({
  institutionId: z.string().min(1),
  templateCode: z.string().optional(),
  documentType: z.enum(['report_card', 'hall_ticket', 'certificate', 'fee_receipt', 'custom']),
  recipientId: z.string().min(1),
  recipientName: z.string().min(1),
  rollNumber: z.string().min(1),
  academicYear: z.string().min(1),
  termOrExamName: z.string().optional(),
  className: z.string().optional(),
  subjects: z.array(
    z.object({
      subjectName: z.string(),
      maxMarks: z.number().min(1),
      marksObtained: z.number().min(0),
      credits: z.number().optional(),
      remarks: z.string().optional(),
    })
  ).optional(),
  examSchedule: z.array(
    z.object({
      date: z.string(),
      time: z.string(),
      subjectCode: z.string(),
      subjectTitle: z.string(),
    })
  ).optional(),
  purpose: z.string().optional(),
  teacherRemarks: z.string().optional(),
});

export const batchGenerateDocSchema = z.object({
  institutionId: z.string().min(1),
  documentType: z.enum(['report_card', 'hall_ticket', 'certificate']),
  templateCode: z.string().optional(),
  academicYear: z.string().min(1),
  termOrExamName: z.string().optional(),
  candidates: z.array(generateDocSchema).min(1, 'At least 1 candidate is required'),
});

export const exportStreamSchema = z.object({
  institutionId: z.string().min(1),
  jobType: z.enum(['students', 'timetables', 'attendance', 'grades', 'finances', 'audit_logs', 'custom']),
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('csv'),
  filterParams: z.record(z.string(), z.any()).optional(),
  columns: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      transform: z.enum(['string', 'number', 'currency', 'date', 'boolean', 'uppercase', 'mask']).optional(),
      width: z.number().optional(),
    })
  ).optional(),
  data: z.array(z.record(z.string(), z.any())).optional(),
});

export const registerMobileTokenSchema = z.object({
  userId: z.string().min(1),
  institutionId: z.string().min(1),
  deviceToken: z.string().min(1),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
  deviceModel: z.string().optional(),
  appVersion: z.string().optional(),
});

export const mobileSyncQuerySchema = z.object({
  institutionId: z.string().min(1),
  lastSyncTimestamp: z.string().optional(),
});
