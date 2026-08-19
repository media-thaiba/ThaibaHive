export interface RemediationWorkflow {
  id: string;
  complianceFindingId: string;
  actionTriggered: string;
  approvalKey?: string;
  approvalStatus: "pending" | "approved" | "rejected" | "none";
  outcome: "pending" | "success" | "failed";
  rollbackStatus: "none" | "pending" | "success" | "failed";
  createdAt: string;
  institutionId: string;
}
