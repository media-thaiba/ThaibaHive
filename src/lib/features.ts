// Feature flag system - DB or env-driven toggles per institution
export type FeatureFlag =
  | 'nfc_enrollment'
  | 'qr_checkin'
  | 'face_recognition'
  | 'marketplace'
  | 'push_notifications'
  | 'canteen'
  | 'academic_tracking'
  | 'agentic_workflows'
  | 'workflow_studio'
  | 'live_streaming'
  | 'today_hub'
  | 'media_queue'
  | 'sis_sync'
  | 'sso_federation'
  | 'webrtc_conferencing'
  | 'presence_tracking';

// In production, agentic workflows require explicit enablement (process.env.FEATURE_AGENTIC_WORKFLOWS === 'true').
// In development/test, it defaults to enabled unless explicitly set to 'false'.
const isProd = process.env.NODE_ENV === 'production';
const defaultAgenticFlag = isProd
  ? process.env.FEATURE_AGENTIC_WORKFLOWS === 'true'
  : process.env.FEATURE_AGENTIC_WORKFLOWS !== 'false';
const defaultWorkflowStudioFlag = isProd
  ? process.env.FEATURE_WORKFLOW_STUDIO === 'true'
  : process.env.FEATURE_WORKFLOW_STUDIO !== 'false';
const defaultLiveStreamingFlag = isProd
  ? process.env.FEATURE_LIVE_STREAMING === 'true'
  : process.env.FEATURE_LIVE_STREAMING !== 'false';
const defaultSisSyncFlag = process.env.FEATURE_SIS_SYNC === 'true';
const defaultSsoFederationFlag = isProd
  ? process.env.FEATURE_SSO_FEDERATION === 'true'
  : process.env.FEATURE_SSO_FEDERATION !== 'false';
const defaultWebRtcConferencingFlag = isProd
  ? process.env.FEATURE_WEBRTC_CONFERENCING === 'true'
  : process.env.FEATURE_WEBRTC_CONFERENCING !== 'false';
const defaultPresenceTrackingFlag = process.env.FEATURE_PRESENCE_TRACKING === 'true';

export const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  nfc_enrollment: true,
  qr_checkin: true,
  face_recognition: false,
  marketplace: true,
  push_notifications: true,
  canteen: false,
  academic_tracking: false,
  agentic_workflows: defaultAgenticFlag,
  workflow_studio: defaultWorkflowStudioFlag,
  live_streaming: defaultLiveStreamingFlag,
  today_hub: true,
  media_queue: true,
  sis_sync: defaultSisSyncFlag,
  sso_federation: defaultSsoFederationFlag,
  webrtc_conferencing: defaultWebRtcConferencingFlag,
  presence_tracking: defaultPresenceTrackingFlag,
};

// In-memory per-institution override registry for staged/canary tenant rollouts (D13)
const tenantOverrides: Map<string, Partial<Record<FeatureFlag, boolean>>> = new Map();

// Durable per-tenant rollout lists read from environment variables
// (comma-separated institution IDs, or `*` for every tenant). Unlike the
// in-memory registry above, these survive process restarts, which makes
// them the persistence layer for tenant pilots — e.g. the TPS-MAJHI
// presence-verification shadow pilot driven by
// FEATURE_PRESENCE_TRACKING_TENANTS. Extend this map as new tenant-scoped
// pilots ship.
const ENV_TENANT_ROLLOUTS: Partial<Record<FeatureFlag, string>> = {
  presence_tracking: process.env.FEATURE_PRESENCE_TRACKING_TENANTS ?? "",
};

function envRolloutEnabled(flag: FeatureFlag, institutionId: string): boolean {
  const raw = ENV_TENANT_ROLLOUTS[flag];
  if (!raw) return false;
  const entries = raw.split(",").map((entry) => entry.trim()).filter(Boolean);
  return entries.length > 0 && (entries.includes("*") || entries.includes(institutionId));
}

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
  if (institutionId) {
    for (const flag of Object.keys(ENV_TENANT_ROLLOUTS) as FeatureFlag[]) {
      if (envRolloutEnabled(flag, institutionId)) {
        base[flag] = true;
      }
    }
    if (tenantOverrides.has(institutionId)) {
      const overrides = tenantOverrides.get(institutionId)!;
      return { ...base, ...overrides };
    }
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

export function isWorkflowStudioEnabled(institutionId?: string): boolean {
  return isFeatureEnabled('workflow_studio', institutionId);
}

export function isLiveStreamingEnabled(institutionId?: string): boolean {
  return isFeatureEnabled('live_streaming', institutionId);
}

export function isTodayHubEnabled(institutionId?: string): boolean {
  return isFeatureEnabled('today_hub', institutionId);
}

export function isMediaQueueEnabled(institutionId?: string): boolean {
  return isFeatureEnabled('media_queue', institutionId);
}

export function isSisSyncEnabled(institutionId?: string): boolean {
  return isFeatureEnabled('sis_sync', institutionId);
}

export function isSsoFederationEnabled(institutionId?: string): boolean {
  return isFeatureEnabled('sso_federation', institutionId);
}

export function isWebRtcConferencingEnabled(institutionId?: string): boolean {
  return isFeatureEnabled('webrtc_conferencing', institutionId);
}

export function isPresenceTrackingEnabled(institutionId?: string): boolean {
  return isFeatureEnabled('presence_tracking', institutionId);
}

