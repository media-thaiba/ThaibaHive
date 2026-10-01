import { AgentDbStore, agentDbStore } from "../../db/agent-store";

export interface KillSwitchStatus {
  engaged: boolean;
  engagedBy?: string;
  engagedAt?: string;
  reason?: string;
  institutionId: string;
}

export interface StepUpAuthContext {
  userId: string;
  userRole: string;
  sessionAuthenticatedAt: string; // ISO string
  confirmationText: string;
}

export class AgentKillSwitch {
  private static instance: AgentKillSwitch;
  private stateByInstitution: Map<string, KillSwitchStatus> = new Map();
  private store: AgentDbStore;

  constructor(store?: AgentDbStore) {
    this.store = store || agentDbStore;
  }

  public static getInstance(): AgentKillSwitch {
    if (!AgentKillSwitch.instance) {
      AgentKillSwitch.instance = new AgentKillSwitch();
    }
    return AgentKillSwitch.instance;
  }

  public isEngaged(institutionId: string = "global"): boolean {
    const status = this.stateByInstitution.get(institutionId);
    if (status && status.engaged) return true;

    // Check global state
    const globalStatus = this.stateByInstitution.get("global");
    return !!globalStatus?.engaged;
  }

  public getStatus(institutionId: string = "global"): KillSwitchStatus {
    return (
      this.stateByInstitution.get(institutionId) || {
        engaged: false,
        institutionId,
      }
    );
  }

  public async engage(
    auth: StepUpAuthContext,
    reason: string,
    institutionId: string = "global"
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Role validation: admin, regional_admin, super_admin only
    if (auth.userRole !== "admin" && auth.userRole !== "regional_admin" && auth.userRole !== "super_admin") {
      return {
        success: false,
        error: `Role '${auth.userRole}' is not authorized to engage emergency kill-switch.`,
      };
    }

    // 2. Step-up auth freshness check (must be <= 5 minutes / 300,000ms old)
    const sessionAgeMs = Date.now() - new Date(auth.sessionAuthenticatedAt).getTime();
    if (sessionAgeMs > 300000 || sessionAgeMs < 0) {
      return {
        success: false,
        error: "Step-up authentication required: Session is older than 5 minutes. Re-authenticate to continue.",
      };
    }

    // 3. Type-to-confirm validation
    if (auth.confirmationText !== "CONFIRM HALT ALL AGENTS") {
      return {
        success: false,
        error: "Confirmation text mismatch. Must explicitly enter 'CONFIRM HALT ALL AGENTS'.",
      };
    }

    const status: KillSwitchStatus = {
      engaged: true,
      engagedBy: auth.userId,
      engagedAt: new Date().toISOString(),
      reason,
      institutionId,
    };

    this.stateByInstitution.set(institutionId, status);

    // Record emergency audit invocation
    await this.store.recordToolInvocation({
      agentId: "killswitch-coordinator",
      toolName: "system.killswitch.engage",
      institutionId,
      status: "success",
      inputHash: "engage_hash",
      auditHash: `killswitch_engaged_${Date.now()}`,
      prevAuditHash: await this.store.getLatestAuditHash(institutionId),
      error: `EMERGENCY HALT: ${reason}`,
    });

    return { success: true };
  }

  public async release(
    auth: StepUpAuthContext,
    institutionId: string = "global"
  ): Promise<{ success: boolean; error?: string }> {
    if (auth.userRole !== "admin" && auth.userRole !== "regional_admin" && auth.userRole !== "super_admin") {
      return {
        success: false,
        error: `Role '${auth.userRole}' is not authorized to release kill-switch.`,
      };
    }

    const sessionAgeMs = Date.now() - new Date(auth.sessionAuthenticatedAt).getTime();
    if (sessionAgeMs > 300000 || sessionAgeMs < 0) {
      return {
        success: false,
        error: "Step-up authentication required: Session is older than 5 minutes.",
      };
    }

    if (auth.confirmationText !== "CONFIRM RESUME AGENTS") {
      return {
        success: false,
        error: "Confirmation text mismatch. Must explicitly enter 'CONFIRM RESUME AGENTS'.",
      };
    }

    this.stateByInstitution.delete(institutionId);

    await this.store.recordToolInvocation({
      agentId: "killswitch-coordinator",
      toolName: "system.killswitch.release",
      institutionId,
      status: "success",
      inputHash: "release_hash",
      auditHash: `killswitch_released_${Date.now()}`,
      prevAuditHash: await this.store.getLatestAuditHash(institutionId),
    });

    return { success: true };
  }

  public async disengage(
    auth: StepUpAuthContext,
    institutionId: string = "global"
  ): Promise<{ success: boolean; error?: string }> {
    return this.release(auth, institutionId);
  }

  public clear(): void {
    this.stateByInstitution.clear();
  }
}

export const agentKillSwitch = AgentKillSwitch.getInstance();
