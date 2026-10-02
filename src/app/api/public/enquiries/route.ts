import { NextResponse } from "next/server";
import { db } from "@/db";
import { studentEnquiries, institutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc, and } from "drizzle-orm";

const ALLOWED_ENQUIRY_STATUSES = new Set(["pending", "under_review", "admitted", "rejected"]);

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
export const GET = requireAuth(async (request, session) => {
  const url = new URL(request.url);
  const requestedInstitutionId = url.searchParams.get("institutionId");
  const status = url.searchParams.get("status");
  const scope = session.institutionId;

  const conditions = [];
  if (scope && scope !== "global") {
    // Scoped (non-admin) users are clamped to their own institution.
    conditions.push(eq(studentEnquiries.institutionId, scope));
  } else if (requestedInstitutionId) {
    // Admins may target an explicit institution.
    conditions.push(eq(studentEnquiries.institutionId, requestedInstitutionId));
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
export const PATCH = requireAuth(async (request: Request, session: any) => {
  const body = await request.json();
  const { id, status } = body;
  const reviewedById = session?.staffId || session?.id;

  if (!id || !status) {
    return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  }
  if (!ALLOWED_ENQUIRY_STATUSES.has(status)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${Array.from(ALLOWED_ENQUIRY_STATUSES).join(", ")}` },
      { status: 400 }
    );
  }

  // Server-resolved tenant scope — never from the request body.
  const scope = session?.institutionId;
  const scopeWhere =
    scope && scope !== "global"
      ? and(eq(studentEnquiries.id, id), eq(studentEnquiries.institutionId, scope))
      : eq(studentEnquiries.id, id);

  const existing = await db
    .select({ id: studentEnquiries.id })
    .from(studentEnquiries)
    .where(scopeWhere)
    .get();
  if (!existing) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  }

  const updated = await db
    .update(studentEnquiries)
    .set({
      status,
      reviewedById: reviewedById || null,
      updatedAt: new Date().toISOString(),
    })
    .where(scopeWhere)
    .returning()
    .get();

  return NextResponse.json({ enquiry: updated });
}, "enquiries:manage");
