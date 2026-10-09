import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import {
  chatChannels,
  chatMembers,
  chatChannelMessages,
  staff,
} from "@thaiba/db/schema";
import { eq, and, desc, sql, lt } from "drizzle-orm";
import { sendChatMessageSchema } from "@/lib/validation/schemas";
import { randomUUID } from "crypto";
import { chatPubSub, ChatEvent } from "@/lib/chat/pubsub-broker";
import { dispatchChatMessagePush } from "@/lib/notifications/fcm-chat-notifier";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/channels/:id/messages
 * Retrieves paginated message history for a channel.
 */
export const GET = requireAuth(async (request: Request, session, context) => {
  const institutionId = await resolveRequestInstitution(session);
  const rawParams = context?.params ? (typeof (context.params as any).then === "function" ? await context.params : context.params) : {};
  const channelId = (rawParams as Record<string, string>).id;
  const { searchParams } = new URL(request.url);

  const beforeCursor = searchParams.get("before");
  const limitParam = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Math.min(Math.max(limitParam, 1), 100);

  // Verify channel exists in active tenant
  const channel = await db
    .select({ id: chatChannels.id })
    .from(chatChannels)
    .where(and(eq(chatChannels.id, channelId), eq(chatChannels.institutionId, institutionId)))
    .get();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Verify caller membership
  const isMember = await db
    .select({ id: chatMembers.id })
    .from(chatMembers)
    .where(and(eq(chatMembers.channelId, channelId), eq(chatMembers.staffId, session.staffId)))
    .get();

  if (!isMember && session.role !== "super_admin" && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Not a member of this channel" }, { status: 403 });
  }

  // Query messages with sender details
  const filter = beforeCursor
    ? and(
        eq(chatChannelMessages.channelId, channelId),
        lt(chatChannelMessages.createdAt, beforeCursor)
      )
    : eq(chatChannelMessages.channelId, channelId);

  const rows = await db
    .select({
      id: chatChannelMessages.id,
      institutionId: chatChannelMessages.institutionId,
      channelId: chatChannelMessages.channelId,
      senderId: chatChannelMessages.senderId,
      clientMessageId: chatChannelMessages.clientMessageId,
      content: chatChannelMessages.content,
      type: chatChannelMessages.type,
      replyToId: chatChannelMessages.replyToId,
      attachmentUrl: chatChannelMessages.attachmentUrl,
      editedAt: chatChannelMessages.editedAt,
      deletedAt: chatChannelMessages.deletedAt,
      createdAt: chatChannelMessages.createdAt,
      senderFirstName: staff.firstName,
      senderLastName: staff.lastName,
      senderAvatarUrl: staff.avatarUrl,
      senderDesignation: staff.designation,
    })
    .from(chatChannelMessages)
    .leftJoin(staff, eq(chatChannelMessages.senderId, staff.id))
    .where(filter)
    .orderBy(desc(chatChannelMessages.createdAt))
    .limit(limit + 1)
    .all();

  const hasMore = rows.length > limit;
  const messages = (hasMore ? rows.slice(0, limit) : rows).map((msg) => ({
    id: msg.id,
    institutionId: msg.institutionId,
    channelId: msg.channelId,
    senderId: msg.senderId,
    clientMessageId: msg.clientMessageId,
    content: msg.deletedAt ? "[Message deleted]" : msg.content,
    type: msg.type,
    replyToId: msg.replyToId,
    attachmentUrl: msg.attachmentUrl,
    editedAt: msg.editedAt,
    deletedAt: msg.deletedAt,
    createdAt: msg.createdAt,
    sender: {
      id: msg.senderId,
      firstName: msg.senderFirstName,
      lastName: msg.senderLastName,
      avatarUrl: msg.senderAvatarUrl,
      designation: msg.senderDesignation,
    },
  }));

  const nextCursor = hasMore && messages.length > 0 ? messages[messages.length - 1].createdAt : null;

  return NextResponse.json({
    messages,
    nextCursor,
    hasMore,
  });
}, "chat:messages:read");

/**
 * POST /api/chat/channels/:id/messages
 * Sends a new message in the specified channel.
 */
export const POST = requireAuth(async (request: Request, session, context) => {
  const institutionId = await resolveRequestInstitution(session);
  const rawParams = context?.params ? (typeof (context.params as any).then === "function" ? await context.params : context.params) : {};
  const channelId = (rawParams as Record<string, string>).id;

  // Verify channel exists in tenant
  const channel = await db
    .select()
    .from(chatChannels)
    .where(and(eq(chatChannels.id, channelId), eq(chatChannels.institutionId, institutionId)))
    .get();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Verify membership
  const member = await db
    .select({ id: chatMembers.id, role: chatMembers.role })
    .from(chatMembers)
    .where(and(eq(chatMembers.channelId, channelId), eq(chatMembers.staffId, session.staffId)))
    .get();

  if (!member) {
    return NextResponse.json({ error: "Forbidden: Not a member of this channel" }, { status: 403 });
  }

  // If announcement channel, only owner or admin can post
  if (channel.type === "announcement" && member.role !== "owner" && member.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Only channel managers can post in announcement channels" },
      { status: 403 }
    );
  }

  const json = await request.json();
  const parsed = sendChatMessageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { content, type, clientMessageId, replyToId, attachmentUrl } = parsed.data;

  const messageId = randomUUID();
  const now = new Date().toISOString();

  const messageRecord = {
    id: messageId,
    institutionId,
    channelId,
    senderId: session.staffId,
    clientMessageId: clientMessageId ?? null,
    content: content.trim(),
    type,
    replyToId: replyToId ?? null,
    attachmentUrl: attachmentUrl ?? null,
    editedAt: null,
    deletedAt: null,
    createdAt: now,
  };

  await db.insert(chatChannelMessages).values(messageRecord);

  // Update sender's lastReadAt
  await db
    .update(chatMembers)
    .set({ lastReadAt: now })
    .where(and(eq(chatMembers.channelId, channelId), eq(chatMembers.staffId, session.staffId)));

  // Broadcast message:new to all channel members
  const event: ChatEvent = {
    type: "message:new",
    channelId,
    senderId: session.staffId,
    institutionId,
    payload: messageRecord,
    timestamp: now,
  };
  chatPubSub.publishToChannel(channelId, event);

  // Trigger push notifications to offline / background channel members
  try {
    await dispatchChatMessagePush({
      channelId,
      message: messageRecord,
      institutionId,
    });
  } catch (pushErr) {
    console.warn("[Chat API] Push notification dispatch warning:", pushErr);
  }

  return NextResponse.json({ message: messageRecord }, { status: 201 });
}, "chat:messages:send");
