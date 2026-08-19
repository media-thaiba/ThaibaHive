import { AgentStateStore } from "../core/state-store";
import { randomUUID } from "crypto";

export interface ApprovalRequest {
  id: string;
  agentId: string;
  targetAsset: string;
  severity: "critical" | "high" | "medium" | "low";
  decision: string;
  rationale: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export class ApprovalGateway {
  private static instance: ApprovalGateway;
  private stateStore = AgentStateStore.getInstance();
  private pendingRequests: Map<string, {
    request: ApprovalRequest;
    resolve: (approved: boolean) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  // Listeners for SSE notification pushes
  private notificationListeners: Set<(request: ApprovalRequest) => void> = new Set();

  private constructor() {}

  public static getInstance(): ApprovalGateway {
    if (!ApprovalGateway.instance) {
      ApprovalGateway.instance = new ApprovalGateway();
    }
    return ApprovalGateway.instance;
  }

  public subscribeToNotifications(listener: (request: ApprovalRequest) => void): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  public async requestApproval(params: {
    agentId: string;
    targetAsset: string;
    severity: "critical" | "high" | "medium" | "low";
    decision: string;
    rationale: string;
  }): Promise<boolean> {
    const approvalId = randomUUID();
    const request: ApprovalRequest = {
      id: approvalId,
      ...params,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Log the initial decision state as pending in database
    await this.stateStore.logDecision(
      params.agentId,
      params.targetAsset,
      params.severity,
      params.decision,
      "pending",
      JSON.stringify({ rationale: params.rationale })
    );

    return new Promise<boolean>((resolve) => {
      // 60 seconds auto-rejection timer
      const timeout = setTimeout(() => {
        this.stateStore.log(params.agentId, "warn", `Approval request ${approvalId} timed out after 60s.`);
        this.resolveRequest(approvalId, false);
      }, 60000);

      this.pendingRequests.set(approvalId, {
        request,
        resolve,
        timeout,
      });

      // Dispatch notification to SSE listeners
      this.notificationListeners.forEach((listener) => {
        try {
          listener(request);
        } catch (err) {
          console.error("Error in SSE approval listener callback:", err);
        }
      });
    });
  }

  public async approve(approvalId: string): Promise<boolean> {
    return this.resolveRequest(approvalId, true);
  }

  public async reject(approvalId: string): Promise<boolean> {
    return this.resolveRequest(approvalId, false);
  }

  private async resolveRequest(approvalId: string, approved: boolean): Promise<boolean> {
    const entry = this.pendingRequests.get(approvalId);
    if (!entry) return false;

    clearTimeout(entry.timeout);
    this.pendingRequests.delete(approvalId);

    const status = approved ? "approved" : "rejected";
    entry.request.status = status;

    // Update state store with approved/rejected status
    await this.stateStore.log(
      entry.request.agentId,
      "info",
      `Approval request ${approvalId} resolved with status: ${status}`
    );

    entry.resolve(approved);
    return true;
  }

  public getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.pendingRequests.values()).map((e) => e.request);
  }

  public clear(): void {
    for (const entry of this.pendingRequests.values()) {
      clearTimeout(entry.timeout);
      entry.resolve(false);
    }
    this.pendingRequests.clear();
    this.notificationListeners.clear();
  }
}
