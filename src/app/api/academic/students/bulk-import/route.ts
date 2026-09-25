import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, guardians, studentGuardians } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

interface StudentImportRow {
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  address?: string;
  classId?: string;
  academicYearId?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
}

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { institutionId, rows } = body as { institutionId: string; rows: StudentImportRow[] };

  if (!institutionId || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "institutionId and non-empty rows array are required" }, { status: 400 });
  }

  const errors: { row: number; error: string }[] = [];
  const inserted: { id: string; admissionNo: string; name: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    if (!row.admissionNo || !row.firstName || !row.lastName) {
      errors.push({ row: rowNum, error: "admissionNo, firstName, and lastName are required" });
      continue;
    }

    // Check duplicate admissionNo for this institution
    const existing = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.admissionNo, row.admissionNo))
      .get();

    if (existing) {
      errors.push({ row: rowNum, error: `Admission No '${row.admissionNo}' already exists in the system` });
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
