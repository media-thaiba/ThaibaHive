import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { chatMessageCreateSchema } from "@/lib/validation/schemas";
import { sendToConnection } from "@/lib/api/realtime";
import {
  getRoomMessages,
  sendMessage,
  ChatServiceError,
} from "@/services/chat";

export const GET = requireAuth(
  async (
    request: Request,
    session,
    context
  ) => {
    try {
      const { roomId } = await context!.params;
      const { searchParams } = new URL(request.url);
      const limit = Math.min(
        parseInt(searchParams.get("limit") || "50", 10),
        100
      );
      const before = searchParams.get("before");

      const result = await getRoomMessages({
        roomId,
        staffId: session.staffId,
        limit,
        beforeCursor: before,
      });

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
      const parsed = chatMessageCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0].message },
          { status: 400 }
        );
      }

      const { text, mediaUrl, mediaType } = parsed.data;

      const result = await sendMessage({
        roomId,
        senderId: session.staffId,
        text,
        mediaUrl,
        mediaType,
      });

      for (const recipientId of result.recipients) {
        sendToConnection(
          `chat-${recipientId}`,
          "chat_message",
          {
            type: "new_message",
            roomId,
            message: result.message,
          }
        );
      }

      return NextResponse.json(
        { message: result.message },
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
