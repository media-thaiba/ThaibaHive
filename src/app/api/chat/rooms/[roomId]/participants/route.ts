import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { chatParticipantAddSchema } from "@/lib/validation/schemas";
import { sendToConnection } from "@/lib/api/realtime";
import {
  getRoomParticipants,
  addParticipant,
  removeParticipant,
  ChatServiceError,
} from "@/services/chat";
import { db } from "@/db";
import { chatParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(
  async (
    _request: Request,
    session,
    context
  ) => {
    try {
      const { roomId } = await context!.params;
      const result = await getRoomParticipants(roomId, session.staffId);
      return NextResponse.json(result);
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
  "chat:read"
);

export const POST = requireAuth(
  async (
    request: Request,
    session,
    context
  ) => {
    try {
      const { roomId } = await context!.params;
      const body = await request.json();
      const parsed = chatParticipantAddSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0].message },
          { status: 400 }
        );
      }

      const result = await addParticipant({
        roomId,
        staffId: parsed.data.staffId,
        role: parsed.data.role || "Member",
        addedById: session.staffId,
      });

      for (const staffId of result.allParticipantStaffIds) {
        sendToConnection(`chat-${staffId}`, "chat_message", {
          type: "participant_added",
          roomId,
          participant: result.participant,
        });
      }

      return NextResponse.json(
        { participant: result.participant },
        { status: 201 }
      );
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

export const PATCH = requireAuth(
  async (
    _request: Request,
    session,
    context
  ) => {
    try {
      const { roomId } = await context!.params;
      const now = new Date().toISOString();

      await db
        .update(chatParticipants)
        .set({ lastReadAt: now })
        .where(
          and(
            eq(chatParticipants.roomId, roomId),
            eq(chatParticipants.staffId, session.staffId)
          )
        )
        .run();

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

export const DELETE = requireAuth(
  async (
    request: Request,
    session,
    context
  ) => {
    try {
      const { roomId } = await context!.params;
      const { searchParams } = new URL(request.url);
      const targetStaffId = searchParams.get("staffId");

      const removeId = targetStaffId || session.staffId;

      const result = await removeParticipant({
        roomId,
        participantId: removeId,
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
            staffId: removeId,
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
