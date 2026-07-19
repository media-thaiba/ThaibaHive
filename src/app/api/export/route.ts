import { NextResponse } from "next/server";
import { db } from "@/db/index";
import {
  attendanceLogs,
  staff,
  staffDepartments,
  departments,
  staffInstitutions,
  institutions,
  leaveRequests,
  leaveTypes,
  financialTransactions,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";

function esc(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(values: unknown[]): string {
  return values.map(esc).join(",") + "\n";
}

function getDateParam(searchParams: URLSearchParams, key: string): string | undefined {
  const v = searchParams.get(key);
  if (!v) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  return v;
}

function getInstitutionParam(searchParams: URLSearchParams): string | undefined {
  const v = searchParams.get("institutionId");
  return v || undefined;
}

function getWeekdays(from: string, to: string): number {
  let count = 0;
  const d = new Date(from);
  const end = new Date(to);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export const GET = requireAuth(async (request: Request, session) => {
  if (session.role !== "super_admin" && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const dateFrom = getDateParam(searchParams, "dateFrom");
  const dateTo = getDateParam(searchParams, "dateTo");
  const institutionId = getInstitutionParam(searchParams);

  if (!type || !["attendance", "leaves", "staff", "payroll", "accounts"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  let csv = "";
  const filename = `thaibahive_${type}_${new Date().toISOString().split("T")[0]}.csv`;

  if (type === "attendance") {
    csv += csvRow(["Employee ID", "Name", "Department", "Date", "Check In", "Check Out", "Status", "Hours Worked"]);
    let query = db
      .select({
        employeeId: staff.employeeId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        departmentName: departments.name,
        date: attendanceLogs.date,
        checkIn: attendanceLogs.checkIn,
        checkOut: attendanceLogs.checkOut,
        status: attendanceLogs.status,
        workedMinutes: attendanceLogs.workedMinutes,
      })
      .from(attendanceLogs)
      .innerJoin(staff, eq(attendanceLogs.staffId, staff.id))
      .leftJoin(staffDepartments, eq(staff.id, staffDepartments.staffId))
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id));

    const conditions: any[] = [];
    if (dateFrom) conditions.push(gte(attendanceLogs.date, dateFrom));
    if (dateTo) conditions.push(lte(attendanceLogs.date, dateTo));
    if (institutionId) {
      const staffIds = await db
        .select({ id: staffInstitutions.staffId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.institutionId, institutionId));
      if (staffIds.length > 0) {
        conditions.push(inArray(attendanceLogs.staffId, staffIds.map((s: any) => s.id)));
      } else {
        conditions.push(eq(attendanceLogs.staffId, "__no_match__"));
      }
    }
    if (conditions.length > 0) query = query.where(and(...conditions) as any) as any;
    const rows = await query;
    for (const r of rows) {
      const hrs = r.workedMinutes != null ? `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m` : "";
      csv += csvRow([r.employeeId, `${r.firstName} ${r.lastName}`, r.departmentName || "", r.date, r.checkIn || "", r.checkOut || "", r.status, hrs]);
    }
  }

  if (type === "leaves") {
    csv += csvRow(["Employee ID", "Name", "Leave Type", "Start Date", "End Date", "Days", "Status", "Reason"]);
    let query = db
      .select({
        employeeId: staff.employeeId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        leaveTypeName: leaveTypes.name,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        daysCount: leaveRequests.daysCount,
        status: leaveRequests.status,
        reason: leaveRequests.reason,
      })
      .from(leaveRequests)
      .innerJoin(staff, eq(leaveRequests.staffId, staff.id))
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id));

    const conditions: any[] = [];
    if (dateFrom) conditions.push(gte(leaveRequests.startDate, dateFrom));
    if (dateTo) conditions.push(lte(leaveRequests.endDate, dateTo));
    if (institutionId) {
      const staffIds = await db
        .select({ id: staffInstitutions.staffId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.institutionId, institutionId));
      if (staffIds.length > 0) {
        conditions.push(inArray(leaveRequests.staffId, staffIds.map((s: any) => s.id)));
      } else {
        conditions.push(eq(leaveRequests.staffId, "__no_match__"));
      }
    }
    if (conditions.length > 0) query = query.where(and(...conditions) as any) as any;
    const rows = await query;
    for (const r of rows) {
      csv += csvRow([r.employeeId, `${r.firstName} ${r.lastName}`, r.leaveTypeName, r.startDate, r.endDate, r.daysCount, r.status, r.reason || ""]);
    }
  }

  if (type === "staff") {
    csv += csvRow(["Employee ID", "Name", "Email", "Phone", "Designation", "Department", "Institution", "Role", "Date of Joining", "Status"]);
    let query = db
      .select({
        id: staff.id,
        employeeId: staff.employeeId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        phone: staff.phone,
        designation: staff.designation,
        role: staff.role,
        dateOfJoining: staff.dateOfJoining,
        isActive: staff.isActive,
      })
      .from(staff);

    if (institutionId) {
      query = query
        .innerJoin(staffInstitutions, eq(staff.id, staffInstitutions.staffId))
        .where(eq(staffInstitutions.institutionId, institutionId)) as any;
    }

    const rows = await query;
    const staffIds = rows.map((r: any) => r.id);

    if (staffIds.length > 0) {
      const allDepts = await db
        .select({
          staffId: staffDepartments.staffId,
          deptName: departments.name,
        })
        .from(staffDepartments)
        .innerJoin(departments, eq(staffDepartments.departmentId, departments.id))
        .where(inArray(staffDepartments.staffId, staffIds));

      const allInsts = await db
        .select({
          staffId: staffInstitutions.staffId,
          instName: institutions.name,
        })
        .from(staffInstitutions)
        .innerJoin(institutions, eq(staffInstitutions.institutionId, institutions.id))
        .where(inArray(staffInstitutions.staffId, staffIds));

      const deptMap: Record<string, string[]> = {};
      for (const d of allDepts) {
        if (!deptMap[d.staffId]) deptMap[d.staffId] = [];
        deptMap[d.staffId].push(d.deptName);
      }

      const instMap: Record<string, string[]> = {};
      for (const i of allInsts) {
        if (!instMap[i.staffId]) instMap[i.staffId] = [];
        instMap[i.staffId].push(i.instName);
      }

      for (const r of rows) {
        const depts = (deptMap[r.id] || []).join("; ");
        const insts = (instMap[r.id] || []).join("; ");
        csv += csvRow([
          r.employeeId,
          `${r.firstName} ${r.lastName}`,
          r.email,
          r.phone || "",
          r.designation || "",
          depts,
          insts,
          r.role,
          r.dateOfJoining || "",
          r.isActive ? "Active" : "Inactive",
        ]);
      }
    }
  }

  if (type === "payroll") {
    csv += csvRow(["Employee ID", "Name", "Designation", "Department", "Total Working Days", "Days Present", "Days Absent", "Late Arrivals", "Early Departures", "Leave Days", "Leave Breakdown", "Net Payable Days"]);
    let staffQuery = db
      .selectDistinct({
        id: staff.id,
        employeeId: staff.employeeId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        designation: staff.designation,
        departmentName: departments.name,
      })
      .from(staff)
      .leftJoin(staffDepartments, eq(staff.id, staffDepartments.staffId))
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id));

    const staffConditions: any[] = [];
    if (institutionId) {
      staffQuery = staffQuery
        .innerJoin(staffInstitutions, eq(staff.id, staffInstitutions.staffId))
        .where(eq(staffInstitutions.institutionId, institutionId)) as any;
    }
    const allStaff = await staffQuery;
    const rangeStart = dateFrom || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const rangeEnd = dateTo || new Date().toISOString().split("T")[0];
    const totalWorkingDays = getWeekdays(rangeStart, rangeEnd);
    const staffIds = allStaff.map((s: any) => s.id);

    const attendanceRows = await db
      .select({
        staffId: attendanceLogs.staffId,
        status: attendanceLogs.status,
        earlyExitMinutes: attendanceLogs.earlyExitMinutes,
      })
      .from(attendanceLogs)
      .where(
        and(
          inArray(attendanceLogs.staffId, staffIds),
          gte(attendanceLogs.date, rangeStart),
          lte(attendanceLogs.date, rangeEnd)
        )
      );

    const leaveRows = await db
      .select({
        staffId: leaveRequests.staffId,
        leaveTypeName: leaveTypes.name,
        daysCount: leaveRequests.daysCount,
        status: leaveRequests.status,
      })
      .from(leaveRequests)
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .where(
        and(
          inArray(leaveRequests.staffId, staffIds),
          gte(leaveRequests.startDate, rangeStart),
          lte(leaveRequests.endDate, rangeEnd)
        )
      );

    const attendanceByStaff: Record<string, { present: number; late: number; absent: number; earlyDepartures: number; statuses: string[] }> = {};
    for (const r of attendanceRows) {
      if (!attendanceByStaff[r.staffId]) {
        attendanceByStaff[r.staffId] = { present: 0, late: 0, absent: 0, earlyDepartures: 0, statuses: [] };
      }
      const s = r.status;
      attendanceByStaff[r.staffId].statuses.push(s);
      if (s === "present") attendanceByStaff[r.staffId].present++;
      else if (s === "late") attendanceByStaff[r.staffId].late++;
      else if (s === "absent") attendanceByStaff[r.staffId].absent++;
      if ((r.earlyExitMinutes || 0) > 0) attendanceByStaff[r.staffId].earlyDepartures++;
    }

    const leaveByStaff: Record<string, { total: number; breakdown: string }> = {};
    for (const r of leaveRows) {
      if (r.status !== "approved") continue;
      if (!leaveByStaff[r.staffId]) leaveByStaff[r.staffId] = { total: 0, breakdown: "" };
      leaveByStaff[r.staffId].total += r.daysCount;
      const entry = `${r.leaveTypeName}: ${r.daysCount}`;
      leaveByStaff[r.staffId].breakdown = leaveByStaff[r.staffId].breakdown
        ? `${leaveByStaff[r.staffId].breakdown}; ${entry}`
        : entry;
    }

    for (const s of allStaff) {
      const a = attendanceByStaff[s.id] || { present: 0, late: 0, absent: 0, earlyDepartures: 0, statuses: [] };
      const l = leaveByStaff[s.id] || { total: 0, breakdown: "" };
      const daysPresent = a.present;
      const lateArrivals = a.late;
      const earlyDepartures = a.earlyDepartures;
      const daysOnRecord = a.statuses.length;
      const daysAbsent = Math.max(0, totalWorkingDays - daysOnRecord);
      const paidLeave = l.total;
      const netPayable = daysPresent + paidLeave;
      csv += csvRow([s.employeeId, `${s.firstName} ${s.lastName}`, s.designation || "", s.departmentName || "", totalWorkingDays, daysPresent, daysAbsent, lateArrivals, earlyDepartures, l.total, l.breakdown, netPayable]);
    }
  }

  if (type === "accounts") {
    csv += csvRow(["Date", "Type", "Category", "Amount", "Description", "Institution", "Recorded By", "Notes"]);
    let query = db
      .select({
        id: financialTransactions.id,
        type: financialTransactions.type,
        category: financialTransactions.category,
        amount: financialTransactions.amount,
        description: financialTransactions.description,
        transactionDate: financialTransactions.transactionDate,
        recordedByName: staff.firstName,
        recordedByLastName: staff.lastName,
        institutionName: institutions.name,
        notes: financialTransactions.notes,
      })
      .from(financialTransactions)
      .leftJoin(staff, eq(financialTransactions.recordedById, staff.id))
      .leftJoin(institutions, eq(financialTransactions.institutionId, institutions.id));

    const conditions: any[] = [];
    if (dateFrom) conditions.push(gte(financialTransactions.transactionDate, dateFrom));
    if (dateTo) conditions.push(lte(financialTransactions.transactionDate, dateTo));
    if (institutionId) conditions.push(eq(financialTransactions.institutionId, institutionId));
    if (conditions.length > 0) query = query.where(and(...conditions) as any) as any;
    const rows = await query;
    for (const r of rows) {
      csv += csvRow([
        r.transactionDate,
        r.type,
        r.category,
        r.amount,
        r.description || "",
        r.institutionName || "",
        `${r.recordedByName || ""} ${r.recordedByLastName || ""}`,
        r.notes || "",
      ]);
    }
  }

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}, "finance:export");
