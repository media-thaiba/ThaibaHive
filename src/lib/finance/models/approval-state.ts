export type Role = "super_admin" | "admin" | "principal" | "hod" | "staff";

export type ApprovalStatus =
  | "draft"
  | "submitted"
  | "pending_hod"
  | "pending_accounts"
  | "pending_principal"
  | "approved"
  | "rejected"
  | "returned";

export type RequestType = "expense" | "purchase";

export interface StateTransition {
  from: ApprovalStatus;
  to: ApprovalStatus;
  allowedRoles: Role[];
  condition?: (amount: number, isEmergency?: boolean) => boolean;
}

export const AMOUNT_THRESHOLDS = {
  AUTO_APPROVE_MAX: 500,
  HOD_APPROVE_MAX: 5000,
};
