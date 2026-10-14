import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { SyncRunEngine } from "@/lib/sis/sync-run-engine";
import { isSisSyncEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sis/runs/[id]
 * Get details for a specific sync run.
 */
export const GET = requireAuth(async (request: Request, session: any, context?: any) => {
  const { searchParams } = new URL(request.url);
  const requestedInst =
    searchParams.get("institutionId") ||
    request.headers.get("x-institution-id") ||
    (session.institutionId && session.institutionId !== "global" ? session.institutionId : undefined);
  const institutionId = await resolveRequestInstitution(session, requestedInst);

  if (!institutionId || institutionId === "global") {
    return NextResponse.json({ error: "Institution context required" }, { status: 400 });
  }

  if (!isSisSyncEnabled(institutionId)) {
    return NextResponse.json({ error: "SIS sync feature is disabled" }, { status: 403 });
  }

  const params = await context?.params;
  const runId = params?.id;
  if (!runId) {
    return NextResponse.json({ error: "Run ID required" }, { status: 400 });
  }

  try {
    const run = await SyncRunEngine.getRun(institutionId, runId);
    if (!run) {
      return NextResponse.json({ error: "Sync run not found" }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to get sync run" }, { status: 500 });
  }
}, "sis:read");
