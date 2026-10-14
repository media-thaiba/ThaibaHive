import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { SyncRunEngine } from "@/lib/sis/sync-run-engine";
import { isSisSyncEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sis/runs
 * List sync runs for an institution, optionally filtered by connectorId.
 */
export const GET = requireAuth(async (request: Request, session: any) => {
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

  const connectorId = searchParams.get("connectorId") || undefined;

  try {
    const runs = await SyncRunEngine.listRuns(institutionId, connectorId);
    return NextResponse.json({ runs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list sync runs" }, { status: 500 });
  }
}, "sis:read");
