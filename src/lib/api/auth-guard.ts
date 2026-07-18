import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { hasPermission, type SessionPayload } from "@/lib/auth";
import type { StaffRole } from "@/types";

type HandlerWithSession = (
  request: Request,
  session: SessionPayload,
  params?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

export function requireAuth(
  handler: HandlerWithSession,
  requiredPermission?: string
) {
  return async (request: Request, context?: { params: Promise<Record<string, string>> }) => {
    const session = await verifySession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (requiredPermission) {
      const allowed = hasPermission(session.role as StaffRole, requiredPermission);
      if (!allowed) {
        console.warn(
          JSON.stringify({
            event: "unauthorized_access_attempt",
            staffId: session.staffId,
            role: session.role,
            requiredPermission,
            url: request.url,
            timestamp: new Date().toISOString(),
          })
        );
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    try {
      return await handler(request, session, context);
    } catch (error) {
      console.error("API error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
