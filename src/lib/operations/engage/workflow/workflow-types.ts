import { ChannelType, MessagePriority } from '../engage-types';

export type WorkflowNodeType = 'trigger' | 'condition' | 'delay' | 'send_message' | 'webhook_action' | 'goal_exit';

export interface WorkflowNode {
  stepIndex: number;
  type: WorkflowNodeType;
  name: string;
  config: {
    channel?: ChannelType;
    priority?: MessagePriority;
    templateId?: string;
    subject?: string;
    bodyTemplate?: string;
    delayDurationMinutes?: number;
    conditionField?: string; // e.g. 'opened', 'clicked', 'feePaid'
    conditionOperator?: 'eq' | 'neq' | 'gt' | 'lt' | 'in';
    conditionValue?: any;
    trueNextStep?: number;
    falseNextStep?: number;
    webhookUrl?: string;
    goalEventName?: string;
  };
}

export interface CampusEventPayload {
  eventName: string;
  recipientId: string;
  recipientType?: string;
  recipientAddress?: string;
  eventData: Record<string, any>;
  institutionId?: string;
  timestamp?: string;
}

export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  triggerEvent: string;
  triggerCondition?: Record<string, any>;
  steps: WorkflowNode[];
  isActive: boolean;
  institutionId?: string;
}
