import {
  ApprovalStatus,
  RequestType,
  Role,
  AMOUNT_THRESHOLDS,
} from "./models/approval-state";

export class WorkflowEngine {
  /**
   * Determines the initial approval status when a request is submitted.
   */
  static determineInitialStatus(
    type: RequestType,
    amount: number,
    _isEmergency: boolean = false
  ): ApprovalStatus {
    if (type === "expense" && amount < AMOUNT_THRESHOLDS.AUTO_APPROVE_MAX) {
      return "approved";
    }
    return "pending_hod";
  }

  /**
   * Gets the required approver role for a given pending status.
   */
  static getRequiredApproverRole(status: ApprovalStatus): Role | null {
    switch (status) {
      case "pending":
      case "pending_hod":
        return "hod";
      case "pending_accounts":
      case "pending_finance":
        return "accounts";
      case "pending_purchase":
        return "purchase";
      case "pending_principal":
        return "principal";
      case "approved":
        return "purchase";
      case "ordered":
        return "accounts";
      default:
        return null;
    }
  }

  /**
   * Evaluates if a user role can perform approval actions for the given status.
   */
  static canUserApprove(role: Role, status: ApprovalStatus): boolean {
    if (role === "super_admin" || role === "admin") {
      return true;
    }

    if ((status === "pending" || status === "pending_hod") && (role === "hod" || role === "principal" || role === "institutional_head")) {
      return true;
    }

    if ((status === "pending_accounts" || status === "pending_finance") && role === "accounts") {
      return true;
    }

    if (status === "pending_purchase" && role === "purchase") {
      return true;
    }

    if (status === "pending_principal" && role === "principal") {
      return true;
    }

    if (status === "approved" && (role === "purchase" || role === "accounts")) {
      return true;
    }

    if (status === "ordered" && (role === "purchase" || role === "accounts")) {
      return true;
    }

    return false;
  }

  /**
   * Calculates the next status after an approval/rejection/return action.
   */
  static getNextStatus(
    currentStatus: ApprovalStatus,
    action: "approve" | "reject" | "return",
    type: RequestType,
    amount: number,
    _isEmergency: boolean = false
  ): ApprovalStatus {
    if (action === "reject") {
      return "rejected";
    }

    if (action === "return") {
      return "returned";
    }

    if (action === "approve") {
      if (type === "expense") {
        if (currentStatus === "pending" || currentStatus === "pending_hod") {
          if (amount > AMOUNT_THRESHOLDS.HOD_APPROVE_MAX) {
            return "pending_accounts";
          }
          return "approved";
        }

        if (currentStatus === "pending_accounts" || currentStatus === "pending_finance") {
          if (amount > AMOUNT_THRESHOLDS.HOD_APPROVE_MAX) {
            return "pending_principal";
          }
          return "approved";
        }

        if (currentStatus === "pending_principal") {
          return "approved";
        }

        if (currentStatus === "approved") {
          return "disbursed";
        }
      } else if (type === "purchase") {
        if (currentStatus === "pending" || currentStatus === "pending_hod") {
          return "pending_accounts";
        }

        if (currentStatus === "pending_accounts" || currentStatus === "pending_finance") {
          return "pending_purchase";
        }

        if (currentStatus === "pending_purchase") {
          return "approved";
        }

        if (currentStatus === "approved") {
          return "ordered";
        }

        if (currentStatus === "ordered") {
          return "received";
        }
      }
    }

    return currentStatus;
  }

  /**
   * Validates a state transition and role permission.
   */
  static validateTransition(
    currentStatus: ApprovalStatus,
    action: "approve" | "reject" | "return",
    role: Role
  ): { valid: boolean; error?: string } {
    if (["rejected", "returned", "disbursed", "received"].includes(currentStatus)) {
      return { valid: false, error: `Cannot modify request in terminal status: ${currentStatus}` };
    }

    if (!this.canUserApprove(role, currentStatus)) {
      return {
        valid: false,
        error: `Role '${role}' is not authorized to review requests in state '${currentStatus}'`,
      };
    }

    return { valid: true };
  }
}
