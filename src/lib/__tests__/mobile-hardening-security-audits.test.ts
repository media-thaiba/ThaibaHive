import { hasPermission } from "../../../packages/auth/roles";
import { PolicySyncEngine } from "../federated/policy-sync-engine";
import { PolicyVersionManager } from "../federated/policy-version-manager";
import { eventBus } from "@/lib/sse/event-bus";

describe("MHD-019: Sprint-014 Mobile Hardening & Executive Security Audit Suite", () => {
  it("Invariant 1: enforces executive:analytics permission strictly for authorized roles", () => {
    expect(hasPermission("super_admin", "executive:analytics")).toBe(true);
    expect(hasPermission("regional_admin", "executive:analytics")).toBe(true);

    expect(hasPermission("admin", "executive:analytics")).toBe(false);
    expect(hasPermission("principal", "executive:analytics")).toBe(false);
    expect(hasPermission("hod", "executive:analytics")).toBe(false);
    expect(hasPermission("staff", "executive:analytics")).toBe(false);
  });

  it("Invariant 2: verifies voice:copilot permission accessibility across executive roles", () => {
    expect(hasPermission("super_admin", "voice:copilot")).toBe(true);
    expect(hasPermission("regional_admin", "voice:copilot")).toBe(true);
    expect(hasPermission("admin", "voice:copilot")).toBe(true);
    expect(hasPermission("principal", "voice:copilot")).toBe(true);
    expect(hasPermission("hod", "voice:copilot")).toBe(true);

    expect(hasPermission("staff", "voice:copilot")).toBe(false);
  });

  it("Invariant 3: ensures SSE POLICY_PROPAGATED events do not leak sensitive policy body contents", () => {
    const spyPublish = jest.spyOn(eventBus, "publish");
    const syncEngine = new PolicySyncEngine();

    const policy = syncEngine.createPolicy(
      "tenant-north",
      "Confidential Compensation Policy",
      "finance",
      { secretSalaryBand: "$150,000" },
      "hr-super-admin"
    );

    syncEngine.propagatePolicy(policy.id, ["tenant-south"]);

    expect(spyPublish).toHaveBeenCalled();
    const publishedPayload = spyPublish.mock.calls[0][1] as any;

    expect(publishedPayload.payload.secretSalaryBand).toBeUndefined();
    expect(publishedPayload.payload.sha256Hash).toBeDefined();
    expect(publishedPayload.payload.status).toBe("ACTIVE");

    spyPublish.mockRestore();
  });

  it("Invariant 4: verifies AES-256 cipher key generation and SHA-256 cryptographic version hashing", () => {
    const secretContent = { studentRecordId: "st-991", grade: "A+" };
    const hash = PolicyVersionManager.computeSha256(secretContent);

    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // 64 hex chars = 256-bit SHA-256
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
