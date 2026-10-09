import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { chatChannelMessages, chatMembers } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";
import { editChatMessageSchema } from "@/lib/validation/schemas";
import { chatPubSub, ChatEvent } from "@/lib/chat/pubsub-broker";

export const dynamic = "force-dynamic";

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * PATCH /api/chat/messages/:id
 * Edits a message sent by the caller within the 15-minute window.
 */
export const PATCH = requireAuth(async (request: Request, session, context) => {
  const institutionId = await resolveRequestInstitution(session);
  const rawParams = context?.params ? (typeof (context.params as any).then === "function" ? await context.params : context.params) : {};
  const messageId = (rawParams as Record<string, string>).id;

  const message = await db
    .select()
    .from(chatChannelMessages)
    .where(
      and(
        eq(chatChannelMessages.id, messageId),
        eq(chatChannelMessages.institutionId, institutionId)
      )
    )
    .get();

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.senderId !== session.staffId) {
    return NextResponse.json(
      { error: "Forbidden: You can only edit your own messages" },
      { status: 403 }
    );
  }

  if (message.deletedAt) {
    return NextResponse.json({ error: "Cannot edit a deleted message" }, { status: 400 });
  }

  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  if (messageAge > EDIT_WINDOW_MS) {
    return NextResponse.json(
      { error: "Message edit window has expired (15-minute limit)" },
      { status: 400 }
    );
  }

  const json = await request.json();
  const parsed = editChatMessageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const now = new Date().toISOString();
  await db
    .update(chatChannelMessages)
    .set({
      content: parsed.data.content.trim(),
      editedAt: now,
    })
    .where(eq(chatChannelMessages.id, messageId));

  const updatedMessage = await db
    .select()
    .from(chatChannelMessages)
    .where(eq(chatChannelMessages.id, messageId))
    .get();

  // Broadcast edit event
  const event: ChatEvent = {
    type: "message:edit",
    channelId: message.channelId,
    senderId: session.staffId,
    institutionId,
    payload: updatedMessage,
    timestamp: now,
  };
  chatPubSub.publishToChannel(message.channelId, event);

  return NextResponse.json({ message: updatedMessage });
}, "chat:messages:send");

/**
 * DELETE /api/chat/messages/:id
 * Soft-deletes a message. Sender can delete own message, or moderator can delete any message.
 */
export const DELETE = requireAuth(async (request: Request, session, context) => {
  const institutionId = await resolveRequestInstitution(session);
  const rawParams = context?.params ? (typeof (context.params as any).then === "function" ? await context.params : context.params) : {};
  const messageId = (rawParams as Record<string, string>).id;

  const message = await db
    .select()
    .from(chatChannelMessages)
    .where(
      and(
        eq(chatChannelMessages.id, messageId),
        eq(chatChannelMessages.institutionId, institutionId)
      )
    )
    .get();

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const isAuthor = message.senderId === session.staffId;

  // Check channel role
  const member = await db
    .select({ role: chatMembers.role })
    .from(chatMembers)
    .where(
      and(
        eq(chatMembers.channelId, message.channelId),
        eq(chatMembers.staffId, session.staffId)
      )
    )
    .get();

  const isModerator =
    member?.role === "owner" ||
    member?.role === "admin" ||
    session.role === "super_admin" ||
    session.role === "admin";

  if (!isAuthor && !isModerator) {
    return NextResponse.json(
      { error: "Forbidden: You are not authorized to delete this message" },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  await db
    .update(chatChannelMessages)
    .set({
      deletedAt: now,
      content: "[Message deleted]",
    })
    .where(eq(chatChannelMessages.id, messageId));

  // Broadcast deletion event
  const event: ChatEvent = {
    type: "message:delete",
    channelId: message.channelId,
    senderId: session.staffId,
    institutionId,
    payload: { messageId, channelId: message.channelId, deletedAt: now },
    timestamp: now,
  };
  chatPubSub.publishToChannel(message.channelId, event);

  return NextResponse.json({ message: "Message deleted successfully", messageId });
}, "chat:messages:delete_own");
