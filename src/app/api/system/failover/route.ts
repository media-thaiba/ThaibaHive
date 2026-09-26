import { NextResponse } from "next/server";
import { verifySession } from "@thaiba/auth";
import { FailoverDetector } from "@/lib/db/failover-detector";

export async function GET(_request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.role !== "super_admin" && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden - Administrator role required" }, { status: 403 });
  }

  const detector = FailoverDetector.getInstance();
  return NextResponse.json({
    state: detector.getState(),
    consecutiveFailures: detector.getConsecutiveFailures(),
    promotionCandidate: detector.getPromotionCandidate(),
    history: detector.getHistory(),
  });
}

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden - Super Admin required for failover operations" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, replicaId } = body;
    const detector = FailoverDetector.getInstance();

    if (action === "promote") {
      if (!replicaId) {
        return NextResponse.json({ error: "replicaId is required for promotion" }, { status: 400 });
      }
      const event = await detector.manualPromote(replicaId, session.email || session.staffId);
      return NextResponse.json({ success: true, event });
    }

    if (action === "reset") {
      const event = await detector.resetCircuit(session.email || session.staffId);
      return NextResponse.json({ success: true, event });
    }

    return NextResponse.json({ error: "Invalid action. Expected 'promote' or 'reset'" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to execute failover operation", details: err?.message }, { status: 500 });
  }
}
