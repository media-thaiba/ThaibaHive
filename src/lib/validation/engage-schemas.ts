import { z } from 'zod';

export const engageCampaignCreateSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1),
  templateId: z.string().optional(),
  channel: z.enum(['email', 'sms', 'push', 'inapp', 'voice']).default('email'),
  targetSegment: z.string().default('all_students'),
  subject: z.string().optional(),
  body: z.string().min(1),
  scheduledAt: z.string().optional(),
  priority: z.enum(['critical', 'high', 'standard', 'low']).default('standard'),
});

export const engageCampaignUpdateSchema = z.object({
  name: z.string().optional(),
  status: z.enum(['scheduled', 'active', 'paused', 'completed', 'cancelled']).optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  scheduledAt: z.string().optional(),
});

export const engageTemplateCreateSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().default('general'),
  channel: z.enum(['email', 'sms', 'push', 'inapp', 'voice']).default('email'),
  subjectTemplate: z.string().optional(),
  bodyTemplate: z.string().min(1),
  variablesSchema: z.record(z.string(), z.any()).optional(),
  brandRulesData: z.record(z.string(), z.any()).optional(),
  isApproved: z.boolean().optional(),
});

export const engageWorkflowCreateSchema = z.object({
  workflowId: z.string().min(1),
  name: z.string().min(1),
  triggerEvent: z.string().min(1),
  triggerConditionData: z.record(z.string(), z.any()).optional(),
  steps: z.array(z.any()).default([]),
  isActive: z.boolean().default(true),
});

export const engageChatMessageSchema = z.object({
  sessionId: z.string().min(1),
  stakeholderId: z.string().default('anonymous_user'),
  text: z.string().min(1),
});

export const engagePreferenceUpdateSchema = z.object({
  recipientId: z.string().min(1),
  recipientType: z.enum(['student', 'parent', 'staff', 'guardian', 'applicant', 'alumni']).default('student'),
  channelPreferences: z.record(z.string(), z.boolean()).optional(),
  categorySubscriptions: z.record(z.string(), z.boolean()).optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  timezone: z.string().optional(),
  isUnsubscribedAll: z.boolean().optional(),
});

export const engageDispatchSchema = z.object({
  messageId: z.string().min(1),
  campaignId: z.string().optional(),
  templateId: z.string().optional(),
  recipientId: z.string().min(1),
  recipientType: z.enum(['student', 'parent', 'staff', 'guardian', 'applicant', 'alumni']).default('student'),
  recipientChannelAddress: z.string().min(1),
  channel: z.enum(['email', 'sms', 'push', 'inapp', 'voice']).default('email'),
  priority: z.enum(['critical', 'high', 'standard', 'low']).default('standard'),
  subject: z.string().optional(),
  body: z.string().min(1),
  personalizedData: z.record(z.string(), z.any()).optional(),
});
