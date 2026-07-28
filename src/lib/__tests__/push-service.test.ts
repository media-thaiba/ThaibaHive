import { db } from "@/db";
import { staffDeviceTokens, notifications, staff, institutions } from "@/db/schema";
import { sendPushNotification, sendBulkPushNotifications } from "@/lib/notifications/push-service";
import { eq, inArray } from "drizzle-orm";

describe("FCM PushService & Device Tokens", () => {
  let testStaffA: string;
  let testStaffB: string;
  let testInstitution1: string;
  let testInstitution2: string;
  const mockToken = "fcm-token-unit-test-12345";

  beforeAll(async () => {
    // Query existing staff & institutions from seeded database
    const staffRows = await db.select({ id: staff.id }).from(staff).limit(2).all();
    const instRows = await db.select({ id: institutions.id }).from(institutions).limit(2).all();

    testStaffA = staffRows[0]?.id || "staff-fallback-a";
    testStaffB = staffRows[1]?.id || "staff-fallback-b";
    testInstitution1 = instRows[0]?.id || "inst-fallback-1";
    testInstitution2 = instRows[1]?.id || "inst-fallback-2";
  });

  afterEach(async () => {
    // Clean up test tokens & notifications
    await db.delete(staffDeviceTokens).where(eq(staffDeviceTokens.token, mockToken)).run();
    await db.delete(notifications).where(eq(notifications.staffId, testStaffA)).run();
    await db.delete(notifications).where(eq(notifications.staffId, testStaffB)).run();
  });

  test("Shared device token reassignment on upsert (prevents cross-account leaks)", async () => {
    const now = new Date().toISOString();

    // 1. Staff A registers token
    await db.insert(staffDeviceTokens).values({
      id: "token-row-1",
      staffId: testStaffA,
      institutionId: testInstitution1,
      token: mockToken,
      platform: "android",
      lastUsedAt: now,
      createdAt: now,
    }).run();

    let row = await db.select().from(staffDeviceTokens).where(eq(staffDeviceTokens.token, mockToken)).get();
    expect(row).toBeDefined();
    expect(row?.staffId).toBe(testStaffA);

    // 2. Staff B logs into same device — token updates owner to Staff B
    await db
      .update(staffDeviceTokens)
      .set({
        staffId: testStaffB,
        institutionId: testInstitution1,
        lastUsedAt: new Date().toISOString(),
      })
      .where(eq(staffDeviceTokens.token, mockToken))
      .run();

    row = await db.select().from(staffDeviceTokens).where(eq(staffDeviceTokens.token, mockToken)).get();
    expect(row?.staffId).toBe(testStaffB);
  });

  test("sendPushNotification inserts synchronous in-app notification", async () => {
    const result = await sendPushNotification({
      staffId: testStaffA,
      title: "Test In-App Push",
      message: "Unit test message content",
      type: "leave",
    });

    expect(result.notificationId).toBeDefined();

    const created = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, result.notificationId))
      .get();

    expect(created).toBeDefined();
    expect(created?.title).toBe("Test In-App Push");
    expect(created?.staffId).toBe(testStaffA);
    expect(created?.isRead).toBe(false);
  });

  test("sendBulkPushNotifications respects institution multi-tenancy isolation", async () => {
    const tokenA = "token-inst-1-unique";
    const tokenB = "token-inst-2-unique";

    await db.insert(staffDeviceTokens).values([
      { id: "row-a", staffId: testStaffA, institutionId: testInstitution1, token: tokenA, platform: "web" },
      { id: "row-b", staffId: testStaffB, institutionId: testInstitution2, token: tokenB, platform: "web" },
    ]).run();

    const result = await sendBulkPushNotifications({
      institutionId: testInstitution1,
      staffIds: [testStaffA],
      title: "Targeted Announcement",
      message: "Institution 1 announcement body",
      type: "announcement",
    });

    expect(result.insertedCount).toBe(1);

    // Cleanup
    await db.delete(staffDeviceTokens).where(inArray(staffDeviceTokens.token, [tokenA, tokenB])).run();
  });
});
