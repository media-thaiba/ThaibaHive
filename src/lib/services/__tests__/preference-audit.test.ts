import { PreferenceAuditService } from "../preference-audit";
import { db } from "@/db";
import { preferenceAuditLog, institutions } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";

describe("PreferenceAuditService", () => {
  beforeEach(async () => {
    // Clean up
    await db.delete(preferenceAuditLog).run();
    await db.delete(institutions).where(eq(institutions.id, "inst_test_01")).run();

    // Insert mock institution to satisfy FK constraints
    await db.insert(institutions).values({
      id: "inst_test_01",
      name: "Test Campus",
      code: "TEST_CAMPUS",
    }).run();
  });

  afterEach(async () => {
    await db.delete(preferenceAuditLog).run();
    await db.delete(institutions).where(eq(institutions.id, "inst_test_01")).run();
  });

  it("should asynchronously log a preference change without throwing", async () => {
    PreferenceAuditService.logPreferenceChange(
      "user_01",
      "principal",
      JSON.stringify([{ widgetId: "w1", enabled: true, order: 0 }]),
      JSON.stringify([{ widgetId: "w1", enabled: false, order: 0 }]),
      "inst_test_01",
      "127.0.0.1"
    );

    // Wait for the async promise to resolve
    await new Promise((resolve) => setTimeout(resolve, 100));

    const logs = await db.select().from(preferenceAuditLog).all();
    expect(logs.length).toBe(1);
    expect(logs[0].userId).toBe("user_01");
    expect(logs[0].preferenceKey).toBe("principal");
    expect(logs[0].ipAddress).toBe("127.0.0.1");
  });

  it("should correctly prune logs older than retention window", async () => {
    // Insert logs directly
    const oldTimestamp = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString();
    const newTimestamp = new Date().toISOString();

    await db.insert(preferenceAuditLog).values([
      {
        id: "log_old",
        timestamp: oldTimestamp,
        userId: "user_01",
        preferenceKey: "principal",
        newValue: "{}",
        institutionId: "inst_test_01",
      },
      {
        id: "log_new",
        timestamp: newTimestamp,
        userId: "user_01",
        preferenceKey: "principal",
        newValue: "{}",
        institutionId: "inst_test_01",
      },
    ]).run();

    // Prune with 90 day retention
    const prunedCount = await PreferenceAuditService.pruneOldAuditLogs(90);
    expect(prunedCount).toBe(1);

    const remainingLogs = await db.select().from(preferenceAuditLog).all();
    expect(remainingLogs.length).toBe(1);
    expect(remainingLogs[0].id).toBe("log_new");
  });

  it("should restrict retrieving audit logs to super_admin role explicitly", async () => {
    await db.insert(preferenceAuditLog).values({
      id: "log_role_check",
      userId: "user_01",
      preferenceKey: "principal",
      newValue: "{}",
      institutionId: "inst_test_01",
    }).run();

    // super_admin should succeed
    const logs = await PreferenceAuditService.getAuditLogs("super_admin", "inst_test_01");
    expect(logs.length).toBe(1);
    expect(logs[0].id).toBe("log_role_check");

    // admin, staff, principal should be blocked
    await expect(PreferenceAuditService.getAuditLogs("admin", "inst_test_01"))
      .rejects.toThrow("Unauthorized: Access restricted to super_admin operators only.");

    await expect(PreferenceAuditService.getAuditLogs("staff", "inst_test_01"))
      .rejects.toThrow("Unauthorized: Access restricted to super_admin operators only.");
  });
});
