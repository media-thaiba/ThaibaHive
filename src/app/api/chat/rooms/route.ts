import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { chatRoomCreateSchema } from "@/lib/validation/schemas";
import {
  getUserRooms,
  createRoom,
  ChatServiceError,
} from "@/services/chat";

export const GET = requireAuth(async (_request, session) => {
  try {
    const result = await getUserRooms(session.staffId);
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
}, "chat:read");

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const parsed = chatRoomCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, participantIds, isDirectMessage } = parsed.data;

    const result = await createRoom({
      name,
      participantIds,
      isDirectMessage,
      creatorStaffId: session.staffId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ChatServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    throw error;
  }
}, "chat:manage");
