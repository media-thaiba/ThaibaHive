import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { verifyQRPayload } from "@/lib/examinations/hall-ticket-service";
import { db } from "@/db";
import { hallTickets } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const { qrPayload } = body;

    if (!qrPayload) {
      return NextResponse.json({ error: "Missing qrPayload parameter" }, { status: 400 });
    }

    const verification = verifyQRPayload(qrPayload);
    if (!verification.valid) {
      return NextResponse.json({ valid: false, error: verification.error }, { status: 400 });
    }

    // Verify against DB ticket record
    const ticket = await db
      .select()
      .from(hallTickets)
      .where(eq(hallTickets.ticketNumber, verification.payload.ticketNumber))
      .get();

    if (!ticket) {
      return NextResponse.json({ valid: false, error: "Hall ticket record not found in database" }, { status: 404 });
    }

    if (ticket.status !== "issued") {
      return NextResponse.json({ valid: false, error: `Hall ticket is ${ticket.status}` }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      ticketNumber: ticket.ticketNumber,
      studentId: ticket.studentId,
      examId: ticket.examId,
      status: ticket.status,
      issuedAt: ticket.issuedAt,
    });
  } catch (err: any) {
    return NextResponse.json({ valid: false, error: err.message || "Verification failed" }, { status: 400 });
  }
}, "exam:read");
