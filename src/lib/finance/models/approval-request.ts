import { ApprovalStatus, RequestType, Role } from "./approval-state";

export interface ApprovalRequest {
  id: string;
  type: RequestType;
  title: string;
  amount: number;
  status: ApprovalStatus;
  submitterId: string;
  submitterName: string;
  institutionId: string;
  departmentId?: string;
  currentApproverRole?: Role;
  isEmergency?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalDecision {
  requestId: string;
  requestType: RequestType;
  action: "approve" | "reject" | "return";
  approverId: string;
  approverRole: Role;
  notes?: string;
  signature?: string;
}
