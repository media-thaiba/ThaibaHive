import { db } from "@/db";
import { notifications, staffDeviceTokens } from "@/db/schema";
import { sendToConnection } from "@/lib/api/realtime";
import { eq, inArray, and } from "drizzle-orm";
import crypto from "crypto";

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

/** Per-wave ceiling for a single FCM multicast wave (5 x 100-token batches). */
export const FCM_WAVE_TIMEOUT_MS = 12_000;

/** Total budget for every wave of one bulk dispatch, below Vercel's ceiling. */
export const FCM_TOTAL_DEADLINE_MS = 45_000;

/** Safety margin reserved for database notification inserts and post-loop stale token pruning. */
export const FCM_PRUNING_MARGIN_MS = 10_000;

class FcmWaveTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FcmWaveTimeoutError";
  }
}

/**
 * Race a promise against an explicit hard timeout.
 *
 * `Promise.race` subscribes to both inputs immediately and the timer is always
 * cleared, so a late settlement of `promise` is observed rather than leaking
 * as an unhandled rejection once the timeout has won.
 */
async function withHardTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Attach a no-op catch to the promise so a late rejection after timeout does not bubble as unhandledRejection
  promise.catch(() => {});

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new FcmWaveTimeoutError(message)), ms);
  });
  timeout.catch(() => {});

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// Lazy-initialized Firebase Admin instance
let firebaseMessagingInstance: Messaging | null = null;
let isFirebaseInitialized = false;

function getFirebaseMessaging(): Messaging | null {
  if (isFirebaseInitialized) {
    return firebaseMessagingInstance;
  }

  isFirebaseInitialized = true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    if (process.env.VERCEL_ENV === "production") {
      process.stderr.write(
        JSON.stringify({
          event: "fcm_missing_credentials",
          error: "FIREBASE credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are missing in Vercel production environment",
          timestamp: new Date().toISOString(),
        }) + "\n"
      );
    } else if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[FCM PushService] Missing Firebase credentials environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Push notifications will operate in stub mode."
      );
    }
    return null;
  }

  try {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    firebaseMessagingInstance = getMessaging();
    return firebaseMessagingInstance;
  } catch (error) {
    console.error("[FCM PushService] Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

export type PushNotificationOptions = {
  staffId: string;
  title: string;
  message: string;
  type?: string;
  referenceType?: string;
  referenceId?: string;
};

export type BulkPushNotificationOptions = {
  institutionId?: string;
  staffIds?: string[];
  title: string;
  message: string;
  type?: string;
  referenceType?: string;
  referenceId?: string;
};

const STALE_TOKEN_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

/**
 * Send an in-app and FCM push notification to a single staff member.
 */
export async function sendPushNotification(options: PushNotificationOptions): Promise<{
  notificationId: string;
  deliveredCount: number;
}> {
  const { staffId, title, message, type = "general", referenceType, referenceId } = options;
  const notificationId = crypto.randomUUID();

  // 1. Synchronous in-app notification insertion
  await db.insert(notifications).values({
    id: notificationId,
    staffId,
    title,
    message,
    type,
    referenceType: referenceType ?? null,
    referenceId: referenceId ?? null,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  // 2. Dispatch real-time SSE event for open web dashboard tabs and mobile
  // (canonical {type:'new', notification:{…}} frame — matches notifications.ts)
  sendToConnection(`notification-${staffId}`, "notification", {
    type: "new",
    notification: {
      id: notificationId,
      type,
      referenceType: referenceType ?? null,
      referenceId: referenceId ?? null,
      title,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  });

  // 3. Fetch device tokens for target staff member
  const tokens = await db
    .select({ token: staffDeviceTokens.token })
    .from(staffDeviceTokens)
    .where(eq(staffDeviceTokens.staffId, staffId));

  if (!tokens.length) {
    return { notificationId, deliveredCount: 0 };
  }

  const tokenStrings = tokens.map((t) => t.token);
  const messaging = getFirebaseMessaging();

  if (!messaging) {
    return { notificationId, deliveredCount: 0 };
  }

  // 4. Send multicast push via Firebase Admin
  try {
    const response = await messaging.sendEachForMulticast({
      tokens: tokenStrings,
      notification: {
        title,
        body: message,
      },
      data: {
        type,
        referenceType: referenceType ?? "",
        referenceId: referenceId ?? "",
        notificationId,
      },
      webpush: {
        notification: {
          tag: notificationId,
        },
      },
      android: {
        collapseKey: notificationId,
      },
      apns: {
        headers: {
          "apns-collapse-id": notificationId,
        },
      },
    });

    // 5. Handle stale token pruning
    const staleTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success && res.error) {
        if (STALE_TOKEN_ERROR_CODES.has(res.error.code)) {
          staleTokens.push(tokenStrings[idx]);
        }
      }
    });

    if (staleTokens.length > 0) {
      await db.delete(staffDeviceTokens).where(inArray(staffDeviceTokens.token, staleTokens));
    }

    return { notificationId, deliveredCount: response.successCount };
  } catch (error) {
    console.error("[FCM PushService] Error dispatching FCM multicast:", error);
    return { notificationId, deliveredCount: 0 };
  }
}

/**
 * Send bulk in-app and FCM push notifications to multiple staff members.
 * Supports institution-level multi-tenancy isolation and wave batching.
 *
 * Each wave is hard-capped at 12s and the whole loop is capped at a 45s
 * deadline, so a slow FCM never runs a Vercel function into its execution
 * ceiling: progress made before the deadline is returned as partial results.
 */
export async function sendBulkPushNotifications(options: BulkPushNotificationOptions): Promise<{
  insertedCount: number;
  deliveredCount: number;
}> {
  const startedAt = Date.now();
  const { institutionId, staffIds, title, message, type = "general", referenceType, referenceId } = options;

  if (staffIds && staffIds.length === 0) {
    return { insertedCount: 0, deliveredCount: 0 };
  }

  // 1. Synchronously insert in-app notifications
  let targetStaffIds: string[] = [];

  if (staffIds && staffIds.length > 0) {
    targetStaffIds = staffIds;
  } else {
    // If no explicit staffIds provided, target all staff in institution if institutionId is set
    const query = db.select({ id: staffDeviceTokens.staffId }).from(staffDeviceTokens);
    if (institutionId) {
      query.where(eq(staffDeviceTokens.institutionId, institutionId));
    }
    const rows = await query;
    targetStaffIds = Array.from(new Set(rows.map((r) => r.id)));
  }

  if (targetStaffIds.length === 0) {
    return { insertedCount: 0, deliveredCount: 0 };
  }

  const notificationId = crypto.randomUUID();
  const notificationRows = targetStaffIds.map((sId) => ({
    id: crypto.randomUUID(),
    staffId: sId,
    title,
    message,
    type,
    referenceType: referenceType ?? null,
    referenceId: referenceId ?? null,
    isRead: false,
    createdAt: new Date().toISOString(),
  }));

  // Batch insert in-app notifications
  await db.insert(notifications).values(notificationRows);

  // 2. Fetch device tokens scoped by institutionId and/or staffIds
  const conditions = [];
  if (institutionId) {
    conditions.push(eq(staffDeviceTokens.institutionId, institutionId));
  }
  if (staffIds && staffIds.length > 0) {
    conditions.push(inArray(staffDeviceTokens.staffId, staffIds));
  }

  const deviceTokenRows = await db
    .select({ token: staffDeviceTokens.token })
    .from(staffDeviceTokens)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const allTokens = deviceTokenRows.map((r) => r.token);

  if (allTokens.length === 0) {
    return { insertedCount: notificationRows.length, deliveredCount: 0 };
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return { insertedCount: notificationRows.length, deliveredCount: 0 };
  }

  // 3. Wave-batch dispatch (waves of 5 concurrent 100-token batches)
  const BATCH_SIZE = 100;
  const CONCURRENCY = 5;
  const batches: string[][] = [];

  for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
    batches.push(allTokens.slice(i, i + BATCH_SIZE));
  }

  let totalDelivered = 0;
  const allStaleTokens: string[] = [];

  // Absolute deadline anchored to function execution start, reserving safety margin for post-loop pruning
  const deadline = startedAt + FCM_TOTAL_DEADLINE_MS;

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const remainingBudgetMs = deadline - Date.now() - FCM_PRUNING_MARGIN_MS;
    if (remainingBudgetMs < 1000) {
      const remainingBatches = batches.length - i;
      const unsentTokenCount = batches.slice(i).reduce((acc, b) => acc + b.length, 0);
      console.warn(
        `[FCM PushService] 35s send window budget reached with ${remainingBatches} batch(es) (${unsentTokenCount} tokens) remaining; returning partial progress.`,
        { institutionId: institutionId ?? null, remainingBatches, unsentTokenCount }
      );
      process.stderr.write(
        JSON.stringify({
          event: "push_budget_exhausted",
          institutionId: institutionId ?? null,
          remainingBatches,
          unsentTokenCount,
        }) + "\n"
      );
      break;
    }

    // Clamp wave timeout to remaining time before the pruning budget starts
    const waveTimeoutMs = Math.min(FCM_WAVE_TIMEOUT_MS, remainingBudgetMs);

    const wave = batches.slice(i, i + CONCURRENCY);
    const waveResults = await Promise.allSettled(
      wave.map(async (batchTokens) => {
        const response = await withHardTimeout(
          messaging.sendEachForMulticast({
            tokens: batchTokens,
            notification: { title, body: message },
            data: {
              type,
              referenceType: referenceType ?? "",
              referenceId: referenceId ?? "",
              notificationId,
            },
            webpush: { notification: { tag: notificationId } },
            android: { collapseKey: notificationId },
            apns: { headers: { "apns-collapse-id": notificationId } },
          }),
          waveTimeoutMs,
          `FCM multicast wave timed out after ${waveTimeoutMs}ms`
        );

        const stale: string[] = [];
        response.responses.forEach((res, idx) => {
          if (!res.success && res.error && STALE_TOKEN_ERROR_CODES.has(res.error.code)) {
            stale.push(batchTokens[idx]);
          }
        });

        return { successCount: response.successCount, staleTokens: stale };
      })
    );

    waveResults.forEach((res, idx) => {
      if (res.status === "fulfilled") {
        totalDelivered += res.value.successCount;
        allStaleTokens.push(...res.value.staleTokens);
      } else {
        const batchTokenCount = wave[idx]?.length ?? 0;
        console.warn("[FCM PushService] Wave batch failed or timed out:", {
          reason: res.reason instanceof Error ? res.reason.message : String(res.reason),
          batchSize: batchTokenCount,
          institutionId: institutionId ?? null,
        });
        const isTimeout =
          res.reason instanceof Error &&
          (res.reason.name === "PushWaveTimeoutError" ||
            res.reason.message.includes("timed out"));
        process.stderr.write(
          JSON.stringify({
            event: isTimeout ? "push_wave_timeout" : "push_wave_failed",
            institutionId: institutionId ?? null,
            batchSize: batchTokenCount,
            error: res.reason instanceof Error ? res.reason.message : String(res.reason),
          }) + "\n"
        );
      }
    });
  }

  // 4. Idempotent bulk prune stale tokens, strictly scoped to the tenant being notified
  if (allStaleTokens.length > 0) {
    if (!institutionId) {
      console.warn("[FCM PushService] Skipping pruning of stale tokens: institutionId is missing.");
    } else {
      const uniqueStale = Array.from(new Set(allStaleTokens));
      await db
        .delete(staffDeviceTokens)
        .where(
          and(
            inArray(staffDeviceTokens.token, uniqueStale),
            eq(staffDeviceTokens.institutionId, institutionId)
          )
        );
    }
  }

  return { insertedCount: notificationRows.length, deliveredCount: totalDelivered };
}
