import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { getDeltaChanges } from "@/lib/sync/sync-engine-service";
import { deltaSyncQuerySchema } from "@/lib/validation/schemas";
import { getUserInstitutionScope } from "@/lib/auth";

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

  const userInstScope = await getUserInstitutionScope();
  const institutionId = url.searchParams.get("institutionId") || userInstScope || "inst_default";

  const delta = await getDeltaChanges(institutionId, parse.data.sinceVersion, parse.data.limit);

  return NextResponse.json({
    success: true,
    institutionId,
    ...delta,
  });
}, "sync:device");
