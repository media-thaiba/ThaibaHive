import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { invalidateCacheKey } from "@/lib/cache/invalidation";
import { db, staffInstitutions } from "@thaiba/db";
import { eq } from "drizzle-orm";

export const POST = requireAuth(async (request, session) => {
  try {
    const { cacheKey } = await request.json();
    if (!cacheKey) {
      return NextResponse.json({ error: "Missing cacheKey parameter" }, { status: 400 });
    }

    let tenantId = "system";
    try {
      const userInst = await db
        .select({ institutionId: staffInstitutions.institutionId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.staffId, session.staffId))
        .get();
      if (userInst) {
        tenantId = userInst.institutionId;
      }
    } catch {
      // Fallback
    }

    const success = await invalidateCacheKey(tenantId, cacheKey);
    if (success) {
      return NextResponse.json({ success: true, message: `Cache key '${cacheKey}' evicted successfully.` });
    } else {
      return NextResponse.json({ error: "Failed to invalidate cache key" }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}, "cache:manage");
