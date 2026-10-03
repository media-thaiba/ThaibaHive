import { NextResponse } from "next/server";
import { db } from "@/db";
import { institutions, purchaseRequests, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, sum, and, inArray } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const callerInstitution = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId))
    .limit(1);

  const institutionId = callerInstitution[0]?.institutionId;
  if (!institutionId) {
    return NextResponse.json({ error: "No institution associated with your account" }, { status: 404 });
  }

  const institution = await db
    .select({ allocatedBudget: institutions.allocatedBudget })
    .from(institutions)
    .where(eq(institutions.id, institutionId))
    .get();

  if (!institution) {
    return NextResponse.json({ error: "Institution not found" }, { status: 404 });
  }

  const totalAllocated = institution.allocatedBudget ?? 0;

  const staffInInstitution = await db
    .select({ staffId: staffInstitutions.staffId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.institutionId, institutionId))
    .all();

  const staffIds = [...new Set(staffInInstitution.map((s) => s.staffId))];

  if (staffIds.length === 0) {
    return NextResponse.json({
      budget: {
        totalAllocated: totalAllocated,
        totalSpent: 0,
        totalPending: 0,
        remaining: totalAllocated,
      },
    });
  }

  const approvedPurchases = await db
    .select({ totalCost: sum(purchaseRequests.estimatedCost) })
    .from(purchaseRequests)
    .where(
      and(
        inArray(purchaseRequests.requesterId, staffIds),
        eq(purchaseRequests.status, "approved")
      )
    )
    .get();

  const pendingPurchases = await db
    .select({ totalCost: sum(purchaseRequests.estimatedCost) })
    .from(purchaseRequests)
    .where(
      and(
        inArray(purchaseRequests.requesterId, staffIds),
        inArray(purchaseRequests.status, ["pending_hod", "pending_accounts", "pending_purchase"])
      )
    )
    .get();

  const totalSpent = Number(approvedPurchases?.totalCost ?? 0);
  const totalPending = Number(pendingPurchases?.totalCost ?? 0);
  const remaining = Math.max(0, totalAllocated - totalSpent - totalPending);

  return NextResponse.json({
    budget: {
      totalAllocated,
      totalSpent,
      totalPending,
      remaining,
    },
  });
}, "finance:read");