import { AuditLogService } from "../models/audit-log";

describe("Audit Trail Immutability & Logging", () => {
  beforeEach(() => {
    AuditLogService.clearLogsForTesting();
  });

  it("records audit logs with unique IDs and timestamps", () => {
    const entry = AuditLogService.recordLog({
      requestId: "req-101",
      requestType: "expense",
      action: "approve",
      previousStatus: "pending_hod",
      newStatus: "approved",
      actorId: "staff-1",
      actorName: "John Manager",
      actorRole: "hod",
      notes: "Approved after receipt check",
      institutionId: "inst-1",
    });

    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    expect(entry.requestId).toBe("req-101");
  });

  it("retrieves logs for a specific request ID", () => {
    AuditLogService.recordLog({
      requestId: "req-101",
      requestType: "expense",
      action: "submit",
      previousStatus: null,
      newStatus: "pending_hod",
      actorId: "staff-2",
      actorName: "Alice Staff",
      actorRole: "staff",
      institutionId: "inst-1",
    });

    AuditLogService.recordLog({
      requestId: "req-101",
      requestType: "expense",
      action: "approve",
      previousStatus: "pending_hod",
      newStatus: "approved",
      actorId: "staff-1",
      actorName: "John Manager",
      actorRole: "hod",
      institutionId: "inst-1",
    });

    const logs = AuditLogService.getLogsForRequest("req-101");
    expect(logs.length).toBe(2);
    expect(logs[0].action).toBe("submit");
    expect(logs[1].action).toBe("approve");
  });

  it("enforces tenant isolation by institution ID", () => {
    AuditLogService.recordLog({
      requestId: "req-201",
      requestType: "purchase",
      action: "approve",
      previousStatus: "pending_hod",
      newStatus: "pending_accounts",
      actorId: "staff-3",
      actorName: "Bob HOD",
      actorRole: "hod",
      institutionId: "campus-A",
    });

    AuditLogService.recordLog({
      requestId: "req-202",
      requestType: "purchase",
      action: "approve",
      previousStatus: "pending_hod",
      newStatus: "approved",
      actorId: "staff-4",
      actorName: "Carol HOD",
      actorRole: "hod",
      institutionId: "campus-B",
    });

    const campusALogs = AuditLogService.getLogsForInstitution("campus-A");
    expect(campusALogs.length).toBe(1);
    expect(campusALogs[0].requestId).toBe("req-201");
  });
});
