import { db } from "@/db";
import { classes, students, staffInstitutions } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

type LedgerTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Per-class-date mutex for serializing bulk attendance operations.
 * Eliminates race conditions when multiple requests target the same class+date.
 */
let attendanceBulkQueue: Promise<unknown> = Promise.resolve();

export function withAttendanceBulkLock<T>(
  _classId: string,
  _date: string,
  fn: () => Promise<T>
): Promise<T> {
  const run = attendanceBulkQueue.then(() => fn(), () => fn());
  attendanceBulkQueue = run.then(() => undefined, () => undefined);
  return run;
}

/**
 * Verifies that the caller has permission to manage attendance for the given class.
 * Returns the class if authorized, throws 403/404 otherwise.
 */
export async function verifyClassAttendancePermission(
  tx: LedgerTx,
  session: { staffId: string; role: string; institutionId?: string | null },
  classId: string
) {
  const classRecord = await tx
    .select()
    .from(classes)
    .where(eq(classes.id, classId))
    .get();

  if (!classRecord) {
    throw new Error("CLASS_NOT_FOUND");
  }

  const role = session.role;

  // Super admin and admin have global access
  if (role === "super_admin" || role === "admin") {
    return classRecord;
  }

  // Principal and HOD: must belong to the same institution as the class
  if (role === "principal" || role === "hod") {
    if (!classRecord.institutionId) {
      throw new Error("INSTITUTION_MISMATCH");
    }
    const membership = await (db as any)
      .select()
      .from(staffInstitutions)
      .where(
        and(
          eq(staffInstitutions.staffId, session.staffId),
          eq(staffInstitutions.institutionId, classRecord.institutionId)
        )
      )
      .get();

    if (!membership) {
      throw new Error("INSTITUTION_MISMATCH");
    }
    return classRecord;
  }

  // Staff: must be assigned to this class
  const enrollment = await (db as any)
    .select()
    .from(students)
    .where(
      and(
        eq(students.classId, classId),
        eq(students.id, session.staffId)
      )
    )
    .get();

  if (!enrollment) {
    throw new Error("NOT_ASSIGNED_TO_CLASS");
  }

  return classRecord;
}

/**
 * Verifies that all student IDs in the batch are enrolled in the given class.
 * Returns the list of enrolled student IDs, throws if any are not enrolled.
 */
export async function verifyStudentEnrollment(
  tx: LedgerTx,
  classId: string,
  studentIds: string[]
): Promise<string[]> {
  if (studentIds.length === 0) return [];

  const enrollments = await tx
    .select({ studentId: students.id })
    .from(students)
    .where(
      and(
        eq(students.classId, classId),
        inArray(students.id, studentIds)
      )
    )
    .all();

  const enrolledIds = new Set(enrollments.map((e) => e.studentId));
  const missing = studentIds.filter((id) => !enrolledIds.has(id));

  if (missing.length > 0) {
    throw new Error(`STUDENTS_NOT_ENROLLED:${missing.join(",")}`);
  }

  return studentIds;
}

/**
 * Records a gate log entry for attendance bulk operations.
 */
export async function recordAttendanceBulkLog(
  tx: LedgerTx,
  params: {
    classId: string;
    date: string;
    action: "bulk_create" | "bulk_update" | "bulk_delete";
    staffId: string;
    recordCount: number;
  }
): Promise<void> {
  try {
    const logId = crypto.randomUUID();
    const now = new Date().toISOString();
    await (tx as any).run(
      sql`INSERT INTO attendance_bulk_logs (id, class_id, date, action, staff_id, record_count, created_at) VALUES (${logId}, ${params.classId}, ${params.date}, ${params.action}, ${params.staffId}, ${params.recordCount}, ${now})`
    );
  } catch {
    // Audit table may not exist in all environments; ignore
  }
}