import { NextResponse } from "next/server";
import { db } from "@/db";
import { competencyFrameworks } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { competencyFrameworkCreateSchema } from "@/lib/validation/schemas";
import { getUserInstitutionScope } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request: Request, _session) => {
  const institutionId = (await getUserInstitutionScope()) || "inst_default";
  const frameworks = await db
    .select()
    .from(competencyFrameworks)
    .where(eq(competencyFrameworks.institutionId, institutionId))
    .all();

  return NextResponse.json({ frameworks });
}, "performance:read");

export const POST = requireAuth(async (request: Request, _session) => {
  try {
    const institutionId = (await getUserInstitutionScope()) || "inst_default";
    const body = await request.json();
    const validated = competencyFrameworkCreateSchema.parse(body);

    const id = `fw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newFramework = {
      id,
      institutionId,
      name: validated.name,
      departmentId: validated.departmentId || null,
      roleScope: validated.roleScope || "all",
      metricsJson: validated.metricsJson,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };


    await db.insert(competencyFrameworks).values(newFramework).run();

    return NextResponse.json({ framework: newFramework }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create competency framework" },
      { status: 400 }
    );
  }
}, "performance:manage");
