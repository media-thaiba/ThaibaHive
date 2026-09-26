// Feature flag system - DB or env-driven toggles per institution
export type FeatureFlag = 'nfc_enrollment' | 'qr_checkin' | 'face_recognition' | 'marketplace' | 'push_notifications' | 'canteen' | 'academic_tracking';
export const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  nfc_enrollment: true,
  qr_checkin: true,
  face_recognition: false,
  marketplace: true,
  push_notifications: true,
  canteen: false,
  academic_tracking: false,
};
export function getFeatureFlags(_institutionId?: string): Record<FeatureFlag, boolean> {
  return { ...DEFAULT_FLAGS };
}
