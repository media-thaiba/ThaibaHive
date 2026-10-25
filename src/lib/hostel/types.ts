export interface HostelSettings {
  id?: string;
  institutionId?: string;
  lateFineRatePerDayMinor: number;
  gracePeriodMinutes: number;
  roundingRule: "ceil" | "floor";
  updatedAt?: string;
}

export interface FineCalculationResult {
  daysLate: number;
  ratePerDayMinor: number;
  totalAmountMinor: number;
}

export interface AllocateBedParams {
  institutionId: string;
  bedId: string;
  studentId: string;
  academicYearId: string;
  staffId: string;
  allocatedAt?: string;
}

export interface AllocateBedResult {
  success: boolean;
  allocationId?: string;
  error?: string;
  collisionType?: string;
}

export interface VacateBedParams {
  institutionId: string;
  allocationId: string;
  vacatedAt?: string;
}

export interface VacateBedResult {
  success: boolean;
  error?: string;
}

export interface IssuePassParams {
  institutionId: string;
  leaveId: string;
  studentId: string;
  passNumber: string;
  rawQrSecret: string;
  validFrom: string;
  validUntil: string;
  staffId: string;
  issuedAt: string;
}

export interface ReissuePassParams {
  institutionId: string;
  leaveId: string;
  studentId: string;
  oldPassId: string;
  staffId: string;
  newPassNumber: string;
  rawQrSecret: string;
  validFrom: string;
  validUntil: string;
  issuedAt: string;
}

export interface GatePassResult {
  success: boolean;
  passId?: string;
  error?: string;
}

export type GateDirection = "out" | "in";
export type VerificationResult =
  | "verified"
  | "tampered"
  | "expired_rejected"
  | "revoked_rejected"
  | "out_of_window_rejected"
  | "manual_override";

export interface ScanGatePassParams {
  institutionId: string;
  passId: string | null;
  rawQrSecret?: string;
  direction: GateDirection;
  scannedAt: string;
  receivedAt: string;
  deviceId: string;
  guardStaffId: string;
  idempotencyKey: string;
  manualOverride?: boolean;
  overrideReason?: string;
}

export interface ScanGatePassResult {
  success: boolean;
  logId?: string;
  verificationResult: VerificationResult;
  error?: string;
}

export interface AssessFineParams {
  institutionId: string;
  studentId: string;
  leaveId?: string;
  fineCategory: "late_return" | "disciplinary" | "property_damage" | "misconduct";
  daysLate?: number;
  ratePerDayMinor?: number;
  totalAmountMinor: number;
  actorType: "system" | "staff";
  actorStaffId?: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface WaiveFineParams {
  institutionId: string;
  fineId: string;
  waiveAmountMinor: number;
  actorStaffId: string;
  reason: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface FineActionResult {
  success: boolean;
  fineId?: string;
  actionId?: string;
  error?: string;
}
