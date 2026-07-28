import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { staff, marketplaceApps, appDefaultRoles, userAppAssignments } from "@thaiba/db/schema";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request, session) => {
  const now = new Date().toISOString();

  // Get all instant apps
  const instantApps = await db
    .select()
    .from(marketplaceApps)
    .where(eq(marketplaceApps.category, "instant"))
    .all();

  // Auto-assign each instant app with its default role
  for (const app of instantApps) {
    // Check if already assigned
    const existing = await db
      .select()
      .from(userAppAssignments)
      .where(
        and(
          eq(userAppAssignments.staffId, session.staffId),
          eq(userAppAssignments.appId, app.id)
        )
      )
      .get();

    if (!existing) {
      // Get default role for this app
      const defaultRole = await db
        .select()
        .from(appDefaultRoles)
        .where(eq(appDefaultRoles.appId, app.id))
        .get();

      await db.insert(userAppAssignments).values({
        id: crypto.randomUUID(),
        staffId: session.staffId,
        appId: app.id,
        roleId: defaultRole?.id ?? "",
        installedAt: now,
      });
    }
  }

  // Mark onboarding complete
  await db
    .update(staff)
    .set({
      isFirstLogin: false,
      onboardingCompletedAt: now,
    })
    .where(eq(staff.id, session.staffId));

  return NextResponse.json({
    message: "Onboarding complete",
    activatedApps: instantApps.length,
  });
});

