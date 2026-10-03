import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { getFeatureFlags } from "@/lib/features";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const resolved = await resolveRequestInstitution(session, searchParams.get("institutionId") || searchParams.get("tenantId"));
  const institutionId = resolved === "global" ? undefined : resolved;
  const flags = getFeatureFlags(institutionId);
  return NextResponse.json({ flags, institutionId: institutionId ?? null });
}, "features:read");
