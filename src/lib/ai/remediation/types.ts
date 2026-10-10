export interface RemediationToolContext {
  institutionId: string;
  staffId: string;
  stepUpFreshnessSeconds?: number;
}

export interface RemediationStepDef {
  id: string;
  name: string;
  tool: string;
  params: Record<string, any>;
  requiresHitl?: boolean;
  hitlRole?: string;
  requiresStepUpAuth?: boolean; // Requires D12 Step-Up auth (<= 300s freshness)
  compensatingAction?: {
    tool: string;
    params: Record<string, any>;
  };
}

export interface RemediationPlan {
  id: string;
  name: string;
  description: string;
  triggerType: "anomaly" | "copilot" | "manual" | "scheduled";
  steps: RemediationStepDef[];
}

export interface RemediationStepResult {
  stepId: string;
  name: string;
  tool: string;
  status: "completed" | "failed" | "waiting_approval" | "skipped" | "rolled_back";
  output?: any;
  error?: string;
  gateId?: string;
  durationMs: number;
  auditHash?: string;
}

export interface RemediationRunResult {
  runId: string;
  status: "completed" | "waiting_approval" | "failed" | "rolled_back";
  completedSteps: number;
  totalSteps: number;
  stepResults: RemediationStepResult[];
  merkleRoot?: string;
  error?: string;
}
