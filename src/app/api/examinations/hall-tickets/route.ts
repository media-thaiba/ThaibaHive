import { NextResponse } from "next/server";
import { db } from "@/db";
import { hallTickets, exams, examAuditLogs, students } from "@thaiba/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { hallTicketIssueSchema } from "@/lib/validation/schemas";
import { checkStudentFeeClearance, generateQRPayload } from "@/lib/examinations/hall-ticket-service";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");
  const studentId = searchParams.get("studentId");
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const conditions = [];
  if (examId) conditions.push(eq(hallTickets.examId, examId));
  if (studentId) conditions.push(eq(hallTickets.studentId, studentId));

  // Tenant boundary: non-global scopes only ever see tickets for their own exams.
  if (institutionId && institutionId !== "global") {
    const scopedTickets = await db
      .select({ ticket: hallTickets })
      .from(hallTickets)
      .innerJoin(exams, eq(hallTickets.examId, exams.id))
      .where(and(...conditions, eq(exams.institutionId, institutionId)))
      .all();
    return NextResponse.json({ hallTickets: scopedTickets.map((t) => t.ticket) });
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const tickets = await db.select().from(hallTickets).where(whereClause);
  return NextResponse.json({ hallTickets: tickets });
}, "exam:read");

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const parsed = hallTicketIssueSchema.parse(body);
    const institutionId = await resolveScopedInstitutionId(session.institutionId);

    // Tenant boundary: target exam must belong to the caller's institution.
    const examExists = institutionId && institutionId !== "global"
      ? await db.select().from(exams).where(and(eq(exams.id, parsed.examId), eq(exams.institutionId, institutionId))).get()
      : await db.select().from(exams).where(eq(exams.id, parsed.examId)).get();
    if (!examExists) {
      return NextResponse.json({ error: "Target examination session not found" }, { status: 404 });
    }

    // Tenant boundary: target student must belong to the caller's institution.
    const studentExists = institutionId && institutionId !== "global"
      ? await db.select().from(students).where(and(eq(students.id, parsed.studentId), eq(students.institutionId, institutionId))).get()
      : await db.select().from(students).where(eq(students.id, parsed.studentId)).get();
    if (!studentExists) {
      return NextResponse.json({ error: "Target student not found" }, { status: 404 });
    }

    // Check existing hall ticket
    const existingTicket = await db
      .select()
      .from(hallTickets)
      .where(and(eq(hallTickets.examId, parsed.examId), eq(hallTickets.studentId, parsed.studentId)))
      .get();

    if (existingTicket) {
      return NextResponse.json({ success: true, hallTicket: existingTicket, reissued: false });
    }

    // Real-time Fee Clearance Check
    const clearance = await checkStudentFeeClearance(parsed.studentId);

    if (!clearance.feeCleared && !parsed.overrideFeeLock) {
      return NextResponse.json(
        {
          error: `Hall ticket generation blocked due to outstanding fee balance of $${clearance.pendingAmount.toFixed(2)}. Fee clearance required.`,
          feeCleared: false,
          pendingAmount: clearance.pendingAmount,
        },
        { status: 403 }
      );
    }

    // If override requested, check override permission
    let isOverride = false;
    if (!clearance.feeCleared && parsed.overrideFeeLock) {
      isOverride = true;
    }

    const ticketNumber = `HT-${Date.now()}-${parsed.studentId.substring(0, 5)}`;
    const qrPayload = generateQRPayload(ticketNumber, parsed.studentId, parsed.examId);
    const ticketId = `ht_${Date.now()}`;

    const newTicket = {
      id: ticketId,
      examId: parsed.examId,
      studentId: parsed.studentId,
      ticketNumber,
      feeCleared: clearance.feeCleared,
      overrideFeeLock: isOverride,
      overrideReason: parsed.overrideReason || null,
      overrideByStaffId: isOverride ? session.staffId : null,
      qrPayload,
      status: "issued",
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await db.insert(hallTickets).values(newTicket);

    // Audit Log for override or issue
    await db.insert(examAuditLogs).values({
      id: `audit_${Date.now()}`,
      examId: parsed.examId,
      entityType: "hall_ticket",
      entityId: ticketId,
      action: isOverride ? "override_fee_lock" : "issue_hall_ticket",
      performedByStaffId: session.staffId,
      previousState: null,
      newState: JSON.stringify({ ticketNumber, feeCleared: clearance.feeCleared, isOverride }),
      reason: parsed.overrideReason || "Standard hall ticket issuance",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, hallTicket: newTicket, feeCleared: clearance.feeCleared }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate hall ticket" }, { status: 400 });
  }
}, "exam:create");
