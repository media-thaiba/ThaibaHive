import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { hardwareBadgeRevokeSchema } from "@/lib/validation/schemas";
import { GateAccessEngine } from "@/lib/hardware/gate-access-engine";

export const dynamic = "force-dynamic";

export const POST = requireAuth(
  async (request: Request, session, { params }: any) => {
    try {
      const institutionId = await resolveRequestInstitution(session);
      const badgeId = params.id;

      if (!badgeId) {
        return NextResponse.json({ error: "Badge ID is required" }, { status: 400 });
      }

      let body: any = {};
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsed = hardwareBadgeRevokeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid revoke payload", details: parsed.error.format() },
          { status: 400 }
        );
      }

      const revoked = await GateAccessEngine.revokeBadge(
        institutionId,
        badgeId,
        parsed.data.reason
      );

      if (!revoked) {
        return NextResponse.json({ error: "Badge not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, badge: revoked });
    } catch (error: any) {
      console.error("[Badges] Error revoking badge:", error);
      return NextResponse.json(
        { error: error.message || "Failed to revoke hardware badge" },
        { status: 500 }
      );
    }
  },
  "hardware:badges:manage"
);
