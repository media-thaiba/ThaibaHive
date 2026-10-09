import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { chatChannels, chatMembers, staff } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";
import { updateChatChannelSchema } from "@/lib/validation/schemas";
import { chatPubSub, ChatEvent } from "@/lib/chat/pubsub-broker";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/channels/:id
 * Retrieves channel details and full member list.
 */
export const GET = requireAuth(async (request: Request, session, context) => {
  const institutionId = await resolveRequestInstitution(session);
  const rawParams = context?.params ? (typeof (context.params as any).then === "function" ? await context.params : context.params) : {};
  const channelId = (rawParams as Record<string, string>).id;

  // Verify channel exists in the active tenant
  const channel = await db
    .select()
    .from(chatChannels)
    .where(and(eq(chatChannels.id, channelId), eq(chatChannels.institutionId, institutionId)))
    .get();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Verify caller is a member (or has admin moderate permission)
  const isMember = await db
    .select({ id: chatMembers.id, role: chatMembers.role })
    .from(chatMembers)
    .where(and(eq(chatMembers.channelId, channelId), eq(chatMembers.staffId, session.staffId)))
    .get();

  if (!isMember && session.role !== "super_admin" && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Not a member of this channel" }, { status: 403 });
  }

  // Fetch member profiles
  const members = await db
    .select({
      id: chatMembers.id,
      staffId: chatMembers.staffId,
      role: chatMembers.role,
      joinedAt: chatMembers.joinedAt,
      lastReadAt: chatMembers.lastReadAt,
      name: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      avatarUrl: staff.avatarUrl,
      designation: staff.designation,
    })
    .from(chatMembers)
    .innerJoin(staff, eq(chatMembers.staffId, staff.id))
    .where(eq(chatMembers.channelId, channelId))
    .all();

  return NextResponse.json({
    channel,
    members,
  });
}, "chat:channels:view");

/**
 * PATCH /api/chat/channels/:id
 * Updates channel name, avatar, or active status (owner/admin/moderator only).
 */
export const PATCH = requireAuth(async (request: Request, session, context) => {
  const institutionId = await resolveRequestInstitution(session);
  const rawParams = context?.params ? (typeof (context.params as any).then === "function" ? await context.params : context.params) : {};
  const channelId = (rawParams as Record<string, string>).id;

  const channel = await db
    .select()
    .from(chatChannels)
    .where(and(eq(chatChannels.id, channelId), eq(chatChannels.institutionId, institutionId)))
    .get();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Check authorization
  const member = await db
    .select({ role: chatMembers.role })
    .from(chatMembers)
    .where(and(eq(chatMembers.channelId, channelId), eq(chatMembers.staffId, session.staffId)))
    .get();

  const isOwnerOrAdmin = member?.role === "owner" || member?.role === "admin";
  const isPrivilegedRole =
    session.role === "super_admin" ||
    session.role === "admin" ||
    session.role === "principal" ||
    session.role === "institutional_head";

  if (!isOwnerOrAdmin && !isPrivilegedRole) {
    return NextResponse.json(
      { error: "Forbidden: Only channel owner or administrator can modify channel settings" },
      { status: 403 }
    );
  }

  const json = await request.json();
  const parsed = updateChatChannelSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    updatedAt: now,
  };

  if (parsed.data.name !== undefined) updateData.name = parsed.data.name.trim();
  if (parsed.data.avatarUrl !== undefined) updateData.avatarUrl = parsed.data.avatarUrl;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  await db.update(chatChannels).set(updateData).where(eq(chatChannels.id, channelId));

  const updatedChannel = await db
    .select()
    .from(chatChannels)
    .where(eq(chatChannels.id, channelId))
    .get();

  // Broadcast update
  const event: ChatEvent = {
    type: "channel:update",
    channelId,
    senderId: session.staffId,
    institutionId,
    payload: { channel: updatedChannel },
    timestamp: now,
  };
  chatPubSub.publishToChannel(channelId, event);

  return NextResponse.json({ channel: updatedChannel });
}, "chat:channels:moderate");

/**
 * DELETE /api/chat/channels/:id
 * Soft-deletes / archives a channel.
 */
export const DELETE = requireAuth(async (request: Request, session, context) => {
  const institutionId = await resolveRequestInstitution(session);
  const rawParams = context?.params ? (typeof (context.params as any).then === "function" ? await context.params : context.params) : {};
  const channelId = (rawParams as Record<string, string>).id;

  const channel = await db
    .select()
    .from(chatChannels)
    .where(and(eq(chatChannels.id, channelId), eq(chatChannels.institutionId, institutionId)))
    .get();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const member = await db
    .select({ role: chatMembers.role })
    .from(chatMembers)
    .where(and(eq(chatMembers.channelId, channelId), eq(chatMembers.staffId, session.staffId)))
    .get();

  const isOwner = member?.role === "owner";
  const isPrivileged =
    session.role === "super_admin" ||
    session.role === "admin" ||
    session.role === "principal" ||
    session.role === "institutional_head";

  if (!isOwner && !isPrivileged) {
    return NextResponse.json(
      { error: "Forbidden: Only channel owner or administrator can delete channel" },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  await db
    .update(chatChannels)
    .set({ isActive: false, updatedAt: now })
    .where(eq(chatChannels.id, channelId));

  // Broadcast channel deletion
  const event: ChatEvent = {
    type: "channel:update",
    channelId,
    senderId: session.staffId,
    institutionId,
    payload: { channelId, isActive: false },
    timestamp: now,
  };
  chatPubSub.publishToChannel(channelId, event);

  return NextResponse.json({ message: "Channel successfully archived", channelId });
}, "chat:channels:moderate");
