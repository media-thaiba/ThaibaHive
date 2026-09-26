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
      case "pending_hod":
        return "hod";
      case "pending_accounts":
        return "admin";
      case "pending_principal":
        return "principal";
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

    if (status === "pending_hod" && role === "hod") {
      return true;
    }

    if (status === "pending_principal" && role === "principal") {
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
      if (currentStatus === "pending_hod") {
        if (type === "expense") {
          if (amount > AMOUNT_THRESHOLDS.HOD_APPROVE_MAX) {
            return "pending_accounts";
          }
          return "approved";
        }
        // Purchase request
        return "pending_accounts";
      }

      if (currentStatus === "pending_accounts") {
        if (type === "expense" && amount > AMOUNT_THRESHOLDS.HOD_APPROVE_MAX) {
          return "pending_principal";
        }
        return "approved";
      }

      if (currentStatus === "pending_principal") {
        return "approved";
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
    if (["approved", "rejected", "returned"].includes(currentStatus)) {
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
