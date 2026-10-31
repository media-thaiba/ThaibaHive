import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import {
  chatChannels,
  chatMembers,
  chatChannelMessages,
  staffInstitutions,
} from "@thaiba/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { createChatChannelSchema } from "@/lib/validation/schemas";
import { randomUUID } from "crypto";
import { chatPubSub, ChatEvent } from "@/lib/chat/pubsub-broker";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/channels
 * Returns active channels joined by the authenticated staff member with unread count and latest message preview.
 */
export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  // Find all channel IDs where the user is a member
  const memberships = await db
    .select({
      channelId: chatMembers.channelId,
      role: chatMembers.role,
      lastReadAt: chatMembers.lastReadAt,
      mutedUntil: chatMembers.mutedUntil,
    })
    .from(chatMembers)
    .where(eq(chatMembers.staffId, session.staffId))
    .all();

  if (memberships.length === 0) {
    return NextResponse.json({ channels: [] });
  }

  const channelIds = memberships.map((m) => m.channelId);

  // Fetch channel details within the tenant scope
  const channels = await db
    .select()
    .from(chatChannels)
    .where(
      and(
        inArray(chatChannels.id, channelIds),
        eq(chatChannels.institutionId, institutionId),
        eq(chatChannels.isActive, true)
      )
    )
    .all();

  // Enhance each channel with latest message and unread count
  const results = await Promise.all(
    channels.map(async (chan) => {
      const memberInfo = memberships.find((m) => m.channelId === chan.id);

      const latestMessage = await db
        .select({
          id: chatChannelMessages.id,
          content: chatChannelMessages.content,
          type: chatChannelMessages.type,
          senderId: chatChannelMessages.senderId,
          createdAt: chatChannelMessages.createdAt,
          deletedAt: chatChannelMessages.deletedAt,
        })
        .from(chatChannelMessages)
        .where(eq(chatChannelMessages.channelId, chan.id))
        .orderBy(desc(chatChannelMessages.createdAt))
        .limit(1)
        .get();

      // Calculate unread count since member's lastReadAt
      let unreadCount = 0;
      if (memberInfo?.lastReadAt) {
        const unreadRows = await db
          .select({ count: sql<number>`count(*)` })
          .from(chatChannelMessages)
          .where(
            and(
              eq(chatChannelMessages.channelId, chan.id),
              sql`${chatChannelMessages.createdAt} > ${memberInfo.lastReadAt}`
            )
          )
          .get();
        unreadCount = unreadRows?.count ?? 0;
      } else {
        const totalRows = await db
          .select({ count: sql<number>`count(*)` })
          .from(chatChannelMessages)
          .where(eq(chatChannelMessages.channelId, chan.id))
          .get();
        unreadCount = totalRows?.count ?? 0;
      }

      return {
        ...chan,
        role: memberInfo?.role ?? "member",
        mutedUntil: memberInfo?.mutedUntil ?? null,
        unreadCount,
        latestMessage: latestMessage
          ? {
              ...latestMessage,
              content: latestMessage.deletedAt ? "[Message deleted]" : latestMessage.content,
            }
          : null,
      };
    })
  );

  return NextResponse.json({ channels: results });
}, "chat:channels:view");

/**
 * POST /api/chat/channels
 * Creates a new channel (direct, group, or announcement).
 */
export const POST = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  const json = await request.json();
  const parsed = createChatChannelSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, type, memberIds, avatarUrl } = parsed.data;

  // Verify all invited members belong to caller's institution
  const distinctMembers = Array.from(new Set([session.staffId, ...memberIds]));

  if (type === "direct") {
    if (distinctMembers.length !== 2) {
      return NextResponse.json(
        { error: "Direct message channel must have exactly 2 distinct members" },
        { status: 400 }
      );
    }
  }

  const affiliations = await db
    .select({ staffId: staffInstitutions.staffId })
    .from(staffInstitutions)
    .where(
      and(
        inArray(staffInstitutions.staffId, distinctMembers),
        eq(staffInstitutions.institutionId, institutionId)
      )
    )
    .all();

  const affiliatedIds = new Set(affiliations.map((a) => a.staffId));
  const missingMembers = distinctMembers.filter((id) => !affiliatedIds.has(id));

  if (missingMembers.length > 0) {
    return NextResponse.json(
      {
        error: "One or more invited members do not belong to the active institution",
        invalidMemberIds: missingMembers,
      },
      { status: 400 }
    );
  }

  const channelId = randomUUID();
  const now = new Date().toISOString();

  const channelRecord = {
    id: channelId,
    institutionId,
    name: name.trim(),
    type,
    createdById: session.staffId,
    avatarUrl: avatarUrl ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(chatChannels).values(channelRecord);

  // Insert channel members
  const memberRecords = distinctMembers.map((staffId) => ({
    id: randomUUID(),
    channelId,
    staffId,
    role: staffId === session.staffId ? ("owner" as const) : ("member" as const),
    joinedAt: now,
    lastReadAt: now,
    mutedUntil: null,
  }));

  if (memberRecords.length > 0) {
    await db.insert(chatMembers).values(memberRecords);
  }

  // Broadcast channel creation event to all members
  const channelEvent: ChatEvent = {
    type: "channel:update",
    channelId,
    senderId: session.staffId,
    institutionId,
    payload: { channel: channelRecord, members: memberRecords },
    timestamp: now,
  };

  for (const m of memberRecords) {
    chatPubSub.publishToUser(m.staffId, channelEvent);
  }

  return NextResponse.json(
    {
      channel: channelRecord,
      members: memberRecords,
    },
    { status: 201 }
  );
}, "chat:channels:create");
