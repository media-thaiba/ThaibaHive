import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { RecordMapper } from "@/lib/sis/record-mapper";
import { isSisSyncEnabled } from "@/lib/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sis/mappings
 * List pending/resolved mapping queue items for the institution.
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

  const status = searchParams.get("status") || undefined;

  try {
    const items = await RecordMapper.listQueueItems(institutionId, status);
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list mapping items" }, { status: 500 });
  }
}, "sis:read");
