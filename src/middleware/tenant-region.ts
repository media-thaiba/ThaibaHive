/**
 * Multi-Region Tenant Geo-Affinity Middleware Helper
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { NextResponse } from "next/server";

export type TenantRegion = "us-east" | "eu-central" | "ap-south" | "default";

const DEFAULT_REGION_MAP: Record<string, TenantRegion> = {
  "inst-us": "us-east",
  "inst-eu": "eu-central",
  "inst-ap": "ap-south",
  "TPS-MAJHI": "ap-south",
};

export function resolveTenantRegion(req: Request): TenantRegion {
  const institutionId = req.headers.get("x-institution-id") || req.headers.get("x-tenant-id");
  if (!institutionId) {
    return "default";
  }
  return DEFAULT_REGION_MAP[institutionId] || "default";
}

export function applyTenantRegionHeaders(response: NextResponse, req: Request): NextResponse {
  const region = resolveTenantRegion(req);
  response.headers.set("x-tenant-region", region);
  return response;
}
