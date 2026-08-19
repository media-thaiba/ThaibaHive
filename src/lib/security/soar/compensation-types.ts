/**
 * SOAR Compensation Transaction Types
 * Sprint-040 — SAGA Rollback Type Definitions
 */

export interface CompensationStepResult {
  step_id: string;
  action: string;
  success: boolean;
  error?: string;
  duration_ms: number;
}

export interface CompensationResult {
  execution_id: string;
  success: boolean;
  total_compensated: number;
  total_failed: number;
  steps: CompensationStepResult[];
}
