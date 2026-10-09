import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { chatChannelMessages, chatMembers, chatReceipts } from "@thaiba/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { markChatReadSchema } from "@/lib/validation/schemas";
import { randomUUID } from "crypto";
import { chatPubSub, ChatEvent } from "@/lib/chat/pubsub-broker";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/messages/:id/read
 * Marks message(s) as read by the authenticated user and broadcasts receipts.
 */
export const POST = requireAuth(async (request: Request, session, context) => {
  const institutionId = await resolveRequestInstitution(session);
  const rawParams = context?.params ? (typeof (context.params as any).then === "function" ? await context.params : context.params) : {};
  const targetMessageId = (rawParams as Record<string, string>).id;

  let messageIdsToMark = [targetMessageId];

  // If request contains body with batch messageIds, use those
  try {
    const json = await request.json();
    const parsed = markChatReadSchema.safeParse(json);
    if (parsed.success && parsed.data.messageIds.length > 0) {
      messageIdsToMark = Array.from(new Set([targetMessageId, ...parsed.data.messageIds]));
    }
  } catch {
    // No body or invalid JSON; use targetMessageId from URL
  }

  // Fetch messages within active tenant
  const messages = await db
    .select({ id: chatChannelMessages.id, channelId: chatChannelMessages.channelId })
    .from(chatChannelMessages)
    .where(
      and(
        inArray(chatChannelMessages.id, messageIdsToMark),
        eq(chatChannelMessages.institutionId, institutionId)
      )
    )
    .all();

  if (messages.length === 0) {
    return NextResponse.json({ error: "No matching messages found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const channelIds = Array.from(new Set(messages.map((m) => m.channelId)));

  // Update member lastReadAt for each channel
  for (const cid of channelIds) {
    await db
      .update(chatMembers)
      .set({ lastReadAt: now })
      .where(and(eq(chatMembers.channelId, cid), eq(chatMembers.staffId, session.staffId)));
  }

  // Insert or update receipts
  for (const msg of messages) {
    await db
      .insert(chatReceipts)
      .values({
        id: randomUUID(),
        messageId: msg.id,
        staffId: session.staffId,
        status: "read",
        deliveredAt: now,
        readAt: now,
      })
      .onConflictDoUpdate({
        target: [chatReceipts.messageId, chatReceipts.staffId],
        set: { status: "read", readAt: now },
      });

    // Broadcast receipt update
    const event: ChatEvent = {
      type: "receipt:update",
      channelId: msg.channelId,
      senderId: session.staffId,
      institutionId,
      payload: { messageId: msg.id, staffId: session.staffId, status: "read", readAt: now },
      timestamp: now,
    };
    chatPubSub.publishToChannel(msg.channelId, event);
  }

  return NextResponse.json({
    markedCount: messages.length,
    readAt: now,
    messageIds: messages.map((m) => m.id),
  });
}, "chat:messages:read");
