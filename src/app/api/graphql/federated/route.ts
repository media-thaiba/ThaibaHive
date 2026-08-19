import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { executeFederatedQuery } from "@/lib/federation/gateway";
import { db, staffInstitutions } from "@thaiba/db";
import { eq } from "drizzle-orm";

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();
    
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

    const result = await executeFederatedQuery(body, {
      tenantId,
      role: session.role,
      userId: session.staffId,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
});
