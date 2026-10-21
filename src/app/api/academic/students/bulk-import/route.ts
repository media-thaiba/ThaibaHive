import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, guardians, studentGuardians } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { studentBulkImportSchema } from "@/lib/validation/schemas";
import { eq, and, sql } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parseResult = studentBulkImportSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }

  const validData = parseResult.data;
  let institutionId = validData.institutionId;

  if (!institutionId) {
    institutionId = (session as any)?.institutionId || (session as any)?.institutionIds?.[0];
  }

  if (!institutionId || institutionId === "global") {
    return NextResponse.json({ error: "Explicit institutionId required" }, { status: 400 });
  }

  const rows = validData.rows;
  const errors: { row: number; error: string }[] = [];
  const inserted: { id: string; admissionNo: string; name: string }[] = [];
  const seenBatchAdmissionNos = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const normAdmissionNo = row.admissionNo.toLowerCase();

    // Check intra-batch duplicate
    if (seenBatchAdmissionNos.has(normAdmissionNo)) {
      errors.push({ row: rowNum, error: `Admission No '${row.admissionNo}' is duplicated within this import batch` });
      continue;
    }
    seenBatchAdmissionNos.add(normAdmissionNo);

    // Check duplicate admissionNo for this institution in DB
    const existing = await db
      .select({ id: students.id })
      .from(students)
      .where(
        and(
          eq(students.institutionId, institutionId),
          sql`lower(${students.admissionNo}) = lower(${row.admissionNo})`
        )
      )
      .get();

    if (existing) {
      errors.push({ row: rowNum, error: `Admission No '${row.admissionNo}' already exists in this institution` });
      continue;
    }

    const studentId = `std_${crypto.randomUUID().slice(0, 10)}`;

    try {
      await db.insert(students).values({
        id: studentId,
        institutionId,
        admissionNo: row.admissionNo,
        firstName: row.firstName,
        lastName: row.lastName,
        gender: row.gender || null,
        dateOfBirth: row.dateOfBirth || null,
        phone: row.phone || null,
        email: row.email || null,
        bloodGroup: row.bloodGroup || null,
        address: row.address || null,
        classId: row.classId || null,
        academicYearId: row.academicYearId || null,
        isActive: true,
      }).run();

      // Create guardian if provided
      if (row.guardianName && row.guardianPhone) {
        const guardianId = `grd_${crypto.randomUUID().slice(0, 10)}`;
        await db.insert(guardians).values({
          id: guardianId,
          name: row.guardianName,
          phone: row.guardianPhone,
          relation: row.guardianRelation || "Parent",
          isPrimary: true,
        }).run();

        await db.insert(studentGuardians).values({
          id: `sg_${crypto.randomUUID().slice(0, 10)}`,
          studentId,
          guardianId,
          relationship: row.guardianRelation || "Parent",
          canPickup: true,
          isEmergencyContact: true,
        }).run();
      }

      inserted.push({
        id: studentId,
        admissionNo: row.admissionNo,
        name: `${row.firstName} ${row.lastName}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database insertion error";
      errors.push({ row: rowNum, error: msg });
    }
  }

  return NextResponse.json({
    totalRows: rows.length,
    successCount: inserted.length,
    failureCount: errors.length,
    inserted,
    errors,
  });
}, "students:create");
