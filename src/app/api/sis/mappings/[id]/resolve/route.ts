import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { RecordMapper } from "@/lib/sis/record-mapper";
import { isSisSyncEnabled } from "@/lib/features";
import { sisMappingResolveSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sis/mappings/[id]/resolve
 * Resolves an unmatched SIS mapping queue item.
 */
export const POST = requireAuth(async (request: Request, session: any, context?: any) => {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const requestedInst =
    body.institutionId ||
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
  const queueId = params?.id;
  if (!queueId) {
    return NextResponse.json({ error: "Mapping item ID required" }, { status: 400 });
  }

  const parsed = sisMappingResolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await RecordMapper.resolveQueueItem(
      institutionId,
      queueId,
      parsed.data,
      session.staffId || session.userId
    );
    return NextResponse.json({ success: true, item: result.queueItem });
  } catch (err: any) {
    const msg = err.message || "Failed to resolve mapping item";
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}, "sis:manage");
