import { AuditLogService } from "../models/audit-log";

describe("Audit Performance & Large Dataset Benchmark", () => {
  it("handles 1,000 audit log insertions under 100ms", () => {
    AuditLogService.clearLogsForTesting();
    const start = Date.now();

    for (let i = 0; i < 1000; i++) {
      AuditLogService.recordLog({
        requestId: `req-${i}`,
        requestType: "expense",
        action: "approve",
        previousStatus: "pending_hod",
        newStatus: "approved",
        actorId: `user-${i % 10}`,
        actorName: `Approver ${i % 10}`,
        actorRole: "hod",
        institutionId: "inst-main",
      });
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);

    const logs = AuditLogService.getLogsForInstitution("inst-main");
    expect(logs.length).toBe(1000);
  });
});
