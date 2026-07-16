import { NextResponse } from "next/server";
import { db } from "@/db";
import { accessRequests, marketplaceApps, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, desc } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  const requests = await db
    .select({
      id: accessRequests.id,
      staffId: accessRequests.staffId,
      appId: accessRequests.appId,
      status: accessRequests.status,
      reason: accessRequests.reason,
      createdAt: accessRequests.createdAt,
      appName: marketplaceApps.name,
      appSlug: marketplaceApps.slug,
      requesterName: staff.firstName,
      requesterLastName: staff.lastName,
      requesterEmail: staff.email,
    })
    .from(accessRequests)
    .leftJoin(marketplaceApps, eq(accessRequests.appId, marketplaceApps.id))
    .leftJoin(staff, eq(accessRequests.staffId, staff.id))
    .where(
      and(
        eq(accessRequests.routedToId, session.staffId),
        eq(accessRequests.status, "pending")
      )
    )
    .orderBy(desc(accessRequests.createdAt))
    .all();

  return NextResponse.json({ requests });
}, "attendance:read");
