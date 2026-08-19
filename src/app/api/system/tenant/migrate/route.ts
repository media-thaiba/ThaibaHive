import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { tenantRouter, TenantRegion } from "@/db";
import { tenantMigrationOrchestrator } from "@/lib/tenant/tenant-migration";

async function getHandler(request: Request, session: any) {
  return NextResponse.json({
    tenantMappings: tenantRouter.getAllTenantMappings(),
    history: tenantMigrationOrchestrator.getHistory(),
  });
}

async function postHandler(request: Request, session: any) {
  try {
    const body = await request.json();
    const { tenantId, targetRegion } = body;

    const validRegions: TenantRegion[] = ["us-east", "eu-central", "ap-south", "default"];
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }
    if (!targetRegion || !validRegions.includes(targetRegion)) {
      return NextResponse.json(
        { error: `Invalid targetRegion. Expected one of: ${validRegions.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await tenantMigrationOrchestrator.migrateTenant(tenantId, targetRegion);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Tenant migration failed", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler, "system:manage");
export const POST = requireAuth(postHandler, "system:manage");
