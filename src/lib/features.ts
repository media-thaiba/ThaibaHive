// Feature flag system - DB or env-driven toggles per institution
export type FeatureFlag =
  | 'nfc_enrollment'
  | 'qr_checkin'
  | 'face_recognition'
  | 'marketplace'
  | 'push_notifications'
  | 'canteen'
  | 'academic_tracking'
  | 'agentic_workflows';

// In production, agentic workflows require explicit enablement (process.env.FEATURE_AGENTIC_WORKFLOWS === 'true').
// In development/test, it defaults to enabled unless explicitly set to 'false'.
const isProd = process.env.NODE_ENV === 'production';
const defaultAgenticFlag = isProd
  ? process.env.FEATURE_AGENTIC_WORKFLOWS === 'true'
  : process.env.FEATURE_AGENTIC_WORKFLOWS !== 'false';

export const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  nfc_enrollment: true,
  qr_checkin: true,
  face_recognition: false,
  marketplace: true,
  push_notifications: true,
  canteen: false,
  academic_tracking: false,
  agentic_workflows: defaultAgenticFlag,
};

// In-memory per-institution override registry for staged/canary tenant rollouts (D13)
const tenantOverrides: Map<string, Partial<Record<FeatureFlag, boolean>>> = new Map();

export function setTenantFeatureFlag(institutionId: string, flag: FeatureFlag, enabled: boolean): void {
  const current = tenantOverrides.get(institutionId) || {};
  current[flag] = enabled;
  tenantOverrides.set(institutionId, current);
}

export function clearTenantFeatureOverrides(institutionId?: string): void {
  if (institutionId) {
    tenantOverrides.delete(institutionId);
  } else {
    tenantOverrides.clear();
  }
}

export function getFeatureFlags(institutionId?: string): Record<FeatureFlag, boolean> {
  const base = { ...DEFAULT_FLAGS };
  if (institutionId && tenantOverrides.has(institutionId)) {
    const overrides = tenantOverrides.get(institutionId)!;
    return { ...base, ...overrides };
  }
  return base;
}

export function isFeatureEnabled(flag: FeatureFlag, institutionId?: string): boolean {
  const flags = getFeatureFlags(institutionId);
  return flags[flag] ?? false;
}

export function isAgenticWorkflowsEnabled(institutionId?: string): boolean {
  return isFeatureEnabled('agentic_workflows', institutionId);
}
