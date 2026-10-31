import { Suspense } from "react";
import { db } from "@/db";
import { students, classes } from "@/db/schema";
import { verifySession, resolveRequestInstitution } from "@thaiba/auth";
import { redirect } from "next/navigation";
import { eq, like, or, and, type SQL } from "drizzle-orm";
import { StudentsClient } from "./StudentsClient";
import StudentsLoading from "./loading";

export const dynamic = "force-dynamic";

interface StudentsPageProps {
  searchParams: Promise<{
    search?: string;
    classId?: string;
  }>;
}

async function StudentsData({
  search,
  classId,
}: {
  search: string;
  classId: string;
}) {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  const scopedInstId = await resolveRequestInstitution(session);

  const studentConditions: (SQL | undefined)[] = [eq(students.isActive, true)];
  if (scopedInstId && scopedInstId !== "global") {
    studentConditions.push(eq(students.institutionId, scopedInstId));
  }
  if (search) {
    studentConditions.push(
      or(
        like(students.firstName, `%${search}%`),
        like(students.lastName, `%${search}%`),
        like(students.admissionNo, `%${search}%`)
      )
    );
  }
  if (classId) {
    studentConditions.push(eq(students.classId, classId));
  }

  const classConditions: (SQL | undefined)[] = [eq(classes.isActive, true)];
  if (scopedInstId && scopedInstId !== "global") {
    classConditions.push(eq(classes.institutionId, scopedInstId));
  }

  const [studentRows, classRows] = await Promise.all([
    db
      .select({
        id: students.id,
        admissionNo: students.admissionNo,
        firstName: students.firstName,
        lastName: students.lastName,
        email: students.email,
        phone: students.phone,
        gender: students.gender,
        isActive: students.isActive,
        classId: students.classId,
        className: classes.name,
        classSection: classes.section,
      })
      .from(students)
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(and(...studentConditions))
      .all(),
    db
      .select({
        id: classes.id,
        name: classes.name,
        section: classes.section,
        institutionId: classes.institutionId,
      })
      .from(classes)
      .where(and(...classConditions))
      .all(),
  ]);

  const effectiveInstitutionId =
    scopedInstId && scopedInstId !== "global"
      ? scopedInstId
      : classRows[0]?.institutionId || "";

  return (
    <StudentsClient
      students={studentRows}
      classes={classRows}
      institutionId={effectiveInstitutionId}
      initialSearch={search}
      initialClassFilter={classId}
    />
  );
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams.search || "";
  const classId = resolvedSearchParams.classId || "";

  return (
    <Suspense key={`${search}-${classId}`} fallback={<StudentsLoading />}>
      <StudentsData search={search} classId={classId} />
    </Suspense>
  );
}
