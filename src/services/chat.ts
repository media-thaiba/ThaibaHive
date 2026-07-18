import { db } from "@/db";
import {
  chatRooms,
  chatParticipants,
  chatMessages,
  staff,
} from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export class ChatServiceError extends Error {
  code: "NOT_FOUND" | "FORBIDDEN" | "BAD_REQUEST" | "CONFLICT" | "INTERNAL";
  status: number;

  constructor(
    message: string,
    code: ChatServiceError["code"] = "BAD_REQUEST"
  ) {
    super(message);
    this.name = "ChatServiceError";
    this.code = code;

    const statusMap: Record<ChatServiceError["code"], number> = {
      NOT_FOUND: 404,
      FORBIDDEN: 403,
      CONFLICT: 409,
      BAD_REQUEST: 400,
      INTERNAL: 500,
    };
    this.status = statusMap[code] || 400;
  }
}

// ─── Internal Helpers ───

async function assertParticipant(roomId: string, staffId: string) {
  const participant = await db
    .select()
    .from(chatParticipants)
    .where(
      and(
        eq(chatParticipants.roomId, roomId),
        eq(chatParticipants.staffId, staffId)
      )
    )
    .get();

  if (!participant) {
    throw new ChatServiceError(
      "You are not a participant in this room",
      "FORBIDDEN"
    );
  }

  return participant;
}

async function assertManagerOrAdmin(
  roomId: string,
  staffId: string,
  globalRole: string
) {
  if (globalRole === "super_admin" || globalRole === "admin") {
    return;
  }

  const participant = await assertParticipant(roomId, staffId);

  if (participant.role !== "Manager") {
    throw new ChatServiceError(
      "Only room managers, the creator, or admins can perform this action",
      "FORBIDDEN"
    );
  }
}

function isGlobalAdmin(role: string): boolean {
  return role === "super_admin" || role === "admin";
}

// ─── Service Methods ───

export async function getUserRooms(staffId: string) {
  const myParticipations = await db
    .select({ roomId: chatParticipants.roomId })
    .from(chatParticipants)
    .where(eq(chatParticipants.staffId, staffId))
    .all();

  if (myParticipations.length === 0) {
    return { rooms: [] };
  }

  const roomIds = myParticipations.map((p) => p.roomId);

  const rooms = await db
    .select()
    .from(chatRooms)
    .where(inArray(chatRooms.id, roomIds))
    .orderBy(desc(chatRooms.lastMessageTime))
    .all();

  const participants = await db
    .select()
    .from(chatParticipants)
    .where(inArray(chatParticipants.roomId, roomIds))
    .all();

  const participantStaffIds = [
    ...new Set(participants.map((p) => p.staffId)),
  ];
  const staffRows =
    participantStaffIds.length > 0
      ? await db
          .select()
          .from(staff)
          .where(inArray(staff.id, participantStaffIds))
          .all()
      : [];
  const staffMap = new Map(staffRows.map((s) => [s.id, s]));

  const unreadCounts = await db
    .select({
      roomId: chatMessages.roomId,
      count: sql<number>`count(*)`,
    })
    .from(chatMessages)
    .innerJoin(
      chatParticipants,
      and(
        eq(chatParticipants.roomId, chatMessages.roomId),
        eq(chatParticipants.staffId, staffId)
      )
    )
    .where(
      sql`${chatMessages.createdAt} > COALESCE(${chatParticipants.lastReadAt}, '1970-01-01T00:00:00.000Z')`
    )
    .groupBy(chatMessages.roomId)
    .all();

  const unreadMap = new Map(
    unreadCounts.map((u) => [u.roomId, u.count])
  );

  const roomsWithMeta = rooms.map((room) => {
    const roomParticipants = participants.filter(
      (p) => p.roomId === room.id
    );

    let displayName = room.name;
    let displayIcon = room.iconUrl;

    if (!room.name) {
      const otherParticipant = roomParticipants.find(
        (p) => p.staffId !== staffId
      );
      if (otherParticipant) {
        const otherStaff = staffMap.get(otherParticipant.staffId);
        if (otherStaff) {
          displayName = `${otherStaff.firstName} ${otherStaff.lastName}`;
          displayIcon = otherStaff.avatarUrl;
        }
      }
    }

    return {
      ...room,
      name: displayName,
      iconUrl: displayIcon,
      unreadCount: unreadMap.get(room.id) ?? 0,
      participants: roomParticipants.map((p) => ({
        ...p,
        staff: staffMap.get(p.staffId) ?? null,
      })),
    };
  });

  return { rooms: roomsWithMeta };
}

export async function getRoomDetails(
  roomId: string,
  staffId: string
) {
  const room = await db
    .select()
    .from(chatRooms)
    .where(eq(chatRooms.id, roomId))
    .get();

  if (!room) {
    throw new ChatServiceError("Chat room not found", "NOT_FOUND");
  }

  await assertParticipant(roomId, staffId);

  const participants = await db
    .select()
    .from(chatParticipants)
    .where(eq(chatParticipants.roomId, roomId))
    .all();

  const participantStaffIds = participants.map((p) => p.staffId);
  const staffRows =
    participantStaffIds.length > 0
      ? await db
          .select()
          .from(staff)
          .where(inArray(staff.id, participantStaffIds))
          .all()
      : [];
  const staffMap = new Map(staffRows.map((s) => [s.id, s]));

  let displayName = room.name;
  let displayIcon = room.iconUrl;

  if (!room.name) {
    const otherParticipant = participants.find(
      (p) => p.staffId !== staffId
    );
    if (otherParticipant) {
      const otherStaff = staffMap.get(otherParticipant.staffId);
      if (otherStaff) {
        displayName = `${otherStaff.firstName} ${otherStaff.lastName}`;
        displayIcon = otherStaff.avatarUrl;
      }
    }
  }

  return {
    ...room,
    name: displayName,
    iconUrl: displayIcon,
    participants: participants.map((p) => ({
      ...p,
      staff: staffMap.get(p.staffId) ?? null,
    })),
  };
}

export async function createRoom(params: {
  name?: string;
  participantIds: string[];
  isDirectMessage?: boolean;
  creatorStaffId: string;
}) {
  const { name, participantIds, isDirectMessage, creatorStaffId } = params;

  if (isDirectMessage && participantIds.length !== 1) {
    throw new ChatServiceError(
      "Direct messages require exactly one other participant",
      "BAD_REQUEST"
    );
  }

  if (!isDirectMessage) {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new ChatServiceError(
        "Group chats require a name",
        "BAD_REQUEST"
      );
    }
  }

  if (isDirectMessage) {
    if (name !== undefined && name !== null) {
      throw new ChatServiceError(
        "Direct messages must have a null name",
        "BAD_REQUEST"
      );
    }

    const targetStaffId = participantIds[0];
    const duplicateCheck = await db
      .select({ roomId: chatParticipants.roomId })
      .from(chatParticipants)
      .innerJoin(chatRooms, eq(chatRooms.id, chatParticipants.roomId))
      .where(
        and(
          sql`${chatRooms.name} IS NULL`,
          inArray(chatParticipants.staffId, [creatorStaffId, targetStaffId])
        )
      )
      .groupBy(chatParticipants.roomId)
      .having(
        and(
          sql`COUNT(${chatParticipants.staffId}) = 2`,
          sql`SUM(CASE WHEN ${chatParticipants.staffId} IN (${creatorStaffId}, ${targetStaffId}) THEN 1 ELSE 0 END) = 2`
        )
      )
      .get();

    if (duplicateCheck) {
      throw new ChatServiceError(
        "A direct message with this user already exists",
        "CONFLICT"
      );
    }
  }

  const roomId = crypto.randomUUID();
  const now = new Date().toISOString();

  const result = await db.transaction(async (tx) => {
    await tx.insert(chatRooms).values({
      id: roomId,
      name: isDirectMessage ? null : name!.trim(),
      createdById: creatorStaffId,
      createdAt: now,
    });

    const allParticipantIds = [creatorStaffId, ...participantIds];

    const participantValues = allParticipantIds.map((sid) => ({
      id: crypto.randomUUID(),
      roomId,
      staffId: sid,
      role:
        sid === creatorStaffId && !isDirectMessage ? "Manager" : "Member",
      addedById: creatorStaffId,
      createdAt: now,
    }));

    await tx.insert(chatParticipants).values(participantValues);

    const createdRoom = await tx
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.id, roomId))
      .get();

    const createdParticipants = await tx
      .select()
      .from(chatParticipants)
      .where(eq(chatParticipants.roomId, roomId))
      .all();

    return {
      room: {
        ...createdRoom!,
        participants: createdParticipants,
      },
    };
  });

  return result;
}

export async function getRoomMessages(params: {
  roomId: string;
  staffId: string;
  limit: number;
  beforeCursor?: string | null;
}) {
  const { roomId, staffId, limit, beforeCursor } = params;

  await assertParticipant(roomId, staffId);

  if (beforeCursor) {
    const parsed = new Date(beforeCursor);
    if (isNaN(parsed.getTime())) {
      throw new ChatServiceError(
        "Invalid before cursor timestamp",
        "BAD_REQUEST"
      );
    }
  }

  const messagesQuery = db
    .select({
      id: chatMessages.id,
      roomId: chatMessages.roomId,
      senderId: chatMessages.senderId,
      text: chatMessages.text,
      mediaUrl: chatMessages.mediaUrl,
      mediaType: chatMessages.mediaType,
      createdAt: chatMessages.createdAt,
      senderFirstName: staff.firstName,
      senderLastName: staff.lastName,
      senderAvatarUrl: staff.avatarUrl,
    })
    .from(chatMessages)
    .leftJoin(staff, eq(chatMessages.senderId, staff.id))
    .where(
      beforeCursor
        ? and(
            eq(chatMessages.roomId, roomId),
            sql`${chatMessages.createdAt} < ${beforeCursor}`
          )
        : eq(chatMessages.roomId, roomId)
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  const messages = await messagesQuery.all();

  const mapped = messages.map((m) => ({
    id: m.id,
    roomId: m.roomId,
    senderId: m.senderId,
    text: m.text,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    createdAt: m.createdAt,
    sender: {
      firstName: m.senderFirstName,
      lastName: m.senderLastName,
      avatarUrl: m.senderAvatarUrl,
    },
  }));

  return {
    messages: mapped.reverse(),
    hasMore: messages.length === limit,
  };
}

export async function sendMessage(params: {
  roomId: string;
  senderId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
}) {
  const { roomId, senderId, text, mediaUrl, mediaType } = params;

  await assertParticipant(roomId, senderId);

  if (!text && !mediaUrl) {
    throw new ChatServiceError(
      "Message must have text or media",
      "BAD_REQUEST"
    );
  }

  const now = new Date().toISOString();

  const result = await db.transaction(async (tx) => {
    const message = await tx
      .insert(chatMessages)
      .values({
        id: crypto.randomUUID(),
        roomId,
        senderId,
        text: text || null,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || "text",
        createdAt: now,
      })
      .returning()
      .get();

    const preview = text
      ? text.length > 100
        ? text.substring(0, 100) + "..."
        : text
      : mediaType === "image"
        ? "📷 Image"
        : mediaType === "voice"
          ? "🎤 Voice message"
          : "📎 Attachment";

    await tx
      .update(chatRooms)
      .set({
        lastMessageTime: now,
        lastMessagePreview: preview,
      })
      .where(eq(chatRooms.id, roomId))
      .run();

    return message;
  });

  const senderStaff = await db
    .select()
    .from(staff)
    .where(eq(staff.id, senderId))
    .get();

  const participants = await db
    .select()
    .from(chatParticipants)
    .where(eq(chatParticipants.roomId, roomId))
    .all();

  const recipients = participants
    .filter((p) => p.staffId !== senderId)
    .map((p) => p.staffId);

  return {
    message: {
      ...result,
      sender: senderStaff
        ? {
            firstName: senderStaff.firstName,
            lastName: senderStaff.lastName,
            avatarUrl: senderStaff.avatarUrl,
          }
        : null,
    },
    recipients,
  };
}

export async function getRoomParticipants(
  roomId: string,
  callerStaffId: string
) {
  await assertParticipant(roomId, callerStaffId);

  const participants = await db
    .select()
    .from(chatParticipants)
    .where(eq(chatParticipants.roomId, roomId))
    .all();

  const staffIds = participants.map((p) => p.staffId);
  const staffRows =
    staffIds.length > 0
      ? await db
          .select()
          .from(staff)
          .where(inArray(staff.id, staffIds))
          .all()
      : [];
  const staffMap = new Map(staffRows.map((s) => [s.id, s]));

  return {
    participants: participants.map((p) => ({
      ...p,
      staff: staffMap.get(p.staffId) ?? null,
    })),
  };
}

export async function addParticipant(params: {
  roomId: string;
  staffId: string;
  role: "Manager" | "Member";
  addedById: string;
}) {
  const { roomId, staffId, role, addedById } = params;

  const room = await db
    .select()
    .from(chatRooms)
    .where(eq(chatRooms.id, roomId))
    .get();

  if (!room) {
    throw new ChatServiceError("Chat room not found", "NOT_FOUND");
  }

  if (!room.name) {
    throw new ChatServiceError(
      "Cannot add participants to a direct message",
      "BAD_REQUEST"
    );
  }

  const addedByParticipant = await db
    .select()
    .from(chatParticipants)
    .where(
      and(
        eq(chatParticipants.roomId, roomId),
        eq(chatParticipants.staffId, addedById)
      )
    )
    .get();

  if (!addedByParticipant) {
    throw new ChatServiceError(
      "You are not a participant in this room",
      "FORBIDDEN"
    );
  }

  const addedByGlobalRole = await db
    .select({ role: staff.role })
    .from(staff)
    .where(eq(staff.id, addedById))
    .get();

  const isAdmin =
    addedByGlobalRole?.role === "super_admin" ||
    addedByGlobalRole?.role === "admin";

  if (!isAdmin && addedByParticipant.role !== "Manager") {
    throw new ChatServiceError(
      "Only room managers, the creator, or admins can add participants",
      "FORBIDDEN"
    );
  }

  const existing = await db
    .select()
    .from(chatParticipants)
    .where(
      and(
        eq(chatParticipants.roomId, roomId),
        eq(chatParticipants.staffId, staffId)
      )
    )
    .get();

  if (existing) {
    throw new ChatServiceError(
      "User is already a participant",
      "CONFLICT"
    );
  }

  const now = new Date().toISOString();

  const participant = await db
    .insert(chatParticipants)
    .values({
      id: crypto.randomUUID(),
      roomId,
      staffId,
      role: role || "Member",
      addedById,
      createdAt: now,
    })
    .returning()
    .get();

  const addedStaff = await db
    .select()
    .from(staff)
    .where(eq(staff.id, staffId))
    .get();

  const allParticipants = await db
    .select()
    .from(chatParticipants)
    .where(eq(chatParticipants.roomId, roomId))
    .all();

  return {
    participant: {
      ...participant,
      staff: addedStaff,
    },
    allParticipantStaffIds: allParticipants.map((p) => p.staffId),
  };
}

export async function updateParticipant(params: {
  roomId: string;
  participantId: string;
  role: "Manager" | "Member";
  callerStaffId: string;
  callerRole: string;
}) {
  const { roomId, participantId, role, callerStaffId, callerRole } =
    params;

  await assertManagerOrAdmin(roomId, callerStaffId, callerRole);

  const target = await db
    .select()
    .from(chatParticipants)
    .where(
      and(
        eq(chatParticipants.roomId, roomId),
        eq(chatParticipants.staffId, participantId)
      )
    )
    .get();

  if (!target) {
    throw new ChatServiceError("Participant not found", "NOT_FOUND");
  }

  if (target.role === "Manager" && role === "Member") {
    const managerCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatParticipants)
      .where(
        and(
          eq(chatParticipants.roomId, roomId),
          eq(chatParticipants.role, "Manager")
        )
      )
      .get();

    const participantCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatParticipants)
      .where(eq(chatParticipants.roomId, roomId))
      .get();

    if (
      (managerCount?.count ?? 0) <= 1 &&
      (participantCount?.count ?? 0) >= 2
    ) {
      throw new ChatServiceError(
        "Cannot demote the last manager of a room with 2 or more participants",
        "CONFLICT"
      );
    }
  }

  const updated = await db
    .update(chatParticipants)
    .set({ role })
    .where(
      and(
        eq(chatParticipants.roomId, roomId),
        eq(chatParticipants.staffId, participantId)
      )
    )
    .returning()
    .get();

  return { participant: updated };
}

export async function removeParticipant(params: {
  roomId: string;
  participantId: string;
  callerStaffId: string;
}) {
  const { roomId, participantId, callerStaffId } = params;

  const room = await db
    .select()
    .from(chatRooms)
    .where(eq(chatRooms.id, roomId))
    .get();

  if (!room) {
    throw new ChatServiceError("Chat room not found", "NOT_FOUND");
  }

  const isSelfRemove = participantId === callerStaffId;

  if (!isSelfRemove) {
    const callerParticipant = await db
      .select()
      .from(chatParticipants)
      .where(
        and(
          eq(chatParticipants.roomId, roomId),
          eq(chatParticipants.staffId, callerStaffId)
        )
      )
      .get();

    if (!callerParticipant) {
      throw new ChatServiceError(
        "You are not a participant in this room",
        "FORBIDDEN"
      );
    }

    const callerGlobalRole = await db
      .select({ role: staff.role })
      .from(staff)
      .where(eq(staff.id, callerStaffId))
      .get();

    const isAdmin =
      callerGlobalRole?.role === "super_admin" ||
      callerGlobalRole?.role === "admin";
    const isCreator = room.createdById === callerStaffId;
    const isManager = callerParticipant.role === "Manager";

    if (!isAdmin && !isCreator && !isManager) {
      throw new ChatServiceError(
        "Only room managers, the creator, or admins can remove participants",
        "FORBIDDEN"
      );
    }
  }

  const targetParticipant = await db
    .select()
    .from(chatParticipants)
    .where(
      and(
        eq(chatParticipants.roomId, roomId),
        eq(chatParticipants.staffId, participantId)
      )
    )
    .get();

  if (!targetParticipant) {
    throw new ChatServiceError("Participant not found", "NOT_FOUND");
  }

  if (targetParticipant.role === "Manager" && !isSelfRemove) {
    const managerCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatParticipants)
      .where(
        and(
          eq(chatParticipants.roomId, roomId),
          eq(chatParticipants.role, "Manager")
        )
      )
      .get();

    const participantCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatParticipants)
      .where(eq(chatParticipants.roomId, roomId))
      .get();

    if (
      (managerCount?.count ?? 0) <= 1 &&
      (participantCount?.count ?? 0) >= 2
    ) {
      throw new ChatServiceError(
        "Cannot remove the last manager of a room with 2 or more participants",
        "CONFLICT"
      );
    }
  }

  await db
    .delete(chatParticipants)
    .where(
      and(
        eq(chatParticipants.roomId, roomId),
        eq(chatParticipants.staffId, participantId)
      )
    )
    .run();

  const remainingParticipants = await db
    .select()
    .from(chatParticipants)
    .where(eq(chatParticipants.roomId, roomId))
    .all();

  let shouldDeleteRoom = false;

  if (!room.name) {
    if (remainingParticipants.length < 2) {
      await db
        .delete(chatRooms)
        .where(eq(chatRooms.id, roomId))
        .run();
      shouldDeleteRoom = true;
    }
  } else {
    if (remainingParticipants.length === 0) {
      await db
        .delete(chatRooms)
        .where(eq(chatRooms.id, roomId))
        .run();
      shouldDeleteRoom = true;
    }
  }

  return {
    removed: true,
    shouldDeleteRoom,
    remainingParticipantStaffIds: remainingParticipants.map(
      (p) => p.staffId
    ),
  };
}

export async function deleteRoom(
  roomId: string,
  callerStaffId: string,
  callerRole: string
) {
  const room = await db
    .select()
    .from(chatRooms)
    .where(eq(chatRooms.id, roomId))
    .get();

  if (!room) {
    throw new ChatServiceError("Chat room not found", "NOT_FOUND");
  }

  const isAdmin = isGlobalAdmin(callerRole);
  const isCreator = room.createdById === callerStaffId;

  if (!isAdmin && !isCreator) {
    throw new ChatServiceError(
      "Only the room creator or an admin can delete this room",
      "FORBIDDEN"
    );
  }

  await db
    .delete(chatRooms)
    .where(eq(chatRooms.id, roomId))
    .run();
}

export async function clearMessages(
  roomId: string,
  callerStaffId: string,
  callerRole: string
) {
  const room = await db
    .select()
    .from(chatRooms)
    .where(eq(chatRooms.id, roomId))
    .get();

  if (!room) {
    throw new ChatServiceError("Chat room not found", "NOT_FOUND");
  }

  const myParticipant = await db
    .select()
    .from(chatParticipants)
    .where(
      and(
        eq(chatParticipants.roomId, roomId),
        eq(chatParticipants.staffId, callerStaffId)
      )
    )
    .get();

  if (!myParticipant) {
    throw new ChatServiceError(
      "You are not a participant in this room",
      "FORBIDDEN"
    );
  }

  const isDm = !room.name;
  const isAdmin = isGlobalAdmin(callerRole);
  const isCreator = room.createdById === callerStaffId;
  const isManager = myParticipant.role === "Manager";

  if (!isDm && !isAdmin && !isCreator && !isManager) {
    throw new ChatServiceError(
      "Only room managers, the creator, or admins can clear group chat history",
      "FORBIDDEN"
    );
  }

  await db
    .delete(chatMessages)
    .where(eq(chatMessages.roomId, roomId))
    .run();

  await db
    .update(chatRooms)
    .set({
      lastMessageTime: null,
      lastMessagePreview: null,
    })
    .where(eq(chatRooms.id, roomId))
    .run();

  const participants = await db
    .select()
    .from(chatParticipants)
    .where(eq(chatParticipants.roomId, roomId))
    .all();

  return {
    cleared: true,
    participantStaffIds: participants.map((p) => p.staffId),
  };
}
