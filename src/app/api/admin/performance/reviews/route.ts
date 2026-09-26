import { NextResponse } from "next/server";
import { db } from "@/db";
import { performanceReviews } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { getUserInstitutionScope } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request: Request, _session) => {
  const institutionId = (await getUserInstitutionScope()) || "inst_default";
  const reviews = await db
    .select()
    .from(performanceReviews)
    .where(eq(performanceReviews.institutionId, institutionId))
    .all();

  return NextResponse.json({ reviews });
}, "performance:read");

export const POST = requireAuth(async (request: Request, _session) => {
  try {
    const institutionId = (await getUserInstitutionScope()) || "inst_default";
    const body = await request.json();
    const id = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newReview = {
      id,
      institutionId,
      cycleId: body.cycleId,
      staffId: body.staffId,
      evaluatorStaffId: body.evaluatorStaffId || body.staffId,
      formTemplateId: body.formTemplateId || null,
      status: "self_assessment",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };


    await db.insert(performanceReviews).values(newReview).run();

    return NextResponse.json({ review: newReview }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create performance review" },
      { status: 400 }
    );
  }
}, "performance:manage");
