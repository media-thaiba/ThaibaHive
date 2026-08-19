import { NextResponse } from "next/server";
import { db } from "@/db";
import { performanceCycles } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { performanceCycleCreateSchema } from "@/lib/validation/schemas";
import { getUserInstitutionScope } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = (await getUserInstitutionScope()) || "inst_default";
  const cycles = await db
    .select()
    .from(performanceCycles)
    .where(eq(performanceCycles.institutionId, institutionId))
    .all();

  return NextResponse.json({ cycles });
}, "performance:read");

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const institutionId = (await getUserInstitutionScope()) || "inst_default";
    const body = await request.json();
    const validated = performanceCycleCreateSchema.parse(body);

    const id = `cyc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newCycle = {
      id,
      institutionId,
      title: validated.title,
      cycleType: validated.cycleType,
      startDate: validated.startDate,
      endDate: validated.endDate,
      selfAssessmentDeadline: validated.selfAssessmentDeadline,
      managerReviewDeadline: validated.managerReviewDeadline,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };


    await db.insert(performanceCycles).values(newCycle).run();

    return NextResponse.json({ cycle: newCycle }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create performance cycle" },
      { status: 400 }
    );
  }
}, "performance:manage");
