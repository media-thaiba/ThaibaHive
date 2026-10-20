/**
 * @jest-environment node
 *
 * Notifications & Real-Time Alerts Pipeline — Hardening & Integrity Suite:
 * - Safe JSON parsing across all mutating endpoints (400 Bad Request on invalid payloads)
 * - Schema bounds & platform enum validation
 * - Notification ownership & 404 guards on foreign or non-existent notification IDs
 * - Broadcast targeting authorization (403 Forbidden when non-admin targets foreign staff)
 * - Device token registration, re-assignment on collision, and query-scoped deletion
 * - Unread count accuracy and role-aligned permission access
 */

import {
  db,
  institutions,
  staff,
  staffInstitutions,
  notifications,
  staffDeviceTokens,
} from "@/db";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, inArray } from "drizzle-orm";
import {
  GET as listNotifications,
  PATCH as markNotificationsRead,
} from "@/app/api/notifications/route";
import { POST as broadcastNotification } from "@/app/api/notifications/broadcast/route";
import {
  POST as registerDeviceToken,
  DELETE as deleteDeviceTokens,
} from "@/app/api/notifications/device-token/route";
import { POST as sendPerformanceReminder } from "@/app/api/notifications/performance/remind/route";
import { GET as getUnreadCount } from "@/app/api/notifications/unread-count/route";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
  };
});

describe("Notifications & Real-Time Alerts Pipeline — Hardening", () => {
  const suffix = Math.random().toString(36).slice(2, 10);
  const instId = `inst_notif_${suffix}`;
  const adminId = `stf_notif_adm_${suffix}`;
  const staffAId = `stf_notif_sa_${suffix}`;
  const staffBId = `stf_notif_sb_${suffix}`;

  const notifA1Id = `notif_a1_${suffix}`;
  const notifA2Id = `notif_a2_${suffix}`;
  const notifB1Id = `notif_b1_${suffix}`;

  const tokenA = `fcm_token_a_${suffix}_12345`;
  const tokenB = `fcm_token_b_${suffix}_67890`;

  function asUser(role: string, staffId: string) {
    (verifySession as unknown as jest.Mock).mockResolvedValue({
      userId: `usr_${staffId}`,
      staffId,
      role,
      institutionId: instId,
    });
    (hasPermission as unknown as jest.Mock).mockImplementation((_session: unknown, perm: string) => {
      if (role === "super_admin" || role === "admin") return true;
      if (role === "staff") {
        if (
          perm === "notifications:read" ||
          perm === "notifications:update" ||
          perm === "performance:manage"
        ) {
          return true;
        }
      }
      return false;
    });
  }

  beforeAll(async () => {
    await db.insert(institutions).values({
      id: instId,
      name: `Institution Notifications ${suffix}`,
      code: `NTF_${suffix}`,
    });

    await db.insert(staff).values([
      {
        id: adminId,
        email: `admin_${suffix}@test.local`,
        employeeId: `EMP_ADM_${suffix}`,
        firstName: "Admin",
        lastName: "Alerts",
        role: "admin",
      },
      {
        id: staffAId,
        email: `staff_a_${suffix}@test.local`,
        employeeId: `EMP_STA_${suffix}`,
        firstName: "Staff",
        lastName: "Alpha",
        role: "staff",
      },
      {
        id: staffBId,
        email: `staff_b_${suffix}@test.local`,
        employeeId: `EMP_STB_${suffix}`,
        firstName: "Staff",
        lastName: "Beta",
        role: "staff",
      },
    ]);

    await db.insert(staffInstitutions).values([
      { id: `si_ntf_adm_${suffix}`, staffId: adminId, institutionId: instId },
      { id: `si_ntf_sa_${suffix}`, staffId: staffAId, institutionId: instId },
      { id: `si_ntf_sb_${suffix}`, staffId: staffBId, institutionId: instId },
    ]);

    // Seed notifications for Staff A and Staff B
    await db.insert(notifications).values([
      {
        id: notifA1Id,
        staffId: staffAId,
        title: "Staff A Alert 1",
        message: "Message 1 for Staff A",
        isRead: false,
      },
      {
        id: notifA2Id,
        staffId: staffAId,
        title: "Staff A Alert 2",
        message: "Message 2 for Staff A",
        isRead: false,
      },
      {
        id: notifB1Id,
        staffId: staffBId,
        title: "Staff B Alert 1",
        message: "Message 1 for Staff B",
        isRead: false,
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(staffDeviceTokens).where(inArray(staffDeviceTokens.staffId, [staffAId, staffBId, adminId])).run();
    await db.delete(notifications).where(inArray(notifications.id, [notifA1Id, notifA2Id, notifB1Id])).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instId)).run();
    await db.delete(staff).where(inArray(staff.id, [adminId, staffAId, staffBId])).run();
    await db.delete(institutions).where(eq(institutions.id, instId)).run();
  });

  describe("1. Safe JSON Parsing Across All Mutating Endpoints", () => {
    it("PATCH /api/notifications returns 400 on malformed JSON", async () => {
      asUser("staff", staffAId);
      const req = new Request("http://localhost/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{malformed_json",
      });
      const res = await markNotificationsRead(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/notifications/broadcast returns 400 on malformed JSON", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not a json string",
      });
      const res = await broadcastNotification(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/notifications/device-token returns 400 on malformed JSON", async () => {
      asUser("staff", staffAId);
      const req = new Request("http://localhost/api/notifications/device-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{{bad}}",
      });
      const res = await registerDeviceToken(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });

    it("POST /api/notifications/performance/remind returns 400 on malformed JSON", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/notifications/performance/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "bad json",
      });
      const res = await sendPerformanceReminder(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON payload");
    });
  });

  describe("2. Schema Bounds & Input Validation", () => {
    it("rejects device token registration without token with 400", async () => {
      asUser("staff", staffAId);
      const req = new Request("http://localhost/api/notifications/device-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "android",
        }),
      });
      const res = await registerDeviceToken(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeTruthy();
    });

    it("rejects broadcast with empty userId with 400", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "",
          channel: "alerts",
        }),
      });
      const res = await broadcastNotification(req);
      expect(res.status).toBe(400);
    });

    it("rejects performance reminder with invalid date format with 400", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/notifications/performance/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffAId,
          dueDate: "20-10-2026", // Not YYYY-MM-DD
        }),
      });
      const res = await sendPerformanceReminder(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Due date must be YYYY-MM-DD/i);
    });
  });

  describe("3. Notification Read & Ownership Lifecycle", () => {
    it("lists notifications and unread count for current staff", async () => {
      asUser("staff", staffAId);
      const req = new Request("http://localhost/api/notifications");
      const res = await listNotifications(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.notifications).toHaveLength(2);
      expect(json.unreadCount).toBe(2);
    });

    it("checks unread count via /api/notifications/unread-count", async () => {
      asUser("staff", staffAId);
      const req = new Request("http://localhost/api/notifications/unread-count");
      const res = await getUnreadCount(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.count).toBe(2);
    });

    it("rejects marking non-existent notification ID with 404", async () => {
      asUser("staff", staffAId);
      const req = new Request("http://localhost/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "non-existent-notification-id" }),
      });
      const res = await markNotificationsRead(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Notification not found");
    });

    it("rejects marking another staff member's notification ID with 404", async () => {
      asUser("staff", staffAId);
      // Try to mark Staff B's notification
      const req = new Request("http://localhost/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notifB1Id }),
      });
      const res = await markNotificationsRead(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Notification not found");
    });

    it("marks single notification as read and decrements unread count", async () => {
      asUser("staff", staffAId);
      const req = new Request("http://localhost/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notifA1Id }),
      });
      const res = await markNotificationsRead(req);
      expect(res.status).toBe(200);

      // Verify unread count is now 1
      const countRes = await getUnreadCount(new Request("http://localhost/api/notifications/unread-count"));
      const countJson = await countRes.json();
      expect(countJson.count).toBe(1);
    });

    it("marks all notifications as read when id is omitted", async () => {
      asUser("staff", staffAId);
      const req = new Request("http://localhost/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const res = await markNotificationsRead(req);
      expect(res.status).toBe(200);

      // Verify unread count is now 0
      const countRes = await getUnreadCount(new Request("http://localhost/api/notifications/unread-count"));
      const countJson = await countRes.json();
      expect(countJson.count).toBe(0);
    });
  });

  describe("4. Broadcast Targeting & Multi-Tenant Authorization", () => {
    it("blocks standard staff from broadcasting to foreign staff (403 Forbidden)", async () => {
      asUser("staff", staffAId);
      const req = new Request("http://localhost/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: staffBId,
          channel: "alert",
          data: { msg: "unauthorized" },
        }),
      });
      const res = await broadcastNotification(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Forbidden");
    });

    it("allows standard staff to broadcast to their own connection", async () => {
      asUser("staff", staffAId);
      const req = new Request("http://localhost/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: staffAId,
          channel: "refresh",
          data: { status: "ok" },
        }),
      });
      const res = await broadcastNotification(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.delivered).toBeDefined();
    });

    it("allows admin to broadcast to any staff member", async () => {
      asUser("admin", adminId);
      const req = new Request("http://localhost/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: staffBId,
          channel: "system_announcement",
          data: { text: "Server maintenance" },
        }),
      });
      const res = await broadcastNotification(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.delivered).toBeDefined();
    });
  });

  describe("5. Device Token Registration & Deletion", () => {
    it("registers new device token successfully", async () => {
      asUser("staff", staffAId);
      const req = new Request("http://localhost/api/notifications/device-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenA,
          platform: "android",
          deviceName: "Pixel 8 Pro",
        }),
      });
      const res = await registerDeviceToken(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const saved = await db
        .select()
        .from(staffDeviceTokens)
        .where(eq(staffDeviceTokens.token, tokenA))
        .get();
      expect(saved).toBeDefined();
      expect(saved?.staffId).toBe(staffAId);
      expect(saved?.platform).toBe("android");
    });

    it("re-assigns device token ownership on conflict without crash", async () => {
      // Staff B logs in on same device with tokenA
      asUser("staff", staffBId);
      const req = new Request("http://localhost/api/notifications/device-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenA,
          platform: "ios",
          deviceName: "iPhone 15 Pro",
        }),
      });
      const res = await registerDeviceToken(req);
      expect(res.status).toBe(200);

      const rechecked = await db
        .select()
        .from(staffDeviceTokens)
        .where(eq(staffDeviceTokens.token, tokenA))
        .get();
      expect(rechecked?.staffId).toBe(staffBId);
      expect(rechecked?.platform).toBe("ios");
    });

    it("deletes a specific device token via query param", async () => {
      asUser("staff", staffBId);
      const req = new Request(`http://localhost/api/notifications/device-token?token=${tokenA}`, {
        method: "DELETE",
      });
      const res = await deleteDeviceTokens(req);
      expect(res.status).toBe(200);

      const deleted = await db
        .select()
        .from(staffDeviceTokens)
        .where(eq(staffDeviceTokens.token, tokenA))
        .get();
      expect(deleted).toBeUndefined();
    });

    it("deletes all tokens for session staff when token param is omitted", async () => {
      // Register tokenB for Staff A
      asUser("staff", staffAId);
      await registerDeviceToken(
        new Request("http://localhost/api/notifications/device-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenB, platform: "web" }),
        })
      );

      // Delete all Staff A tokens
      const delReq = new Request("http://localhost/api/notifications/device-token", {
        method: "DELETE",
      });
      const delRes = await deleteDeviceTokens(delReq);
      expect(delRes.status).toBe(200);

      const remaining = await db
        .select()
        .from(staffDeviceTokens)
        .where(eq(staffDeviceTokens.staffId, staffAId))
        .all();
      expect(remaining).toHaveLength(0);
    });
  });
});
