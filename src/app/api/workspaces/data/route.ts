import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { WorkspaceAggregationService } from "@/lib/services/workspace-aggregation";
import { db } from "@/db";
import { staffInstitutions } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  try {
    const { role, staffId } = session;

    // Resolve institutionId from staffInstitutions table (SessionPayload has no institutionId)
    const staffInstitution = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, staffId))
      .get();
    const institutionId = staffInstitution?.institutionId ?? "";

    let data: unknown;

    if (role === "principal" || role === "admin" || role === "super_admin") {
      if (!institutionId) {
        return NextResponse.json(
          { error: "Institution not configured for this account" },
          { status: 400 }
        );
      }
      data = await WorkspaceAggregationService.getPrincipalData(institutionId);
    } else if (role === "staff" || role === "hod") {
      data = await WorkspaceAggregationService.getTeacherData(staffId);
    } else if (role === "accounts" || role === "purchase") {
      if (!institutionId) {
        return NextResponse.json(
          { error: "Institution not configured for this account" },
          { status: 400 }
        );
      }
      data = await WorkspaceAggregationService.getCashierData(institutionId);
    } else {
      // Default: treat as parent/guardian
      data = await WorkspaceAggregationService.getParentData(staffId);
    }

    const cacheHeaders = WorkspaceAggregationService.getCacheHeaders(60);
    const response = NextResponse.json({
      success: true,
      role,
      data,
      timestamp: new Date().toISOString(),
    });

    for (const [key, value] of Object.entries(cacheHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        event: "workspace_data_error",
        staffId: session.staffId,
        error: msg,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json({ error: "Failed to load workspace data" }, { status: 500 });
  }
}, "workspaces:read");
