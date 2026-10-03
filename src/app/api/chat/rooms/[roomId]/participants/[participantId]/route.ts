import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatParticipants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth-guard";
import { sendToConnection } from "@/lib/api/realtime";
import {
  updateParticipant,
  removeParticipant,
  ChatServiceError,
} from "@/services/chat";

async function getAllParticipantStaffIds(
  roomId: string
): Promise<string[]> {
  const participants = await db
    .select()
    .from(chatParticipants)
    .where(eq(chatParticipants.roomId, roomId))
    .all();

  return participants.map((p) => p.staffId);
}

export const PATCH = requireAuth(
  async (
    request: Request,
    session,
    context
  ) => {
    try {
      const { roomId, participantId } = await context!.params;
      const body = await request.json();

      const role = body?.role;
      if (role !== "Manager" && role !== "Member") {
        return NextResponse.json(
          { error: "Role must be 'Manager' or 'Member'" },
          { status: 400 }
        );
      }

      const result = await updateParticipant({
        roomId,
        participantId,
        role,
        callerStaffId: session.staffId,
        callerRole: session.role,
      });

      const staffIds = await getAllParticipantStaffIds(roomId);

      for (const staffId of staffIds) {
        sendToConnection(`chat-${staffId}`, "chat_message", {
          type: "participant_role_changed",
          roomId,
          participant: result.participant,
        });
      }

      return NextResponse.json({
        participant: result.participant,
      });
    } catch (error) {
      if (error instanceof ChatServiceError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }
      throw error;
    }
  },
  "chat:manage"
);

export const DELETE = requireAuth(
  async (
    _request: Request,
    session,
    context
  ) => {
    try {
      const { roomId, participantId } = await context!.params;

      const result = await removeParticipant({
        roomId,
        participantId,
        callerStaffId: session.staffId,
      });

      if (result.shouldDeleteRoom) {
        for (const staffId of result.remainingParticipantStaffIds) {
          sendToConnection(`chat-${staffId}`, "chat_message", {
            type: "room_deleted",
            roomId,
          });
        }
      } else {
        for (const staffId of result.remainingParticipantStaffIds) {
          sendToConnection(`chat-${staffId}`, "chat_message", {
            type: "participant_removed",
            roomId,
            staffId: participantId,
          });
        }
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof ChatServiceError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }
      throw error;
    }
  },
  "chat:manage"
);
