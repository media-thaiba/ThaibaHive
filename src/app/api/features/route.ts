import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { getFeatureFlags } from "@/lib/features";

export const GET = requireAuth(async (request: Request, _session) => {
  const { searchParams } = new URL(request.url);
  const institutionId = searchParams.get("institutionId") || undefined;
  const flags = getFeatureFlags(institutionId);
  return NextResponse.json({ flags, institutionId: institutionId ?? null });
}, "features:read");
