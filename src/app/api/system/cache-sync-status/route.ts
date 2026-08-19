import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { crossRegionCacheMesh } from "@/lib/cache/cross-region-mesh";

async function getHandler(request: Request, session: any) {
  const authHeader = request.headers.get("x-cache-secret");
  const validSecret = process.env.CACHE_SYNC_SECRET && authHeader === process.env.CACHE_SYNC_SECRET;

  if (!session && !validSecret) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const report = crossRegionCacheMesh.getHealthReport();
  return NextResponse.json(report);
}

export const GET = requireAuth(getHandler, "system:manage");
