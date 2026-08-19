import { runAuditLogArchival } from "../audit-log-archival";

describe("AuditLogArchival", () => {
  test("runs dry-run archival simulation successfully with batch chunking", async () => {
    const report = await runAuditLogArchival(180, true);
    expect(report.isSuccess).toBe(true);
    expect(report.retentionDays).toBe(180);
    expect(report.totalRecordsArchived).toBe(150);
    expect(report.batchesProcessed).toBe(1);
    expect(report.integrityVerified).toBe(true);
    expect(report.archiveChecksum).toBeDefined();
  });

  test("handles live database archival with zero expired records gracefully", async () => {
    const report = await runAuditLogArchival(3650, false); // 10 years retention (0 expired)
    expect(report.isSuccess).toBe(true);
    expect(report.totalRecordsArchived).toBe(0);
    expect(report.integrityVerified).toBe(true);
  });
});
