import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { processSyncPush } from "@/lib/sync/sync-engine-service";
import { syncPushPayloadSchema } from "@/lib/validation/schemas";
import { getUserInstitutionScope } from "@/lib/auth";

export const POST = requireAuth(async (request: Request, session) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parse = syncPushPayloadSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Validation failed", details: parse.error.format() }, { status: 400 });
  }

  const userInstScope = await getUserInstitutionScope();
  const institutionId = userInstScope || "inst_default";

  const result = await processSyncPush(
    institutionId,
    session.staffId,
    parse.data.deviceId,
    parse.data.clientSyncVersion,
    parse.data.changes
  );

  return NextResponse.json({
    institutionId,
    ...result,
  });
}, "sync:device");
