export type MdmPlatform = 'INTUNE' | 'APPLE';

export interface MdmPolicyConfig {
  tenantId: string;
  serverUrl: string;
  tenantKey: string;
  allowExport: boolean;
  forcePasscode: boolean;
  sessionTimeoutMinutes: number;
}

export interface MdmEnrollmentRequest {
  deviceUuid: string;
  deviceModel?: string;
  osVersion?: string;
  tenantId: string;
  enrollmentToken: string;
}
