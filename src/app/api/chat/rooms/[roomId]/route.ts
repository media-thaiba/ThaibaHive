import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import {
  getRoomDetails,
  deleteRoom,
  ChatServiceError,
} from "@/services/chat";

export const GET = requireAuth(
  async (
    _request: Request,
    session,
    context
  ) => {
    try {
      const { roomId } = await context!.params;
      const room = await getRoomDetails(roomId, session.staffId);
      return NextResponse.json({ room });
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

export const DELETE = requireAuth(
  async (
    _request: Request,
    session,
    context
  ) => {
    try {
      const { roomId } = await context!.params;
      await deleteRoom(roomId, session.staffId, session.role);
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
