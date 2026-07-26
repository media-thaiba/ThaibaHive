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
  assets,
  expenseClaims,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, gte, lte, inArray, type SQL } from "drizzle-orm";

const MAX_EXPORT_ROWS = 5000;

function esc(val: unknown): string {
  if (val === null || val === undefined) return "";
  let s = String(val);

  // Prevent CSV Formula Injection in Excel/LibreOffice if value starts with =, +, -, @, \t, \r
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }

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
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const dateFrom = getDateParam(searchParams, "dateFrom");
  const dateTo = getDateParam(searchParams, "dateTo");
  const requestedInstitutionId = getInstitutionParam(searchParams);

  const VALID_TYPES = ["attendance", "leaves", "staff", "payroll", "accounts", "assets", "expenses"];
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const isSystemAdmin = session.role === "super_admin" || session.role === "admin";
  let allowedInstIds: string[] = [];

  if (!isSystemAdmin) {
    const callerInsts = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .all();
    allowedInstIds = callerInsts.map((i) => i.institutionId).filter(Boolean);

    if (allowedInstIds.length === 0) {
      return NextResponse.json({ error: "Forbidden: No institution assigned" }, { status: 403 });
    }

    if (requestedInstitutionId && !allowedInstIds.includes(requestedInstitutionId)) {
      return NextResponse.json({ error: "Forbidden: Cannot export this institution's data" }, { status: 403 });
    }
  }

  const finalInstitutionId = requestedInstitutionId;
  let _staffIds: string[] | undefined = undefined;

  // Resolve staffIds for tenant scope
  if (finalInstitutionId) {
    try {
      const staffInsts = await db
        .select({ staffId: staffInstitutions.staffId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.institutionId, finalInstitutionId))
        .all();
      _staffIds = staffInsts.map((s) => s.staffId);
    } catch (error) {
      console.error("Failed to query institution staff:", error);
      return NextResponse.json({ error: "Failed to fetch institution details" }, { status: 500 });
    }
  }

  // Prepend UTF-8 Byte Order Mark (\uFEFF) for Excel UTF-8 compatibility
  let csv = "\uFEFF";
  const filename = `${type}-export-${new Date().toISOString().split("T")[0]}.csv`;

  // ── 1. Attendance Export ───────────────────────────────────────────────────
  if (type === "attendance") {
    csv += csvRow([
      "Date",
      "Employee ID",
      "Employee Name",
      "Institution",
      "Department",
      "Status",
      "Check In",
      "Check Out",
      "Duration (Hours)",
      "Late Arrival",
      "Early Departure",
    ]);

    let query = db
      .select({
        logDate: attendanceLogs.date,
        checkInTime: attendanceLogs.checkIn,
        checkOutTime: attendanceLogs.checkOut,
        status: attendanceLogs.status,
        durationMinutes: attendanceLogs.workedMinutes,
        lateMinutes: attendanceLogs.lateMinutes,
        earlyExitMinutes: attendanceLogs.earlyExitMinutes,
        employeeId: staff.employeeId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        deptName: departments.name,
        instName: institutions.name,
        staffId: staff.id,
      })
      .from(attendanceLogs)
      .leftJoin(staff, eq(attendanceLogs.staffId, staff.id))
      .leftJoin(staffDepartments, eq(staff.id, staffDepartments.staffId))
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(staffInstitutions, eq(staff.id, staffInstitutions.staffId))
      .leftJoin(institutions, eq(staffInstitutions.institutionId, institutions.id));

    const conditions: (SQL | undefined)[] = [];
    if (dateFrom) conditions.push(gte(attendanceLogs.date, dateFrom));
    if (dateTo) conditions.push(lte(attendanceLogs.date, dateTo));

    if (finalInstitutionId) {
      conditions.push(eq(staffInstitutions.institutionId, finalInstitutionId));
    } else if (!isSystemAdmin) {
      conditions.push(inArray(staffInstitutions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await query.limit(MAX_EXPORT_ROWS).all();
    for (const r of rows) {
      const durationHours = r.durationMinutes ? (r.durationMinutes / 60).toFixed(2) : "0.00";
      csv += csvRow([
        r.logDate,
        r.employeeId || "",
        `${r.firstName || ""} ${r.lastName || ""}`.trim(),
        r.instName || "",
        r.deptName || "",
        r.status || "",
        r.checkInTime || "",
        r.checkOutTime || "",
        durationHours,
        r.lateMinutes && r.lateMinutes > 0 ? "Yes" : "No",
        r.earlyExitMinutes && r.earlyExitMinutes > 0 ? "Yes" : "No",
      ]);
    }
  }

  // ── 2. Leaves Export ───────────────────────────────────────────────────────
  if (type === "leaves") {
    csv += csvRow([
      "Leave ID",
      "Employee ID",
      "Employee Name",
      "Institution",
      "Department",
      "Leave Type",
      "Start Date",
      "End Date",
      "Days Count",
      "Status",
      "Reason",
      "Reviewed By",
      "Reviewed Date",
    ]);

    let query = db
      .select({
        id: leaveRequests.id,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        daysCount: leaveRequests.daysCount,
        status: leaveRequests.status,
        reason: leaveRequests.reason,
        reviewedAt: leaveRequests.reviewedAt,
        employeeId: staff.employeeId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        leaveTypeName: leaveTypes.name,
        instName: institutions.name,
        deptName: departments.name,
      })
      .from(leaveRequests)
      .leftJoin(staff, eq(leaveRequests.staffId, staff.id))
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .leftJoin(staffInstitutions, eq(staff.id, staffInstitutions.staffId))
      .leftJoin(institutions, eq(staffInstitutions.institutionId, institutions.id))
      .leftJoin(staffDepartments, eq(staff.id, staffDepartments.staffId))
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id));

    const conditions: (SQL | undefined)[] = [];
    if (dateFrom) conditions.push(gte(leaveRequests.startDate, dateFrom));
    if (dateTo) conditions.push(lte(leaveRequests.endDate, dateTo));

    if (finalInstitutionId) {
      conditions.push(eq(staffInstitutions.institutionId, finalInstitutionId));
    } else if (!isSystemAdmin) {
      conditions.push(inArray(staffInstitutions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await query.limit(MAX_EXPORT_ROWS).all();
    for (const r of rows) {
      csv += csvRow([
        r.id,
        r.employeeId || "",
        `${r.firstName || ""} ${r.lastName || ""}`.trim(),
        r.instName || "",
        r.deptName || "",
        r.leaveTypeName || "",
        r.startDate,
        r.endDate,
        r.daysCount,
        r.status,
        r.reason || "",
        "",
        r.reviewedAt ? r.reviewedAt.slice(0, 10) : "",
      ]);
    }
  }

  // ── 3. Staff Export ────────────────────────────────────────────────────────
  if (type === "staff") {
    csv += csvRow(["Employee ID", "First Name", "Last Name", "Email", "Phone", "Role", "Designation", "Institution", "Department"]);

    let query = db
      .select({
        employeeId: staff.employeeId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        designation: staff.designation,
        instName: institutions.name,
        deptName: departments.name,
      })
      .from(staff)
      .leftJoin(staffInstitutions, eq(staff.id, staffInstitutions.staffId))
      .leftJoin(institutions, eq(staffInstitutions.institutionId, institutions.id))
      .leftJoin(staffDepartments, eq(staff.id, staffDepartments.staffId))
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id));

    const conditions: (SQL | undefined)[] = [];
    if (finalInstitutionId) {
      conditions.push(eq(staffInstitutions.institutionId, finalInstitutionId));
    } else if (!isSystemAdmin) {
      conditions.push(inArray(staffInstitutions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await query.limit(MAX_EXPORT_ROWS).all();
    for (const r of rows) {
      csv += csvRow([
        r.employeeId,
        r.firstName,
        r.lastName,
        r.email,
        r.phone || "",
        r.role,
        r.designation || "",
        r.instName || "",
        r.deptName || "",
      ]);
    }
  }

  // ── 4. Payroll Summary Export ──────────────────────────────────────────────
  if (type === "payroll") {
    csv += csvRow([
      "Employee ID",
      "Employee Name",
      "Designation",
      "Department",
      "Working Days",
      "Days Present",
      "Days Absent",
      "Late Arrivals",
      "Early Departures",
      "Paid Leave Days",
      "Leave Breakdown",
      "Net Payable Days",
    ]);

    const calcFrom = dateFrom || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
    const calcTo = dateTo || new Date().toISOString().split("T")[0];
    const totalWorkingDays = getWeekdays(calcFrom, calcTo);

    let query = db
      .select({
        id: staff.id,
        employeeId: staff.employeeId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        designation: staff.designation,
        departmentName: departments.name,
      })
      .from(staff)
      .leftJoin(staffDepartments, eq(staff.id, staffDepartments.staffId))
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(staffInstitutions, eq(staff.id, staffInstitutions.staffId));

    const conditions: (SQL | undefined)[] = [];
    if (finalInstitutionId) {
      conditions.push(eq(staffInstitutions.institutionId, finalInstitutionId));
    } else if (!isSystemAdmin) {
      conditions.push(inArray(staffInstitutions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const staffRows = await query.limit(MAX_EXPORT_ROWS).all();

    for (const s of staffRows) {
      const logs = await db
        .select({
          status: attendanceLogs.status,
          lateMinutes: attendanceLogs.lateMinutes,
          earlyExitMinutes: attendanceLogs.earlyExitMinutes,
        })
        .from(attendanceLogs)
        .where(
          and(
            eq(attendanceLogs.staffId, s.id),
            gte(attendanceLogs.date, calcFrom),
            lte(attendanceLogs.date, calcTo)
          )
        )
        .all();

      const daysPresent = logs.filter((l) => l.status === "present" || l.status === "half_day").length;
      const lateArrivals = logs.filter((l) => (l.lateMinutes ?? 0) > 0).length;
      const earlyDepartures = logs.filter((l) => (l.earlyExitMinutes ?? 0) > 0).length;
      const daysOnRecord = logs.length;
      const daysAbsent = Math.max(0, totalWorkingDays - daysOnRecord);
      const paidLeave = 0;
      const netPayable = daysPresent + paidLeave;

      csv += csvRow([
        s.employeeId,
        `${s.firstName} ${s.lastName}`.trim(),
        s.designation || "",
        s.departmentName || "",
        totalWorkingDays,
        daysPresent,
        daysAbsent,
        lateArrivals,
        earlyDepartures,
        paidLeave,
        "",
        netPayable,
      ]);
    }
  }

  // ── 5. Accounts Export ─────────────────────────────────────────────────────
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

    const conditions: (SQL | undefined)[] = [];
    if (dateFrom) conditions.push(gte(financialTransactions.transactionDate, dateFrom));
    if (dateTo) conditions.push(lte(financialTransactions.transactionDate, dateTo));

    if (finalInstitutionId) {
      conditions.push(eq(financialTransactions.institutionId, finalInstitutionId));
    } else if (!isSystemAdmin) {
      conditions.push(inArray(financialTransactions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await query.limit(MAX_EXPORT_ROWS).all();
    for (const r of rows) {
      csv += csvRow([
        r.transactionDate,
        r.type,
        r.category,
        r.amount ? r.amount.toFixed(2) : "0.00",
        r.description || "",
        r.institutionName || "",
        `${r.recordedByName || ""} ${r.recordedByLastName || ""}`.trim(),
        r.notes || "",
      ]);
    }
  }

  // ── 6. Assets Export ───────────────────────────────────────────────────────
  if (type === "assets") {
    csv += csvRow([
      "Asset Tag",
      "Name",
      "Type",
      "Model",
      "Serial Number",
      "Institution",
      "Location",
      "Status",
      "Purchase Date",
      "Purchase Cost",
      "Assigned To",
      "Notes",
    ]);

    let query = db
      .select({
        id: assets.id,
        name: assets.name,
        type: assets.type,
        model: assets.model,
        serialNumber: assets.serialNumber,
        location: assets.location,
        status: assets.status,
        purchaseDate: assets.purchaseDate,
        purchaseCost: assets.purchaseCost,
        notes: assets.notes,
        instName: institutions.name,
        assignedFirstName: staff.firstName,
        assignedLastName: staff.lastName,
      })
      .from(assets)
      .leftJoin(institutions, eq(assets.institutionId, institutions.id))
      .leftJoin(staff, eq(assets.assignedToId, staff.id));

    const conditions: (SQL | undefined)[] = [];
    if (dateFrom && assets.purchaseDate) conditions.push(gte(assets.purchaseDate, dateFrom));
    if (dateTo && assets.purchaseDate) conditions.push(lte(assets.purchaseDate, dateTo));

    if (finalInstitutionId) {
      conditions.push(eq(assets.institutionId, finalInstitutionId));
    } else if (!isSystemAdmin) {
      conditions.push(inArray(assets.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await query.limit(MAX_EXPORT_ROWS).all();

    for (const r of rows) {
      csv += csvRow([
        r.id,
        r.name,
        r.type,
        r.model || "",
        r.serialNumber || "",
        r.instName || "",
        r.location || "",
        r.status,
        r.purchaseDate ? r.purchaseDate.slice(0, 10) : "",
        r.purchaseCost !== null && r.purchaseCost !== undefined ? r.purchaseCost.toFixed(2) : "0.00",
        `${r.assignedFirstName || ""} ${r.assignedLastName || ""}`.trim(),
        r.notes || "",
      ]);
    }
  }

  // ── 7. Expenses Export ─────────────────────────────────────────────────────
  if (type === "expenses") {
    csv += csvRow([
      "Claim ID",
      "Employee ID",
      "Employee Name",
      "Institution",
      "Category",
      "Description",
      "Amount",
      "Status",
      "Submitted Date",
      "Reviewed Date",
      "Reviewer Notes",
    ]);

    let query = db
      .select({
        id: expenseClaims.id,
        amount: expenseClaims.amount,
        category: expenseClaims.category,
        description: expenseClaims.description,
        status: expenseClaims.status,
        reviewedAt: expenseClaims.reviewedAt,
        reviewNotes: expenseClaims.reviewNotes,
        createdAt: expenseClaims.createdAt,
        employeeId: staff.employeeId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        instName: institutions.name,
      })
      .from(expenseClaims)
      .leftJoin(staff, eq(expenseClaims.staffId, staff.id))
      .leftJoin(staffInstitutions, eq(staff.id, staffInstitutions.staffId))
      .leftJoin(institutions, eq(staffInstitutions.institutionId, institutions.id));

    const conditions: (SQL | undefined)[] = [];
    if (dateFrom) conditions.push(gte(expenseClaims.createdAt, dateFrom));
    if (dateTo) conditions.push(lte(expenseClaims.createdAt, dateTo));

    if (finalInstitutionId) {
      conditions.push(eq(staffInstitutions.institutionId, finalInstitutionId));
    } else if (!isSystemAdmin) {
      conditions.push(inArray(staffInstitutions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await query.limit(MAX_EXPORT_ROWS).all();

    for (const r of rows) {
      csv += csvRow([
        r.id,
        r.employeeId || "",
        `${r.firstName || ""} ${r.lastName || ""}`.trim(),
        r.instName || "",
        r.category,
        r.description,
        r.amount ? r.amount.toFixed(2) : "0.00",
        r.status,
        r.createdAt ? r.createdAt.slice(0, 10) : "",
        r.reviewedAt ? r.reviewedAt.slice(0, 10) : "",
        r.reviewNotes || "",
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
