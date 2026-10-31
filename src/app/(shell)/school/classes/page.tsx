import { Suspense } from "react";
import { db } from "@/db";
import { classes, academicYears, staff } from "@/db/schema";
import { verifySession, resolveRequestInstitution } from "@thaiba/auth";
import { redirect } from "next/navigation";
import { eq, like, and, type SQL } from "drizzle-orm";
import { ClassesClient, type ClassItem } from "./ClassesClient";
import StudentsLoading from "../students/loading";

export const dynamic = "force-dynamic";

interface ClassesPageProps {
  searchParams: Promise<{
    search?: string;
  }>;
}

async function ClassesData({ search }: { search: string }) {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  const scopedInstId = await resolveRequestInstitution(session);

  const conditions = [eq(classes.isActive, true)];
  if (search) {
    conditions.push(like(classes.name, `%${search}%`));
  }
  if (scopedInstId && scopedInstId !== "global") {
    conditions.push(eq(classes.institutionId, scopedInstId));
  }

  const rows = await db
    .select({
      id: classes.id,
      name: classes.name,
      section: classes.section,
      teacherName: staff.firstName,
      academicYearName: academicYears.name,
    })
    .from(classes)
    .leftJoin(staff, eq(classes.teacherId, staff.id))
    .leftJoin(academicYears, eq(classes.academicYearId, academicYears.id))
    .where(and(...conditions))
    .all();

  const classItems: ClassItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    section: r.section,
    teacherName: r.teacherName ?? null,
    academicYearName: r.academicYearName ?? null,
  }));

  return <ClassesClient classes={classItems} initialSearch={search} />;
}

export default async function ClassesPage({ searchParams }: ClassesPageProps) {
  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams.search || "";

  return (
    <Suspense key={search} fallback={<StudentsLoading />}>
      <ClassesData search={search} />
    </Suspense>
  );
}
