import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { hardwareBadgeRegisterSchema } from "@/lib/validation/schemas";
import { GateAccessEngine } from "@/lib/hardware/gate-access-engine";
import { db } from "@/db";
import { hardwareBadges } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (request: Request, session) => {
  try {
    const institutionId = await resolveRequestInstitution(session);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const badgeType = searchParams.get("badgeType");
    const credentialType = searchParams.get("credentialType");
    const staffId = searchParams.get("staffId");
    const studentId = searchParams.get("studentId");

    const conditions = [eq(hardwareBadges.institutionId, institutionId)];
    if (status) conditions.push(eq(hardwareBadges.status, status));
    if (badgeType) conditions.push(eq(hardwareBadges.badgeType, badgeType));
    if (credentialType) conditions.push(eq(hardwareBadges.credentialType, credentialType));
    if (staffId) conditions.push(eq(hardwareBadges.staffId, staffId));
    if (studentId) conditions.push(eq(hardwareBadges.studentId, studentId));

    const badges = await db
      .select()
      .from(hardwareBadges)
      .where(and(...conditions))
      .orderBy(desc(hardwareBadges.createdAt));

    return NextResponse.json({ badges });
  } catch (error: any) {
    console.error("[Badges] Error listing badges:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list hardware badges" },
      { status: 500 }
    );
  }
}, "hardware:badges:read");

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const institutionId = await resolveRequestInstitution(session);
    const body = await request.json();

    const parsed = hardwareBadgeRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid badge payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const badge = await GateAccessEngine.registerBadge(
      institutionId,
      parsed.data
    );

    return NextResponse.json({ badge }, { status: 201 });
  } catch (error: any) {
    console.error("[Badges] Error registering badge:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register hardware badge" },
      { status: 500 }
    );
  }
}, "hardware:badges:manage");
