import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { SyncRunEngine, ConnectorRunConflictError } from "@/lib/sis/sync-run-engine";
import { isSisSyncEnabled } from "@/lib/features";
import { sisSyncTriggerSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/sis/connectors/[id]/sync
 * Triggers a sync execution. Enforces one live run per connector -> 409 Conflict with Retry-After.
 */
export const POST = requireAuth(async (request: Request, session: any, context?: any) => {
  let body: any = {};
  try {
    const text = await request.text();
    if (text && text.trim().length > 0) {
      body = JSON.parse(text);
    }
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
  const connectorId = params?.id;
  if (!connectorId) {
    return NextResponse.json({ error: "Connector ID required" }, { status: 400 });
  }

  const parsed = sisSyncTriggerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const run = await SyncRunEngine.triggerRun(institutionId, connectorId, parsed.data);
    return NextResponse.json({ run }, { status: 202 });
  } catch (err: any) {
    if (err instanceof ConnectorRunConflictError) {
      return NextResponse.json(
        {
          error: err.message,
          activeRunId: err.activeRunId,
          retryAfter: err.retryAfterSeconds,
        },
        {
          status: 409,
          headers: {
            "Retry-After": String(err.retryAfterSeconds),
          },
        }
      );
    }

    const msg = err.message || "Failed to trigger sync run";
    const status = msg.includes("not found") ? 404 : msg.includes("disabled") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}, "sis:sync");
