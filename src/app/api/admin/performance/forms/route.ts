import { NextResponse } from "next/server";
import { db } from "@/db";
import { evaluationForms } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { evaluationFormCreateSchema } from "@/lib/validation/schemas";
import { getUserInstitutionScope } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = (await getUserInstitutionScope()) || "inst_default";
  const forms = await db
    .select()
    .from(evaluationForms)
    .where(eq(evaluationForms.institutionId, institutionId))
    .all();

  return NextResponse.json({ forms });
}, "performance:read");

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const institutionId = (await getUserInstitutionScope()) || "inst_default";
    const body = await request.json();
    const validated = evaluationFormCreateSchema.parse(body);

    const id = `frm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newForm = {
      id,
      institutionId,
      frameworkId: validated.frameworkId,
      title: validated.title,
      description: validated.description || null,
      metricsConfigJson: validated.metricsConfigJson,
      ratingScale: validated.ratingScale || "1-5",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };


    await db.insert(evaluationForms).values(newForm).run();

    return NextResponse.json({ form: newForm }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create evaluation form template" },
      { status: 400 }
    );
  }
}, "performance:manage");
