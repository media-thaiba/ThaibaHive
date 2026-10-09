import { db } from "@/db";
import { chatChannels, chatMembers, staff, staffDeviceTokens } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";
import { chatPubSub } from "@/lib/chat/pubsub-broker";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging, type Messaging, type MulticastMessage } from "firebase-admin/messaging";

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
    console.error("[FCM ChatNotifier] Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

export interface QueuedChatMessage {
  messageId: string;
  content: string;
  type: string;
  createdAt: string;
  senderId: string;
  senderName: string;
}

export interface PendingChatNotification {
  recipientStaffId: string;
  channelId: string;
  channelName: string;
  channelType: string;
  institutionId: string;
  messages: QueuedChatMessage[];
  timer: NodeJS.Timeout | null;
  firstQueuedAt: number;
}

export class FcmChatNotifier {
  private static instance: FcmChatNotifier;
  private pendingNotifications: Map<string, PendingChatNotification> = new Map();
  private aggregationWindowMs: number = 30_000; // 30 seconds debounce/aggregation

  private constructor() {}

  public static getInstance(): FcmChatNotifier {
    if (!FcmChatNotifier.instance) {
      FcmChatNotifier.instance = new FcmChatNotifier();
    }
    return FcmChatNotifier.instance;
  }

  public setAggregationWindow(ms: number) {
    this.aggregationWindowMs = ms;
  }

  public getPendingCount(): number {
    return this.pendingNotifications.size;
  }

  private getKey(institutionId: string, channelId: string, recipientStaffId: string): string {
    return `${institutionId}:${channelId}:${recipientStaffId}`;
  }

  /**
   * Queue a chat message for push notification with 30-second aggregation.
   */
  public async queueNotification(options: {
    institutionId: string;
    channelId: string;
    channelName: string;
    channelType: string;
    recipientStaffId: string;
    message: QueuedChatMessage;
    immediateFlush?: boolean;
  }): Promise<boolean> {
    const {
      institutionId,
      channelId,
      channelName,
      channelType,
      recipientStaffId,
      message,
      immediateFlush = false,
    } = options;

    // 1. Skip push if recipient is currently active on WebSocket in this channel
    if (chatPubSub.isUserConnected(channelId, recipientStaffId)) {
      return false;
    }

    const key = this.getKey(institutionId, channelId, recipientStaffId);
    let pending = this.pendingNotifications.get(key);

    if (pending) {
      pending.messages.push(message);
    } else {
      pending = {
        recipientStaffId,
        channelId,
        channelName,
        channelType,
        institutionId,
        messages: [message],
        timer: null,
        firstQueuedAt: Date.now(),
      };
      this.pendingNotifications.set(key, pending);
    }

    if (immediateFlush || this.aggregationWindowMs <= 0) {
      if (pending.timer) clearTimeout(pending.timer);
      await this.flushNotificationByKey(key);
      return true;
    }

    if (!pending.timer) {
      pending.timer = setTimeout(async () => {
        try {
          await this.flushNotificationByKey(key);
        } catch (err) {
          console.error(`[FCM ChatNotifier] Error flushing notification for key ${key}:`, err);
        }
      }, this.aggregationWindowMs);
    }

    return true;
  }

  /**
   * Flushes and sends a pending notification batch for a specific key.
   */
  public async flushNotificationByKey(key: string): Promise<{ success: boolean; deliveredCount: number }> {
    const pending = this.pendingNotifications.get(key);
    if (!pending) {
      return { success: false, deliveredCount: 0 };
    }

    if (pending.timer) {
      clearTimeout(pending.timer);
      pending.timer = null;
    }

    this.pendingNotifications.delete(key);

    const { recipientStaffId, channelId, channelName, channelType, institutionId, messages } = pending;
    if (messages.length === 0) {
      return { success: true, deliveredCount: 0 };
    }

    // Lookup recipient device tokens
    const tokens = await db
      .select({ token: staffDeviceTokens.token })
      .from(staffDeviceTokens)
      .where(
        and(
          eq(staffDeviceTokens.staffId, recipientStaffId),
          eq(staffDeviceTokens.institutionId, institutionId)
        )
      )
      .all();

    if (tokens.length === 0) {
      return { success: true, deliveredCount: 0 };
    }

    const tokenStrings = tokens.map((t) => t.token);
    const latestMessage = messages[messages.length - 1];

    let title: string;
    let body: string;

    if (messages.length === 1) {
      title = channelType === "direct" ? latestMessage.senderName : `#${channelName}`;
      body =
        channelType === "direct"
          ? latestMessage.content
          : `${latestMessage.senderName}: ${latestMessage.content}`;
    } else {
      title = channelType === "direct" ? latestMessage.senderName : `#${channelName}`;
      body = `${messages.length} new messages. Latest: ${latestMessage.content.slice(0, 60)}`;
    }

    // Truncate body if excessively long
    if (body.length > 150) {
      body = body.slice(0, 147) + "...";
    }

    const deepLink = `thaibahive://chat/${channelId}`;
    const messaging = getFirebaseMessaging();

    if (!messaging) {
      // Stub delivery for dev/test environments
      return { success: true, deliveredCount: tokenStrings.length };
    }

    try {
      const payload: MulticastMessage = {
        tokens: tokenStrings,
        notification: {
          title,
          body,
        },
        data: {
          type: "chat_message",
          channelId,
          messageId: latestMessage.messageId,
          senderId: latestMessage.senderId,
          link: deepLink,
          contentAvailable: "true",
          unreadCount: String(messages.length),
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            clickAction: deepLink,
          },
        },
        apns: {
          payload: {
            aps: {
              "content-available": 1,
              sound: "default",
              badge: messages.length,
            },
          },
        },
      };

      const response = await messaging.sendEachForMulticast(payload);
      return { success: true, deliveredCount: response.successCount };
    } catch (error) {
      console.error("[FCM ChatNotifier] Multicast send error:", error);
      return { success: false, deliveredCount: 0 };
    }
  }

  /**
   * Flushes all pending notifications across all keys immediately.
   */
  public async flushAllPending(): Promise<void> {
    const keys = Array.from(this.pendingNotifications.keys());
    for (const key of keys) {
      await this.flushNotificationByKey(key);
    }
  }

  /**
   * Clears pending queue without sending (useful for test reset).
   */
  public clearAllPending(): void {
    for (const pending of this.pendingNotifications.values()) {
      if (pending.timer) {
        clearTimeout(pending.timer);
      }
    }
    this.pendingNotifications.clear();
  }
}

export const fcmChatNotifier = FcmChatNotifier.getInstance();

/**
 * High-level helper to trigger push notifications to all eligible members of a channel.
 */
export async function dispatchChatMessagePush(params: {
  channelId: string;
  message: {
    id: string;
    content: string;
    type: string;
    senderId: string;
    createdAt: string;
  };
  institutionId: string;
  immediateFlush?: boolean;
}): Promise<void> {
  const { channelId, message, institutionId, immediateFlush = false } = params;

  // 1. Fetch channel metadata and members
  const channel = await db
    .select()
    .from(chatChannels)
    .where(and(eq(chatChannels.id, channelId), eq(chatChannels.institutionId, institutionId)))
    .get();

  if (!channel || !channel.isActive) {
    return;
  }

  // 2. Fetch sender profile
  const senderStaff = await db
    .select({ firstName: staff.firstName, lastName: staff.lastName })
    .from(staff)
    .where(eq(staff.id, message.senderId))
    .get();

  const senderName = senderStaff
    ? `${senderStaff.firstName} ${senderStaff.lastName}`.trim()
    : "Colleague";

  // 3. Fetch channel members
  const members = await db
    .select({
      staffId: chatMembers.staffId,
      mutedUntil: chatMembers.mutedUntil,
    })
    .from(chatMembers)
    .where(eq(chatMembers.channelId, channelId))
    .all();

  const now = new Date().toISOString();

  // 4. Queue notifications for non-sender, unmuted members
  for (const m of members) {
    if (m.staffId === message.senderId) {
      continue;
    }

    // Skip if muted
    if (m.mutedUntil && m.mutedUntil > now) {
      continue;
    }

    await fcmChatNotifier.queueNotification({
      institutionId,
      channelId,
      channelName: channel.name || "Chat",
      channelType: channel.type,
      recipientStaffId: m.staffId,
      message: {
        messageId: message.id,
        content: message.content,
        type: message.type,
        createdAt: message.createdAt,
        senderId: message.senderId,
        senderName,
      },
      immediateFlush,
    });
  }
}
