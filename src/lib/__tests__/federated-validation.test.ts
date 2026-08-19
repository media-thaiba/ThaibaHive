import {
  federatedPolicySchema,
  crossTenantRoleMappingSchema,
  circuitBreakerConfigSchema,
  offlineSyncPayloadSchema,
  voiceQuerySchema,
} from "../validation/schemas";
import { hasPermission } from "../../../packages/auth/roles";

describe("FED-002: Validation Schemas & RBAC Permission Extensions Test Suite", () => {
  it("validates valid and invalid federated policy schemas", () => {
    const validPolicy = federatedPolicySchema.safeParse({
      title: "Cross-Institutional Grading Standard",
      category: "academics",
      content: { minPassingMark: 40, gpaScale: 4.0 },
      status: "DRAFT",
    });
    expect(validPolicy.success).toBe(true);

    const invalidPolicy = federatedPolicySchema.safeParse({
      title: "",
      status: "INVALID_STATUS",
    });
    expect(invalidPolicy.success).toBe(false);
  });

  it("validates cross-tenant role mapping schemas", () => {
    const validMapping = crossTenantRoleMappingSchema.safeParse({
      sourceTenantId: "tenant-north",
      targetTenantId: "tenant-south",
      sourceRole: "principal",
      targetRole: "regional_auditor",
      permissions: ["federated:policies", "federated:audit"],
    });
    expect(validMapping.success).toBe(true);
  });

  it("validates circuit breaker configuration schemas", () => {
    const validConfig = circuitBreakerConfigSchema.safeParse({
      serviceName: "database-read-pool",
      maxFailureRate: 0.15,
      maxMedianLatencyMs: 1500,
      cooldownPeriodSec: 45,
    });
    expect(validConfig.success).toBe(true);
  });

  it("validates mobile offline sync payload schemas", () => {
    const validPayload = offlineSyncPayloadSchema.safeParse({
      deviceId: "device-xyz-123",
      mutations: [
        {
          id: "mut-1",
          mutationType: "CREATE",
          entityType: "student_attendance",
          payload: { studentId: "std-001", status: "present" },
          clientTimestamp: "2026-08-01T10:00:00Z",
        },
      ],
    });
    expect(validPayload.success).toBe(true);
  });

  it("validates executive voice query schemas", () => {
    const validVoiceQuery = voiceQuerySchema.safeParse({
      transcriptText: "What is the financial operating margin for Campus North?",
      audioFormat: "wav",
      language: "en-US",
    });
    expect(validVoiceQuery.success).toBe(true);
  });

  it("verifies Sprint-013 RBAC permission assignments across roles", () => {
    expect(hasPermission("super_admin", "federated:policies")).toBe(true);
    expect(hasPermission("regional_admin", "federated:policies")).toBe(true);
    expect(hasPermission("regional_admin", "resilience:manage")).toBe(true);
    expect(hasPermission("regional_auditor", "federated:audit")).toBe(true);
    expect(hasPermission("admin", "resilience:manage")).toBe(true);
    expect(hasPermission("principal", "voice:copilot")).toBe(true);
    expect(hasPermission("hod", "voice:copilot")).toBe(true);
    expect(hasPermission("staff", "federated:policies")).toBe(false);
  });
});
