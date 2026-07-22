import { NextResponse } from "next/server";
import { db } from "@/db";
import { staffRecognition, staff, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { desc, inArray, eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  let query = db.select().from(staffRecognition);

  if (session.role !== "super_admin" && session.role !== "admin") {
    const callerInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .get();
    if (callerInst) {
      const instStaff = await db
        .select({ staffId: staffInstitutions.staffId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.institutionId, callerInst.institutionId))
        .all();
      const staffIds = instStaff.map((s) => s.staffId).filter(Boolean);
      if (staffIds.length > 0) {
        query = query.where(inArray(staffRecognition.staffId, staffIds)) as typeof query;
      } else {
        return NextResponse.json({ recognitions: [] });
      }
    } else {
      return NextResponse.json({ recognitions: [] });
    }
  }

  const items = await query.orderBy(desc(staffRecognition.createdAt)).all();

  const staffIds = new Set<string>();
  items.forEach((r) => {
    staffIds.add(r.staffId);
    if (r.recognizedById) staffIds.add(r.recognizedById);
  });

  const staffMap = new Map<string, { firstName: string; lastName: string }>();
  if (staffIds.size > 0) {
    const staffRows = await db
      .select({ id: staff.id, firstName: staff.firstName, lastName: staff.lastName })
      .from(staff)
      .where(inArray(staff.id, [...staffIds]))
      .all();
    staffRows.forEach((s) => staffMap.set(s.id, s));
  }

  const recognitions = items.map((r) => {
    const recognizer = r.recognizedById ? staffMap.get(r.recognizedById) : null;
    const recipient = staffMap.get(r.staffId);
    return {
      id: r.id,
      type: r.recognitionType,
      reason: r.message,
      recognizedByName: recognizer?.firstName ?? "",
      recognizedByLastName: recognizer?.lastName ?? "",
      recipientName: recipient?.firstName ?? "",
      recipientLastName: recipient?.lastName ?? "",
      createdAt: r.createdAt,
    };
  });

  return NextResponse.json({ recognitions });
}, "recognition:create");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { staffId: recipientId, type, reason } = body;

  if (!recipientId || !reason) {
    return NextResponse.json({ error: "Recipient and reason required" }, { status: 400 });
  }

  if (session.role !== "super_admin" && session.role !== "admin") {
    const callerInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .get();
    const recipientInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, recipientId))
      .get();

    if (!callerInst || !recipientInst || callerInst.institutionId !== recipientInst.institutionId) {
      return NextResponse.json({ error: "Forbidden: Recipient must be in the same institution" }, { status: 403 });
    }
  }

  const recognition = await db
    .insert(staffRecognition)
    .values({
      id: crypto.randomUUID(),
      staffId: recipientId,
      recognitionType: type || "kudos",
      message: reason,
      recognizedById: session.staffId,
      date: new Date().toISOString().split("T")[0],
    })
    .returning()
    .get();

  return NextResponse.json({ recognition }, { status: 201 });
}, "recognition:create");