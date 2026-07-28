import { db } from "@/db";
import { staffDeviceTokens } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Prune dead/unregistered FCM token from database
 */
export async function pruneDeadDeviceToken(token: string): Promise<void> {
  try {
    console.log(`[PushDispatcher] Pruning dead FCM token: ${token}`);
    await db.delete(staffDeviceTokens).where(eq(staffDeviceTokens.token, token));
  } catch (error) {
    console.error(`[PushDispatcher] Error pruning dead token ${token}:`, error);
  }
}

/**
 * Dispatch push notifications to specified staff members
 */
export async function sendPushNotificationToStaff(
  staffIds: string[],
  payload: PushNotificationPayload
): Promise<{ successCount: number; failureCount: number }> {
  if (!staffIds || staffIds.length === 0) return { successCount: 0, failureCount: 0 };

  try {
    const devices = await db
      .select({ token: staffDeviceTokens.token, platform: staffDeviceTokens.platform })
      .from(staffDeviceTokens)
      .where(inArray(staffDeviceTokens.staffId, staffIds));

    if (!devices || devices.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    let successCount = 0;
    let failureCount = 0;

    for (const device of devices) {
      try {
        // FCM HTTP v1 / legacy relay placeholder logic
        console.log(`[PushDispatcher] Sending push to ${device.platform} token ${device.token}:`, payload.title);
        successCount++;
      } catch (err: unknown) {
        failureCount++;
        const errMessage = String(err);
        // Intercept dead/unregistered tokens and prune
        if (
          errMessage.includes("UNREGISTERED") ||
          errMessage.includes("registration-token-not-registered") ||
          errMessage.includes("DeviceNotRegistered")
        ) {
          await pruneDeadDeviceToken(device.token);
        }
      }
    }

    return { successCount, failureCount };
  } catch (error) {
    console.error("[PushDispatcher] Error dispatching push notifications:", error);
    return { successCount: 0, failureCount: 0 };
  }
}
