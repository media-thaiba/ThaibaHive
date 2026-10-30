export type AttendanceEventKind = 'in' | 'out';
export type AttendanceMethod = 'geofence' | 'nfc' | 'qr' | 'manual_correction';
export type TimeTrustLevel = 'server' | 'anchored' | 'device_claimed';

export interface AttendanceEventSyncItem {
  clientEventId: string;
  kind: AttendanceEventKind;
  method: AttendanceMethod;
  deviceClaimedAt?: number;
  clockOffsetMs?: number;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  isMocked?: boolean;
  geofenceId?: string;
  deviceId?: string;
  appVersion?: string;
  qrPayload?: string;
  nfcTagId?: string;
}

export interface AttendanceSyncBatchRequest {
  events: AttendanceEventSyncItem[];
}

export interface AttendanceSyncItemResult {
  clientEventId: string;
  status: 'accepted' | 'duplicate' | 'rejected';
  reason?: string;
  effectiveAt?: number;
  timeTrust?: TimeTrustLevel;
}

export interface AttendanceSyncBatchResponse {
  results: AttendanceSyncItemResult[];
  processedAt: number;
}
