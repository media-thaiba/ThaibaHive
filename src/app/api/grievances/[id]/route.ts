import { NextResponse } from "next/server";
import { db } from "@/db";
import { grievances, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { grievanceUpdateSchema } from "@/lib/validation/schemas";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;

  const row = await db
    .select({
      id: grievances.id,
      staffId: grievances.staffId,
      isAnonymous: grievances.isAnonymous,
      category: grievances.category,
      subject: grievances.subject,
      description: grievances.description,
      status: grievances.status,
      response: grievances.response,
      respondedById: grievances.respondedById,
      responderName: staff.firstName,
      responderLastName: staff.lastName,
      respondedAt: grievances.respondedAt,
      createdAt: grievances.createdAt,
      updatedAt: grievances.updatedAt,
    })
    .from(grievances)
    .leftJoin(staff, eq(grievances.respondedById, staff.id))
    .where(eq(grievances.id, id))
    .get();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let submitterName: string | null = null;
  if (!row.isAnonymous && row.staffId) {
    const submitter = await db
      .select({ firstName: staff.firstName, lastName: staff.lastName })
      .from(staff)
      .where(eq(staff.id, row.staffId))
      .get();
    if (submitter) submitterName = `${submitter.firstName} ${submitter.lastName}`;
  }

  return NextResponse.json({ grievance: { ...row, submitterName } });
}, "grievances:read");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const role = session.role;

  if (role !== "super_admin" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = grievanceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { status, response } = parsed.data;

  const updateData: Record<string, string | null> = {};
  if (status) updateData.status = status;
  if (response !== undefined) updateData.response = response;
  updateData.respondedById = session.staffId;
  updateData.respondedAt = new Date().toISOString();

  const updated = await db
    .update(grievances)
    .set(updateData)
    .where(eq(grievances.id, id))
    .returning()
    .get();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ grievance: updated });
});
