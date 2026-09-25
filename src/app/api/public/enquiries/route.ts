import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentEnquiries, institutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc, and } from "drizzle-orm";

// Public admission enquiry submission handler
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      institutionId,
      applicantName,
      guardianName,
      email,
      phone,
      appliedGradeOrCourse,
      academicYearId,
      previousSchoolOrCollege,
      notes,
    } = body;

    if (!institutionId || !applicantName || !guardianName || !phone || !appliedGradeOrCourse) {
      return NextResponse.json(
        { error: "institutionId, applicantName, guardianName, phone, and appliedGradeOrCourse are required" },
        { status: 400 }
      );
    }

    // Verify institution exists
    const inst = await db.select({ id: institutions.id }).from(institutions).where(eq(institutions.id, institutionId)).get();
    if (!inst) {
      return NextResponse.json({ error: "Invalid institution identifier" }, { status: 400 });
    }

    const enquiry = await db
      .insert(studentEnquiries)
      .values({
        id: `enq_${crypto.randomUUID().slice(0, 10)}`,
        institutionId,
        applicantName,
        guardianName,
        email: email || null,
        phone,
        appliedGradeOrCourse,
        academicYearId: academicYearId || null,
        previousSchoolOrCollege: previousSchoolOrCollege || null,
        notes: notes || null,
        status: "pending",
      })
      .returning()
      .get();

    return NextResponse.json({
      success: true,
      message: "Admission enquiry received successfully. The admissions office will contact you shortly.",
      enquiryId: enquiry.id,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Protected management view for Coordinators / Principals
export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get("institutionId");
  const status = url.searchParams.get("status");

  const conditions = [];
  if (institutionId) {
    conditions.push(eq(studentEnquiries.institutionId, institutionId));
  }
  if (status) {
    conditions.push(eq(studentEnquiries.status, status));
  }

  const rows = await db
    .select({
      id: studentEnquiries.id,
      institutionId: studentEnquiries.institutionId,
      institutionName: institutions.name,
      applicantName: studentEnquiries.applicantName,
      guardianName: studentEnquiries.guardianName,
      email: studentEnquiries.email,
      phone: studentEnquiries.phone,
      appliedGradeOrCourse: studentEnquiries.appliedGradeOrCourse,
      previousSchoolOrCollege: studentEnquiries.previousSchoolOrCollege,
      notes: studentEnquiries.notes,
      status: studentEnquiries.status,
      createdAt: studentEnquiries.createdAt,
    })
    .from(studentEnquiries)
    .leftJoin(institutions, eq(studentEnquiries.institutionId, institutions.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(studentEnquiries.createdAt))
    .all();

  return NextResponse.json({ enquiries: rows });
}, "enquiries:read");

// Protected status review handler
export const PATCH = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { id, status, reviewedById } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  }

  const updated = await db
    .update(studentEnquiries)
    .set({
      status,
      reviewedById: reviewedById || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(studentEnquiries.id, id))
    .returning()
    .get();

  return NextResponse.json({ enquiry: updated });
}, "enquiries:manage");
