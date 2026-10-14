import { db } from "@/db";
import { eq, inArray } from "drizzle-orm";
import {
  institutions,
  staff,
  staffInstitutions,
  staffDeviceTokens,
  chatChannels,
  chatMembers,
} from "@thaiba/db/schema";
import {
  fcmChatNotifier,
  dispatchChatMessagePush,
} from "../fcm-chat-notifier";
import { chatPubSub } from "@/lib/chat/pubsub-broker";
import { randomUUID } from "crypto";

describe("FCM Chat Notifier & Aggregation Buffer Unit Tests", () => {
  const instId = "inst_fcm_chat_test_001";
  const senderId = "staff_fcm_sender_001";
  const recipientId = "staff_fcm_recipient_002";
  const mutedRecipientId = "staff_fcm_muted_003";
  const onlineRecipientId = "staff_fcm_online_004";
  const channelId = "chan_fcm_test_001";

  beforeAll(async () => {
    // Tests run against the persistent dev.db, so clear rows from prior runs
    // before inserting: the UNIQUE(channel_id, staff_id) index makes
    // onConflictDoNothing keep a stale muted_until, which expires after 1h
    // and fails the dispatch test on later runs.
    await db.delete(chatMembers).where(eq(chatMembers.channelId, channelId));
    await db
      .delete(staffDeviceTokens)
      .where(
        inArray(staffDeviceTokens.staffId, [
          senderId,
          recipientId,
          mutedRecipientId,
          onlineRecipientId,
        ])
      );

    // Setup institution
    await db
      .insert(institutions)
      .values([{ id: instId, name: "FCM Test Inst", code: `FCM_${Date.now()}` }])
      .onConflictDoNothing();

    // Setup staff members
    await db
      .insert(staff)
      .values([
        {
          id: senderId,
          email: `sender_${Date.now()}@thaiba.dev`,
          employeeId: `EMP_FCM_1_${Date.now()}`,
          firstName: "Sender",
          lastName: "User",
          role: "staff",
        },
        {
          id: recipientId,
          email: `recipient_${Date.now()}@thaiba.dev`,
          employeeId: `EMP_FCM_2_${Date.now()}`,
          firstName: "Recipient",
          lastName: "User",
          role: "staff",
        },
        {
          id: mutedRecipientId,
          email: `muted_${Date.now()}@thaiba.dev`,
          employeeId: `EMP_FCM_3_${Date.now()}`,
          firstName: "Muted",
          lastName: "User",
          role: "staff",
        },
        {
          id: onlineRecipientId,
          email: `online_${Date.now()}@thaiba.dev`,
          employeeId: `EMP_FCM_4_${Date.now()}`,
          firstName: "Online",
          lastName: "User",
          role: "staff",
        },
      ])
      .onConflictDoNothing();

    // Setup staff affiliations
    await db
      .insert(staffInstitutions)
      .values([
        { id: randomUUID(), staffId: senderId, institutionId: instId },
        { id: randomUUID(), staffId: recipientId, institutionId: instId },
        { id: randomUUID(), staffId: mutedRecipientId, institutionId: instId },
        { id: randomUUID(), staffId: onlineRecipientId, institutionId: instId },
      ])
      .onConflictDoNothing();

    // Setup device tokens
    await db
      .insert(staffDeviceTokens)
      .values([
        {
          id: randomUUID(),
          staffId: recipientId,
          institutionId: instId,
          token: `fcm_token_recipient_${Date.now()}`,
          platform: "android",
        },
        {
          id: randomUUID(),
          staffId: mutedRecipientId,
          institutionId: instId,
          token: `fcm_token_muted_${Date.now()}`,
          platform: "ios",
        },
        {
          id: randomUUID(),
          staffId: onlineRecipientId,
          institutionId: instId,
          token: `fcm_token_online_${Date.now()}`,
          platform: "android",
        },
      ])
      .onConflictDoNothing();

    // Setup chat channel
    await db
      .insert(chatChannels)
      .values([
        {
          id: channelId,
          institutionId: instId,
          name: "Project Alpha",
          type: "group",
          createdById: senderId,
          isActive: true,
        },
      ])
      .onConflictDoNothing();

    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();

    // Setup channel members
    await db
      .insert(chatMembers)
      .values([
        { id: randomUUID(), channelId, staffId: senderId, role: "owner" },
        { id: randomUUID(), channelId, staffId: recipientId, role: "member" },
        { id: randomUUID(), channelId, staffId: mutedRecipientId, role: "member", mutedUntil: futureDate },
        { id: randomUUID(), channelId, staffId: onlineRecipientId, role: "member" },
      ])
      .onConflictDoNothing();
  });

  beforeEach(() => {
    fcmChatNotifier.clearAllPending();
    fcmChatNotifier.setAggregationWindow(30_000);
  });

  it("should queue notification for offline member and aggregate multiple messages within window", async () => {
    const key = `${instId}:${channelId}:${recipientId}`;

    await fcmChatNotifier.queueNotification({
      institutionId: instId,
      channelId,
      channelName: "Project Alpha",
      channelType: "group",
      recipientStaffId: recipientId,
      message: {
        messageId: "msg-1",
        content: "First test message",
        type: "text",
        createdAt: new Date().toISOString(),
        senderId,
        senderName: "Sender User",
      },
    });

    expect(fcmChatNotifier.getPendingCount()).toBe(1);

    // Queue second message in same window
    await fcmChatNotifier.queueNotification({
      institutionId: instId,
      channelId,
      channelName: "Project Alpha",
      channelType: "group",
      recipientStaffId: recipientId,
      message: {
        messageId: "msg-2",
        content: "Second test message",
        type: "text",
        createdAt: new Date().toISOString(),
        senderId,
        senderName: "Sender User",
      },
    });

    expect(fcmChatNotifier.getPendingCount()).toBe(1);

    // Flush and verify delivery
    const res = await fcmChatNotifier.flushNotificationByKey(key);
    expect(res.success).toBe(true);
    expect(res.deliveredCount).toBeGreaterThan(0);
    expect(fcmChatNotifier.getPendingCount()).toBe(0);
  });

  it("should skip queuing notification if recipient is actively connected to channel on WebSocket", async () => {
    // Connect user to channel in pubsub
    const mockSubscriber = {
      staffId: onlineRecipientId,
      institutionId: instId,
      send: () => {},
      isAlive: true,
    };
    chatPubSub.subscribeChannel(channelId, mockSubscriber);

    const queued = await fcmChatNotifier.queueNotification({
      institutionId: instId,
      channelId,
      channelName: "Project Alpha",
      channelType: "group",
      recipientStaffId: onlineRecipientId,
      message: {
        messageId: "msg-online",
        content: "Should not push",
        type: "text",
        createdAt: new Date().toISOString(),
        senderId,
        senderName: "Sender User",
      },
    });

    expect(queued).toBe(false);
    expect(fcmChatNotifier.getPendingCount()).toBe(0);

    chatPubSub.unsubscribeChannel(channelId, mockSubscriber);
  });

  it("should skip push for sender, muted members, and online members in dispatchChatMessagePush", async () => {
    // Keep onlineRecipientId connected via pubsub
    const mockSubscriber = {
      staffId: onlineRecipientId,
      institutionId: instId,
      send: () => {},
      isAlive: true,
    };
    chatPubSub.subscribeChannel(channelId, mockSubscriber);

    await dispatchChatMessagePush({
      channelId,
      message: {
        id: "msg-dispatch-1",
        content: "Broadcast message",
        type: "text",
        senderId,
        createdAt: new Date().toISOString(),
      },
      institutionId: instId,
    });

    // Only offline unmuted recipient should be queued
    expect(fcmChatNotifier.getPendingCount()).toBe(1);

    await fcmChatNotifier.flushAllPending();
    expect(fcmChatNotifier.getPendingCount()).toBe(0);

    chatPubSub.unsubscribeChannel(channelId, mockSubscriber);
  });
});
