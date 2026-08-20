export type ChannelType = 'email' | 'sms' | 'push' | 'inapp' | 'voice';

export type MessagePriority = 'critical' | 'high' | 'standard' | 'low';

export type DeliveryStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'failed'
  | 'bounced';

export type RecipientType =
  | 'student'
  | 'parent'
  | 'staff'
  | 'guardian'
  | 'applicant'
  | 'alumni';

export interface OutboundDispatchPayload {
  messageId: string;
  campaignId?: string;
  templateId?: string;
  recipientId: string;
  recipientType?: RecipientType;
  recipientChannelAddress: string; // email address, E.164 phone, device push token, or userId
  channel: ChannelType;
  priority?: MessagePriority;
  subject?: string;
  body: string;
  personalizedData?: Record<string, any>;
  metadata?: Record<string, any>;
  institutionId?: string;
}

export interface DispatchResult {
  success: boolean;
  deliveryId: string;
  messageId: string;
  channel: ChannelType;
  provider: string;
  providerMessageId?: string;
  status: DeliveryStatus;
  failureReason?: string;
  costUsd: number;
  dispatchedAt: string;
  fallbackTriggered?: boolean;
}

export interface ChannelCostConfig {
  email: number; // e.g. 0.0001
  sms: number;   // e.g. 0.0075
  push: number;  // e.g. 0.0000
  inapp: number; // e.g. 0.0000
  voice: number; // e.g. 0.0200
}

export const DEFAULT_CHANNEL_COSTS: ChannelCostConfig = {
  email: 0.0001,
  sms: 0.0075,
  push: 0.0000,
  inapp: 0.0000,
  voice: 0.0200,
};
