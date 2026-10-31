import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { chatChannels, chatMembers, staffInstitutions } from "@thaiba/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { addChatMembersSchema } from "@/lib/validation/schemas";
import { randomUUID } from "crypto";
import { chatPubSub, ChatEvent } from "@/lib/chat/pubsub-broker";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/channels/:id/members
 * Adds new members to a group channel.
 */
export const POST = requireAuth(async (request: Request, session, context) => {
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

  if (channel.type === "direct") {
    return NextResponse.json(
      { error: "Forbidden: Cannot add additional members to a direct message channel" },
      { status: 403 }
    );
  }

  // Check caller permissions
  const callerMember = await db
    .select({ role: chatMembers.role })
    .from(chatMembers)
    .where(and(eq(chatMembers.channelId, channelId), eq(chatMembers.staffId, session.staffId)))
    .get();

  const isPrivileged =
    callerMember?.role === "owner" ||
    callerMember?.role === "admin" ||
    session.role === "super_admin" ||
    session.role === "admin";

  if (!isPrivileged) {
    return NextResponse.json(
      { error: "Forbidden: Only channel managers or admins can add members" },
      { status: 403 }
    );
  }

  const json = await request.json();
  const parsed = addChatMembersSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { staffIds, role } = parsed.data;

  // Validate all added staff members belong to active institution
  const affiliations = await db
    .select({ staffId: staffInstitutions.staffId })
    .from(staffInstitutions)
    .where(
      and(
        inArray(staffInstitutions.staffId, staffIds),
        eq(staffInstitutions.institutionId, institutionId)
      )
    )
    .all();

  const affiliatedIds = new Set(affiliations.map((a) => a.staffId));
  const invalidStaffIds = staffIds.filter((id) => !affiliatedIds.has(id));

  if (invalidStaffIds.length > 0) {
    return NextResponse.json(
      {
        error: "One or more invited staff members do not belong to active institution",
        invalidStaffIds,
      },
      { status: 400 }
    );
  }

  // Check existing members to avoid duplicates
  const existingMembers = await db
    .select({ staffId: chatMembers.staffId })
    .from(chatMembers)
    .where(and(eq(chatMembers.channelId, channelId), inArray(chatMembers.staffId, staffIds)))
    .all();

  const existingSet = new Set(existingMembers.map((m) => m.staffId));
  const newStaffIds = staffIds.filter((id) => !existingSet.has(id));

  if (newStaffIds.length === 0) {
    return NextResponse.json({ message: "All specified staff members are already in the channel" });
  }

  const now = new Date().toISOString();
  const insertedMembers = newStaffIds.map((sid) => ({
    id: randomUUID(),
    channelId,
    staffId: sid,
    role: role as "member" | "admin",
    joinedAt: now,
    lastReadAt: now,
    mutedUntil: null,
  }));

  await db.insert(chatMembers).values(insertedMembers);

  // Broadcast member addition
  const event: ChatEvent = {
    type: "channel:update",
    channelId,
    senderId: session.staffId,
    institutionId,
    payload: { channelId, addedMembers: insertedMembers },
    timestamp: now,
  };
  chatPubSub.publishToChannel(channelId, event);

  return NextResponse.json({ addedMembers: insertedMembers }, { status: 201 });
}, "chat:channels:moderate");

/**
 * DELETE /api/chat/channels/:id/members
 * Removes a member from a channel (or allows self-leave).
 */
export const DELETE = requireAuth(async (request: Request, session, context) => {
  const institutionId = await resolveRequestInstitution(session);
  const rawParams = context?.params ? (typeof (context.params as any).then === "function" ? await context.params : context.params) : {};
  const channelId = (rawParams as Record<string, string>).id;
  const { searchParams } = new URL(request.url);
  const targetStaffId = searchParams.get("staffId") || session.staffId;

  const channel = await db
    .select()
    .from(chatChannels)
    .where(and(eq(chatChannels.id, channelId), eq(chatChannels.institutionId, institutionId)))
    .get();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  if (channel.type === "direct") {
    return NextResponse.json(
      { error: "Forbidden: Cannot remove members from a direct message channel" },
      { status: 403 }
    );
  }

  const callerMember = await db
    .select({ role: chatMembers.role })
    .from(chatMembers)
    .where(and(eq(chatMembers.channelId, channelId), eq(chatMembers.staffId, session.staffId)))
    .get();

  const isSelfLeaving = targetStaffId === session.staffId;
  const isPrivileged =
    callerMember?.role === "owner" ||
    callerMember?.role === "admin" ||
    session.role === "super_admin" ||
    session.role === "admin";

  if (!isSelfLeaving && !isPrivileged) {
    return NextResponse.json(
      { error: "Forbidden: Only channel managers can remove other members" },
      { status: 403 }
    );
  }

  const targetMember = await db
    .select()
    .from(chatMembers)
    .where(and(eq(chatMembers.channelId, channelId), eq(chatMembers.staffId, targetStaffId)))
    .get();

  if (!targetMember) {
    return NextResponse.json({ error: "Member not found in channel" }, { status: 404 });
  }

  await db
    .delete(chatMembers)
    .where(and(eq(chatMembers.channelId, channelId), eq(chatMembers.staffId, targetStaffId)));

  const now = new Date().toISOString();
  const event: ChatEvent = {
    type: "channel:update",
    channelId,
    senderId: session.staffId,
    institutionId,
    payload: { channelId, removedStaffId: targetStaffId },
    timestamp: now,
  };
  chatPubSub.publishToChannel(channelId, event);

  return NextResponse.json({ message: "Member removed from channel", staffId: targetStaffId });
}, "chat:channels:moderate");
