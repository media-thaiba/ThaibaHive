import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { sendToConnection } from "@/lib/api/realtime";
import { clearMessages, ChatServiceError } from "@/services/chat";

export const POST = requireAuth(
  async (
    _request: Request,
    session,
    context
  ) => {
    try {
      const { roomId } = await context!.params;

      const result = await clearMessages(
        roomId,
        session.staffId,
        session.role
      );

      for (const staffId of result.participantStaffIds) {
        sendToConnection(
          `chat-${staffId}`,
          "chat_message",
          {
            type: "messages_cleared",
            roomId,
          }
        );
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
