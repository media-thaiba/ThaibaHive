import type { StaffRole } from "@thaiba/auth";

export type Role = StaffRole;

export type ApprovalStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "pending_hod"
  | "pending_accounts"
  | "pending_finance"
  | "pending_purchase"
  | "pending_principal"
  | "approved"
  | "ordered"
  | "received"
  | "disbursed"
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
