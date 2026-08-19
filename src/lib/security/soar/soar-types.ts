/**
 * Autonomous Security Orchestration and Response (SOAR) Type Definitions
 * Sprint-040 — Core Types & State Models
 */

export type SoarExecutionState =
  | 'IDLE'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'COMPENSATING'
  | 'COMPENSATED'
  | 'COMPENSATION_FAILED'
  | 'REQUIRES_APPROVAL'
  | 'CANCELLED';

export type SoarStepState =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'COMPENSATING'
  | 'COMPENSATED'
  | 'SKIPPED';

export type ConditionOperator =
  | '=='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'in'
  | 'not_in'
  | 'contains'
  | 'regex_match'
  | 'cidr_match';

export interface PlaybookConditionLeaf {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export interface PlaybookConditionGroup {
  and?: (PlaybookConditionLeaf | PlaybookConditionGroup)[];
  or?: (PlaybookConditionLeaf | PlaybookConditionGroup)[];
  not?: PlaybookConditionLeaf | PlaybookConditionGroup;
}

export type PlaybookCondition = PlaybookConditionLeaf | PlaybookConditionGroup;

export interface PlaybookTrigger {
  event_type: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source?: string;
  confidence_min?: number;
  condition?: PlaybookCondition;
}

export interface PlaybookStep {
  id: string;
  name: string;
  action: string;
  params?: Record<string, any>;
  condition?: PlaybookCondition;
  timeout_ms?: number;
  continue_on_error?: boolean;
}

export interface SecurityPlaybook {
  id: string;
  name: string;
  version: string;
  description?: string;
  category: 'NETWORK' | 'IDENTITY' | 'DDOS' | 'THREAT_INTEL' | 'SYSTEM';
  enabled: boolean;
  auto_execute: boolean;
  min_confidence: number;
  high_impact?: boolean;
  triggers: PlaybookTrigger[];
  steps: PlaybookStep[];
  rollback_strategy?: 'COMPENSATE' | 'NONE';
  created_at?: string;
  updated_at?: string;
}

export interface SoarStepExecution {
  step_id: string;
  name: string;
  action: string;
  state: SoarStepState;
  started_at: string;
  completed_at?: string;
  input_params: Record<string, any>;
  output?: any;
  error?: string;
  compensated?: boolean;
}

export interface SoarTargetEntity {
  type: 'IP' | 'SUBNET' | 'USER' | 'DOMAIN' | 'TOKEN';
  value: string;
}

export interface SoarExecutionContext {
  execution_id: string;
  playbook_id: string;
  playbook_name: string;
  trigger_payload: Record<string, any>;
  target_entity: SoarTargetEntity;
  state: SoarExecutionState;
  steps: Record<string, SoarStepExecution>;
  step_order: string[];
  started_at: string;
  completed_at?: string;
  error?: string;
  compensation_status?: 'NONE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  tenant_id?: string;
  actor_id?: string;
  approval_id?: string;
}

export interface SoarActionHandler<TParams = any, TOutput = any> {
  name: string;
  description?: string;
  execute: (params: TParams, context: SoarExecutionContext) => Promise<TOutput>;
  compensate?: (params: TParams, output: TOutput, context: SoarExecutionContext) => Promise<void>;
}

export interface SoarApprovalItem {
  id: string;
  execution_id: string;
  playbook_id: string;
  playbook_name: string;
  target_entity: SoarTargetEntity;
  confidence_score: number;
  trigger_payload: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requested_at: string;
  expires_at: string;
  resolved_at?: string;
  resolved_by?: string;
  reason?: string;
}
