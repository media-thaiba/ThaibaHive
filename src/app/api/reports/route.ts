import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, dailyReportTasks, staff, departments, staffDepartments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc, inArray } from "drizzle-orm";
import type { StaffRole } from "@/types";

export const GET = requireAuth(async (request, session) => {
  const { role, staffId } = session;
  let reports: any[] = [];

  if (role === "super_admin" || role === "admin" || role === "principal") {
    // Admin/Principal: Retrieve all daily work reports
    reports = await db
      .select({
        id: dailyReports.id,
        date: dailyReports.date,
        summary: dailyReports.summary,
        status: dailyReports.status,
        staffId: dailyReports.staffId,
        firstName: staff.firstName,
        lastName: staff.lastName,
      })
      .from(dailyReports)
      .leftJoin(staff, eq(dailyReports.staffId, staff.id))
      .orderBy(desc(dailyReports.date))
      .limit(100)
      .all();
  } else if (role === "hod") {
    // HOD: Retrieve reports of staff members in their departments
    const userDepts = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.headUserId, staffId))
      .all();
    
    if (userDepts.length > 0) {
      const deptStaff = await db
        .select({ staffId: staffDepartments.staffId })
        .from(staffDepartments)
        .where(inArray(staffDepartments.departmentId, userDepts.map((d) => d.id)))
        .all();
      
      const staffIds = deptStaff.map((s) => s.staffId).filter(Boolean);
      
      if (staffIds.length > 0) {
        reports = await db
          .select({
            id: dailyReports.id,
            date: dailyReports.date,
            summary: dailyReports.summary,
            status: dailyReports.status,
            staffId: dailyReports.staffId,
            firstName: staff.firstName,
            lastName: staff.lastName,
          })
          .from(dailyReports)
          .leftJoin(staff, eq(dailyReports.staffId, staff.id))
          .where(inArray(dailyReports.staffId, staffIds))
          .orderBy(desc(dailyReports.date))
          .all();
      }
    }
  } else {
    // Standard Staff: Retrieve only their own reports
    reports = await db
      .select({
        id: dailyReports.id,
        date: dailyReports.date,
        summary: dailyReports.summary,
        status: dailyReports.status,
        staffId: dailyReports.staffId,
        firstName: staff.firstName,
        lastName: staff.lastName,
      })
      .from(dailyReports)
      .leftJoin(staff, eq(dailyReports.staffId, staff.id))
      .where(eq(dailyReports.staffId, staffId))
      .orderBy(desc(dailyReports.date))
      .limit(30)
      .all();
  }

  return NextResponse.json({ reports });
}, "reports:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { date, summary, tasks } = body;

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const report = await db
    .insert(dailyReports)
    .values({
      id: crypto.randomUUID(),
      staffId: session.staffId,
      date,
      summary,
      status: "submitted", // Set to submitted on submit
    })
    .returning()
    .get();

  if (tasks?.length) {
    await db
      .insert(dailyReportTasks)
      .values(
        tasks.map((t: { description: string; hoursSpent?: number; status?: string }) => ({
          id: crypto.randomUUID(),
          reportId: report.id,
          description: t.description,
          hoursSpent: t.hoursSpent || 0,
          status: t.status || "completed",
        }))
      )
      .run();
  }

  return NextResponse.json({ report }, { status: 201 });
}, "reports:create");