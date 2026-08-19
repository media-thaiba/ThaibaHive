import { PolicyVersionManager,  } from "./policy-version-manager";
import { eventBus } from "@/lib/sse/event-bus";

export type PolicyStatus = "DRAFT" | "PROPAGATING" | "ACTIVE" | "CONFLICT" | "SUPERSEDED";

export interface FederatedPolicy {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  content: Record<string, any>;
  status: PolicyStatus;
  sha256Hash: string;
  version: number;
  effectiveDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicySyncPayload {
  policyId: string;
  sourceTenantId: string;
  targetTenantIds: string[];
  title: string;
  category: string;
  content: Record<string, any>;
  version: number;
  sha256Hash: string;
}

export class PolicySyncEngine {
  private versionManager: PolicyVersionManager;
  private policies: Map<string, FederatedPolicy> = new Map();
  private replicationLogs: Array<{ payload: PolicySyncPayload; timestamp: string; status: string }> = [];

  constructor(versionManager?: PolicyVersionManager) {
    this.versionManager = versionManager || new PolicyVersionManager();
  }

  public createPolicy(
    tenantId: string,
    title: string,
    category: string,
    content: Record<string, any>,
    createdById: string
  ): FederatedPolicy {
    const policyId = `pol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sha256Hash = PolicyVersionManager.computeSha256(content);
    const now = new Date().toISOString();

    const policy: FederatedPolicy = {
      id: policyId,
      tenantId,
      title,
      category,
      content,
      status: "DRAFT",
      sha256Hash,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.policies.set(policyId, policy);
    this.versionManager.createVersion(policyId, 1, content, createdById, "Initial policy creation");
    return policy;
  }

  public propagatePolicy(policyId: string, targetTenantIds: string[]): { success: boolean; payload?: PolicySyncPayload; error?: string } {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return { success: false, error: `Policy ${policyId} not found` };
    }

    const payload: PolicySyncPayload = {
      policyId: policy.id,
      sourceTenantId: policy.tenantId,
      targetTenantIds,
      title: policy.title,
      category: policy.category,
      content: policy.content,
      version: policy.version,
      sha256Hash: policy.sha256Hash,
    };

    policy.status = "PROPAGATING";
    policy.updatedAt = new Date().toISOString();

    this.replicationLogs.push({
      payload,
      timestamp: new Date().toISOString(),
      status: "PROPAGATED",
    });

    policy.status = "ACTIVE";

    // MHD-008: Broadcast SSE event on 'governance' channel
    try {
      eventBus.publish("governance", {
        type: "POLICY_PROPAGATED",
        payload: {
          policyId: policy.id,
          institutionIds: targetTenantIds,
          version: policy.version,
          sha256Hash: policy.sha256Hash,
          status: "ACTIVE",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[PolicySyncEngine] SSE broadcast error:", err);
    }

    return { success: true, payload };
  }

  public receiveReplicatedPolicy(payload: PolicySyncPayload): { success: boolean; status: PolicyStatus; error?: string } {
    const computedHash = PolicyVersionManager.computeSha256(payload.content);
    if (computedHash !== payload.sha256Hash) {
      return { success: false, status: "CONFLICT", error: "Cryptographic SHA-256 hash mismatch" };
    }

    const existing = this.policies.get(payload.policyId);
    if (existing && existing.version > payload.version) {
      return { success: false, status: "SUPERSEDED", error: "Current version is higher than incoming version" };
    }

    if (existing && existing.version === payload.version && existing.sha256Hash !== payload.sha256Hash) {
      existing.status = "CONFLICT";
      return { success: false, status: "CONFLICT", error: "Version collision with different policy content" };
    }

    const now = new Date().toISOString();
    const updatedPolicy: FederatedPolicy = {
      id: payload.policyId,
      tenantId: payload.sourceTenantId,
      title: payload.title,
      category: payload.category,
      content: payload.content,
      status: "ACTIVE",
      sha256Hash: payload.sha256Hash,
      version: payload.version,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    this.policies.set(payload.policyId, updatedPolicy);
    this.versionManager.createVersion(payload.policyId, payload.version, payload.content, "system-replication", "Replicated policy version");

    return { success: true, status: "ACTIVE" };
  }

  public resolveConflict(policyId: string, resolvedContent: Record<string, any>, adminId: string): FederatedPolicy {
    const existing = this.policies.get(policyId);
    if (!existing) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const newVersion = existing.version + 1;
    const sha256Hash = PolicyVersionManager.computeSha256(resolvedContent);
    const now = new Date().toISOString();

    existing.content = resolvedContent;
    existing.version = newVersion;
    existing.sha256Hash = sha256Hash;
    existing.status = "ACTIVE";
    existing.updatedAt = now;

    this.versionManager.createVersion(policyId, newVersion, resolvedContent, adminId, "Manual conflict resolution override");
    return existing;
  }

  public getPolicy(policyId: string): FederatedPolicy | null {
    return this.policies.get(policyId) || null;
  }

  public getAllPolicies(tenantId?: string): FederatedPolicy[] {
    const list = Array.from(this.policies.values());
    if (tenantId) {
      return list.filter((p) => p.tenantId === tenantId);
    }
    return list;
  }

  public getReplicationLogs() {
    return this.replicationLogs;
  }

  public async syncPolicy(
    incomingPolicy: { id: string; institutionId?: string; name?: string; rules?: Record<string, any>; version: number; status?: string; [key: string]: any },
    existingPolicy: { id: string; institutionId?: string; name?: string; rules?: Record<string, any>; version: number; status?: string; [key: string]: any }
  ): Promise<{ conflictDetected: boolean; resolvedPolicy: typeof incomingPolicy }> {
    const conflictDetected = incomingPolicy.version !== existingPolicy.version;
    const resolvedPolicy = incomingPolicy.version >= existingPolicy.version
      ? { ...incomingPolicy }
      : { ...existingPolicy };

    return { conflictDetected, resolvedPolicy };
  }
}
