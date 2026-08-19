/**
 * Multi-Region Tenant Geo-Affinity Middleware Helper
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { NextResponse } from "next/server";
import { tenantRouter, TenantRegion } from "@/db";

export function resolveTenantRegion(req: Request): TenantRegion {
  const institutionId = req.headers.get("x-institution-id") || req.headers.get("x-tenant-id");
  if (!institutionId) {
    return "default";
  }
  return tenantRouter.getTenantRegion(institutionId);
}

export function applyTenantRegionHeaders(response: NextResponse, req: Request): NextResponse {
  const region = resolveTenantRegion(req);
  response.headers.set("x-tenant-region", region);
  return response;
}
