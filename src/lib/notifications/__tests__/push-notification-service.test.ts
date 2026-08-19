
import { PushNotificationService } from "../push-notification-service";
import { ensureRegionalTablesExist } from "@/lib/regional/dw-etl-service";
import { db } from "@/db";
import { alertDeliveryLogs,  } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("REG-007: Real-Time AI Critical Risk Push Notification Router", () => {
  it("registers device token subscription and dispatches priority alerts", async () => {
    await ensureRegionalTablesExist();

    const token = `tok_test_${Date.now()}`;
    const sub = await PushNotificationService.registerSubscription({
      userId: "usr_reg_director_01",
      deviceToken: token,
      platform: "android",
    });

    expect(sub.id).toBeDefined();
    expect(sub.userId).toBe("usr_reg_director_01");

    // Dispatch critical alert
    const dispatchRes = await PushNotificationService.dispatchAlert({
      alertId: `anom_crit_${Date.now()}`,
      severity: "critical",
      title: "Critical Drop in Fee Realization",
      body: "Northern Campus network fee collection dropped 22% below baseline.",
    });

    expect(dispatchRes.success).toBe(true);
    expect(dispatchRes.dispatchedCount).toBeGreaterThanOrEqual(1);

    // Verify delivery logs
    const logs = await db
      .select()
      .from(alertDeliveryLogs)
      .where(eq(alertDeliveryLogs.alertId, dispatchRes.alertId))
      .all();

    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].deliveryStatus).toBe("delivered");
  });
});
