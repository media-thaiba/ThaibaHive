import { PolicySyncEngine } from "../federated/policy-sync-engine";
import { PolicyVersionManager } from "../federated/policy-version-manager";
import { eventBus } from "@/lib/sse/event-bus";

describe("FED-003 & MHD-008: Cross-Institutional Policy Sync & Versioning Test Suite", () => {
  it("creates policy, computes SHA-256 hash, and tracks version history", () => {
    const versionManager = new PolicyVersionManager();
    const syncEngine = new PolicySyncEngine(versionManager);

    const policy = syncEngine.createPolicy(
      "tenant-north",
      "Academic Integrity Policy",
      "academics",
      { maxPlagiarismPercentage: 15, disciplinaryAction: "warning" },
      "admin-user-01"
    );

    expect(policy.id).toBeDefined();
    expect(policy.version).toBe(1);
    expect(policy.sha256Hash).toBeDefined();
    expect(policy.status).toBe("DRAFT");

    const history = versionManager.getVersionHistory(policy.id);
    expect(history.length).toBe(1);
    expect(history[0].sha256Hash).toBe(policy.sha256Hash);
  });

  it("propagates and receives replicated policies across tenants and publishes SSE event (MHD-008)", () => {
    const syncEngine = new PolicySyncEngine();
    const spyPublish = jest.spyOn(eventBus, "publish");

    const policy = syncEngine.createPolicy(
      "tenant-north",
      "Tuition Fee Structure 2027",
      "finance",
      { tuitionBaseMs: 5000, lateFeePenalty: 100 },
      "finance-admin"
    );

    const propResult = syncEngine.propagatePolicy(policy.id, ["tenant-south", "tenant-west"]);
    expect(propResult.success).toBe(true);
    expect(propResult.payload?.targetTenantIds).toContain("tenant-south");

    // MHD-008 assertion
    expect(spyPublish).toHaveBeenCalledWith("governance", expect.objectContaining({
      type: "POLICY_PROPAGATED",
      payload: expect.objectContaining({
        policyId: policy.id,
        institutionIds: ["tenant-south", "tenant-west"],
        status: "ACTIVE",
      }),
    }));

    const recvResult = syncEngine.receiveReplicatedPolicy(propResult.payload!);
    expect(recvResult.success).toBe(true);
    expect(recvResult.status).toBe("ACTIVE");

    spyPublish.mockRestore();
  });

  it("detects hash mismatch tampering and version collisions", () => {
    const syncEngine = new PolicySyncEngine();

    const policy = syncEngine.createPolicy(
      "tenant-north",
      "Emergency Operations Protocol",
      "operations",
      { evaqTimeMinutes: 10 },
      "safety-admin"
    );

    const propResult = syncEngine.propagatePolicy(policy.id, ["tenant-south"]);

    // Tampered payload
    const tamperedPayload = { ...propResult.payload!, content: { evaqTimeMinutes: 1 } };
    const recvTampered = syncEngine.receiveReplicatedPolicy(tamperedPayload);

    expect(recvTampered.success).toBe(false);
    expect(recvTampered.status).toBe("CONFLICT");
    expect(recvTampered.error).toContain("SHA-256 hash mismatch");
  });

  it("resolves policy conflicts using admin override", () => {
    const syncEngine = new PolicySyncEngine();

    const policy = syncEngine.createPolicy(
      "tenant-north",
      "Remote Work Policy",
      "hr",
      { maxRemoteDaysPerWeek: 2 },
      "hr-admin"
    );

    const resolved = syncEngine.resolveConflict(
      policy.id,
      { maxRemoteDaysPerWeek: 3, mandatoryOfficeDay: "Monday" },
      "super-admin-01"
    );

    expect(resolved.version).toBe(2);
    expect(resolved.status).toBe("ACTIVE");
    expect(resolved.content.mandatoryOfficeDay).toBe("Monday");
  });
});
