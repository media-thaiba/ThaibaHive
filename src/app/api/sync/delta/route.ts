import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { getDeltaChanges } from "@/lib/sync/sync-engine-service";
import { deltaSyncQuerySchema } from "@/lib/validation/schemas";

export const GET = requireAuth(async (request: Request, session) => {
  const url = new URL(request.url);
  const parse = deltaSyncQuerySchema.safeParse({
    sinceVersion: url.searchParams.get("sinceVersion") || 0,
    limit: url.searchParams.get("limit") || 500,
    deviceId: url.searchParams.get("deviceId") || "device_default",
  });

  if (!parse.success) {
    return NextResponse.json({ error: "Invalid sync query parameters", details: parse.error.format() }, { status: 400 });
  }

  const institutionId = await resolveRequestInstitution(session, url.searchParams.get("institutionId") || url.searchParams.get("tenantId"));

  const delta = await getDeltaChanges(institutionId, parse.data.sinceVersion, parse.data.limit);

  return NextResponse.json({
    success: true,
    institutionId,
    ...delta,
  });
}, "sync:device");
