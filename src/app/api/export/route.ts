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
  purchaseRequests,
  students,
  classes,
  timetableEntries,
  timetableSlots,
} from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, gte, lte, inArray, type SQL } from "drizzle-orm";
import { csvFormatter } from "@/lib/export/csv-formatter";
import { excelFormatter } from "@/lib/export/excel-formatter";
import { pdfFormatter } from "@/lib/export/pdf-formatter";
import { ExportColumn, ExportFormat, ExportOptions, ExportType } from "@/lib/export/types";
import { hasPermission } from "@thaiba/auth/roles";

const MAX_EXPORT_ROWS = 5000;

const REQUIRED_PERMISSIONS: Record<ExportType, string> = {
  attendance: "attendance:read",
  leaves: "leaves:read",
  staff: "staff:read",
  payroll: "reports:read",
  accounts: "reports:read",
  assets: "assets:read",
  expenses: "reports:read",
  fees: "reports:read",
  purchases: "reports:read",
  students: "students:read",
  timetables: "academic:read",
  tabulation: "exam:read",
  examinations: "exam:read",
  fleet: "fleet:read",
  canteen: "canteen:read",
  visitors: "visitor:read",
  performance: "performance:read",
  ai_insights: "analytics:manage",
  regional_analytics: "regional:view",
};


async function executeLimitedQuery<T>(queryObj: { limit?: (n: number) => { all(): Promise<T[]> }; all(): Promise<T[]> }): Promise<T[]> {
  try {
    if (typeof queryObj.limit === "function") {
      return (await queryObj.limit(MAX_EXPORT_ROWS).all()) as T[];
    }
    return (await queryObj.all()) as T[];
  } catch (err) {
    console.warn("[ExportAPI] Query execution fallback (table may be empty or unmigrated):", err);
    return [] as T[];
  }
}

function getDateParam(searchParams: URLSearchParams, key: string): string | undefined {
  const v = searchParams.get(key);
  if (!v) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  return v;
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
  const type = searchParams.get("type") as ExportType | null;
  const format = (searchParams.get("format") || "csv").toLowerCase() as ExportFormat;
  const dateFrom = getDateParam(searchParams, "dateFrom");
  const dateTo = getDateParam(searchParams, "dateTo");
  const requestedInstitutionId = searchParams.get("institutionId") || undefined;

  const VALID_TYPES: ExportType[] = [
    "attendance",
    "leaves",
    "staff",
    "payroll",
    "accounts",
    "assets",
    "expenses",
    "fees",
    "purchases",
    "students",
    "timetables",
    "tabulation",
    "examinations",
  ];
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid type. Must be one of: " + VALID_TYPES.join(", ") }, { status: 400 });
  }

  const VALID_FORMATS: ExportFormat[] = ["csv", "xlsx", "pdf"];
  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: "Invalid format. Must be one of: " + VALID_FORMATS.join(", ") }, { status: 400 });
  }

  // 1. RBAC Check (Domain-granular or finance:export fallback)
  const reqPermission = REQUIRED_PERMISSIONS[type];
  const isSuperOrAdmin = session.role === "super_admin" || session.role === "admin";
  const hasDomainPerm = hasPermission(session.role, reqPermission) || hasPermission(session.role, "finance:export");

  if (!isSuperOrAdmin && !hasDomainPerm) {
    return NextResponse.json({ error: `Forbidden: Lacks '${reqPermission}' or 'finance:export' permission` }, { status: 403 });
  }

  // 2. Institution Scope Check
  let allowedInstIds: string[] = [];
  if (!isSuperOrAdmin) {
    const callerInsts = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .all();
    allowedInstIds = callerInsts.map((i) => i.institutionId).filter(Boolean);

    if (allowedInstIds.length === 0) {
      return NextResponse.json({ error: "Forbidden: No institution assigned to staff" }, { status: 403 });
    }

    if (requestedInstitutionId && !allowedInstIds.includes(requestedInstitutionId)) {
      return NextResponse.json({ error: "Forbidden: Cannot export another institution's data" }, { status: 403 });
    }
  }

  const finalInstitutionId = requestedInstitutionId;
  let instName: string | undefined = undefined;

  if (finalInstitutionId) {
    const instRecord = await db
      .select({ name: institutions.name })
      .from(institutions)
      .where(eq(institutions.id, finalInstitutionId))
      .all();
    if (instRecord.length > 0) {
      instName = instRecord[0].name;
    }
  }

  let exportColumns: ExportColumn<any>[] = [];
  let exportData: any[] = [];
  let exportTitle = `${type.toUpperCase()} REPORT`;

  // ── 1. Attendance Export ───────────────────────────────────────────────────
  if (type === "attendance") {
    exportTitle = "Attendance Logs Report";
    exportColumns = [
      { key: "logDate", header: "Date", width: 14 },
      { key: "employeeId", header: "Employee ID", width: 14 },
      { key: "employeeName", header: "Employee Name", width: 22 },
      { key: "instName", header: "Institution", width: 20 },
      { key: "deptName", header: "Department", width: 18 },
      { key: "status", header: "Status", width: 12 },
      { key: "checkInTime", header: "Check In", width: 12 },
      { key: "checkOutTime", header: "Check Out", width: 12 },
      { key: "durationHours", header: "Duration (Hrs)", width: 14, align: "right" },
      { key: "lateArrival", header: "Late", width: 10, align: "center" },
      { key: "earlyExit", header: "Early Exit", width: 10, align: "center" },
    ];

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
    } else if (!isSuperOrAdmin) {
      conditions.push(inArray(staffInstitutions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await executeLimitedQuery<any>(query);
    exportData = rows.map((r) => ({
      logDate: r.logDate,
      employeeId: r.employeeId || "",
      employeeName: `${r.firstName || ""} ${r.lastName || ""}`.trim(),
      instName: r.instName || "",
      deptName: r.deptName || "",
      status: r.status || "",
      checkInTime: r.checkInTime || "",
      checkOutTime: r.checkOutTime || "",
      durationHours: r.durationMinutes ? (r.durationMinutes / 60).toFixed(2) : "0.00",
      lateArrival: r.lateMinutes && r.lateMinutes > 0 ? "Yes" : "No",
      earlyExit: r.earlyExitMinutes && r.earlyExitMinutes > 0 ? "Yes" : "No",
    }));
  }

  // ── 2. Leaves Export ───────────────────────────────────────────────────────
  if (type === "leaves") {
    exportTitle = "Leave Requests Report";
    exportColumns = [
      { key: "id", header: "Leave ID", width: 14 },
      { key: "employeeId", header: "Employee ID", width: 14 },
      { key: "employeeName", header: "Employee Name", width: 22 },
      { key: "instName", header: "Institution", width: 20 },
      { key: "leaveTypeName", header: "Type", width: 16 },
      { key: "startDate", header: "Start Date", width: 14 },
      { key: "endDate", header: "End Date", width: 14 },
      { key: "daysCount", header: "Days", width: 8, align: "right" },
      { key: "status", header: "Status", width: 12 },
      { key: "reason", header: "Reason", width: 25 },
    ];

    let query = db
      .select({
        id: leaveRequests.id,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        daysCount: leaveRequests.daysCount,
        status: leaveRequests.status,
        reason: leaveRequests.reason,
        employeeId: staff.employeeId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        leaveTypeName: leaveTypes.name,
        instName: institutions.name,
      })
      .from(leaveRequests)
      .leftJoin(staff, eq(leaveRequests.staffId, staff.id))
      .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .leftJoin(staffInstitutions, eq(staff.id, staffInstitutions.staffId))
      .leftJoin(institutions, eq(staffInstitutions.institutionId, institutions.id));

    const conditions: (SQL | undefined)[] = [];
    if (dateFrom) conditions.push(gte(leaveRequests.startDate, dateFrom));
    if (dateTo) conditions.push(lte(leaveRequests.endDate, dateTo));
    if (finalInstitutionId) {
      conditions.push(eq(staffInstitutions.institutionId, finalInstitutionId));
    } else if (!isSuperOrAdmin) {
      conditions.push(inArray(staffInstitutions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await executeLimitedQuery<any>(query);
    exportData = rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId || "",
      employeeName: `${r.firstName || ""} ${r.lastName || ""}`.trim(),
      instName: r.instName || "",
      leaveTypeName: r.leaveTypeName || "",
      startDate: r.startDate,
      endDate: r.endDate,
      daysCount: r.daysCount,
      status: r.status,
      reason: r.reason || "",
    }));
  }

  // ── 3. Staff Export ────────────────────────────────────────────────────────
  if (type === "staff") {
    exportTitle = "Staff Directory Report";
    exportColumns = [
      { key: "employeeId", header: "Employee ID", width: 14 },
      { key: "fullName", header: "Full Name", width: 22 },
      { key: "email", header: "Email", width: 25 },
      { key: "phone", header: "Phone", width: 16 },
      { key: "role", header: "Role", width: 14 },
      { key: "designation", header: "Designation", width: 18 },
      { key: "instName", header: "Institution", width: 20 },
      { key: "deptName", header: "Department", width: 18 },
    ];

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
    } else if (!isSuperOrAdmin) {
      conditions.push(inArray(staffInstitutions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await executeLimitedQuery<any>(query);
    exportData = rows.map((r) => ({
      employeeId: r.employeeId || "",
      fullName: `${r.firstName || ""} ${r.lastName || ""}`.trim(),
      email: r.email || "",
      phone: r.phone || "",
      role: r.role || "",
      designation: r.designation || "",
      instName: r.instName || "",
      deptName: r.deptName || "",
    }));
  }

  // ── 4. Payroll Export ──────────────────────────────────────────────────────
  if (type === "payroll") {
    exportTitle = "Payroll Summary Report";
    exportColumns = [
      { key: "employeeId", header: "Emp ID", width: 14 },
      { key: "employeeName", header: "Employee Name", width: 22 },
      { key: "designation", header: "Designation", width: 18 },
      { key: "deptName", header: "Department", width: 18 },
      { key: "workingDays", header: "Working Days", width: 14, align: "right" },
      { key: "presentDays", header: "Present", width: 12, align: "right" },
      { key: "absentDays", header: "Absent", width: 12, align: "right" },
      { key: "lateArrivals", header: "Late", width: 10, align: "right" },
      { key: "earlyDepartures", header: "Early", width: 10, align: "right" },
      { key: "netPayable", header: "Payable Days", width: 14, align: "right" },
    ];

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
        deptName: departments.name,
      })
      .from(staff)
      .leftJoin(staffDepartments, eq(staff.id, staffDepartments.staffId))
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(staffInstitutions, eq(staff.id, staffInstitutions.staffId));

    const conditions: (SQL | undefined)[] = [];
    if (finalInstitutionId) {
      conditions.push(eq(staffInstitutions.institutionId, finalInstitutionId));
    } else if (!isSuperOrAdmin) {
      conditions.push(inArray(staffInstitutions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const staffRows = await executeLimitedQuery<any>(query);

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

      exportData.push({
        employeeId: s.employeeId || "",
        employeeName: `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        designation: s.designation || "",
        deptName: s.deptName || "",
        workingDays: totalWorkingDays,
        presentDays: daysPresent,
        absentDays: daysAbsent,
        lateArrivals,
        earlyDepartures,
        netPayable: daysPresent,
      });
    }
  }

  // ── 5. Accounts Export ─────────────────────────────────────────────────────
  if (type === "accounts") {
    exportTitle = "Financial Transactions Report";
    exportColumns = [
      { key: "transactionDate", header: "Date", width: 14 },
      { key: "type", header: "Type", width: 12 },
      { key: "category", header: "Category", width: 16 },
      { key: "amount", header: "Amount", width: 14, align: "right", format: (v) => `$${Number(v || 0).toFixed(2)}` },
      { key: "description", header: "Description", width: 25 },
      { key: "institutionName", header: "Institution", width: 20 },
      { key: "recordedBy", header: "Recorded By", width: 20 },
    ];

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
      })
      .from(financialTransactions)
      .leftJoin(staff, eq(financialTransactions.recordedById, staff.id))
      .leftJoin(institutions, eq(financialTransactions.institutionId, institutions.id));

    const conditions: (SQL | undefined)[] = [];
    if (dateFrom) conditions.push(gte(financialTransactions.transactionDate, dateFrom));
    if (dateTo) conditions.push(lte(financialTransactions.transactionDate, dateTo));
    if (finalInstitutionId) {
      conditions.push(eq(financialTransactions.institutionId, finalInstitutionId));
    } else if (!isSuperOrAdmin) {
      conditions.push(inArray(financialTransactions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await executeLimitedQuery<any>(query);
    exportData = rows.map((r) => ({
      transactionDate: r.transactionDate,
      type: r.type,
      category: r.category,
      amount: r.amount || 0,
      description: r.description || "",
      institutionName: r.institutionName || "",
      recordedBy: `${r.recordedByName || ""} ${r.recordedByLastName || ""}`.trim(),
    }));
  }

  // ── 6. Assets Export ───────────────────────────────────────────────────────
  if (type === "assets") {
    exportTitle = "Asset Inventory Report";
    exportColumns = [
      { key: "id", header: "Asset Tag", width: 14 },
      { key: "name", header: "Asset Name", width: 22 },
      { key: "type", header: "Type", width: 14 },
      { key: "model", header: "Model", width: 16 },
      { key: "serialNumber", header: "Serial Number", width: 18 },
      { key: "instName", header: "Institution", width: 20 },
      { key: "location", header: "Location", width: 16 },
      { key: "status", header: "Status", width: 12 },
      { key: "purchaseCost", header: "Cost", width: 14, align: "right", format: (v) => `$${Number(v || 0).toFixed(2)}` },
      { key: "assignedTo", header: "Assigned To", width: 20 },
    ];

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
    } else if (!isSuperOrAdmin) {
      conditions.push(inArray(assets.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await executeLimitedQuery<any>(query);
    exportData = rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      model: r.model || "",
      serialNumber: r.serialNumber || "",
      instName: r.instName || "",
      location: r.location || "",
      status: r.status,
      purchaseCost: r.purchaseCost || 0,
      assignedTo: `${r.assignedFirstName || ""} ${r.assignedLastName || ""}`.trim(),
    }));
  }

  // ── 7. Expenses Export ─────────────────────────────────────────────────────
  if (type === "expenses") {
    exportTitle = "Expense Claims Report";
    exportColumns = [
      { key: "id", header: "Claim ID", width: 14 },
      { key: "employeeId", header: "Emp ID", width: 14 },
      { key: "employeeName", header: "Employee Name", width: 22 },
      { key: "instName", header: "Institution", width: 20 },
      { key: "category", header: "Category", width: 16 },
      { key: "description", header: "Description", width: 25 },
      { key: "amount", header: "Amount", width: 14, align: "right", format: (v) => `$${Number(v || 0).toFixed(2)}` },
      { key: "status", header: "Status", width: 12 },
      { key: "createdAt", header: "Submitted", width: 14 },
    ];

    let query = db
      .select({
        id: expenseClaims.id,
        amount: expenseClaims.amount,
        category: expenseClaims.category,
        description: expenseClaims.description,
        status: expenseClaims.status,
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
    } else if (!isSuperOrAdmin) {
      conditions.push(inArray(staffInstitutions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await executeLimitedQuery<any>(query);
    exportData = rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId || "",
      employeeName: `${r.firstName || ""} ${r.lastName || ""}`.trim(),
      instName: r.instName || "",
      category: r.category,
      description: r.description,
      amount: r.amount || 0,
      status: r.status,
      createdAt: r.createdAt ? r.createdAt.slice(0, 10) : "",
    }));
  }

  // ── 8. Fees Export ─────────────────────────────────────────────────────────
  if (type === "fees") {
    exportTitle = "Fee Collections & Receipts Report";
    exportColumns = [
      { key: "id", header: "Tx ID", width: 14 },
      { key: "transactionDate", header: "Date", width: 14 },
      { key: "instName", header: "Institution", width: 20 },
      { key: "category", header: "Fee Category", width: 18 },
      { key: "amount", header: "Amount", width: 14, align: "right", format: (v) => `₹${Number(v || 0).toFixed(2)}` },
      { key: "description", header: "Description / Student", width: 25 },
      { key: "notes", header: "Reference", width: 18 },
      { key: "recordedBy", header: "Recorded By", width: 18 },
    ];

    let query = db
      .select({
        id: financialTransactions.id,
        transactionDate: financialTransactions.transactionDate,
        category: financialTransactions.category,
        amount: financialTransactions.amount,
        description: financialTransactions.description,
        notes: financialTransactions.notes,
        instName: institutions.name,
        recordedByFirst: staff.firstName,
        recordedByLast: staff.lastName,
      })
      .from(financialTransactions)
      .leftJoin(institutions, eq(financialTransactions.institutionId, institutions.id))
      .leftJoin(staff, eq(financialTransactions.recordedById, staff.id));

    const conditions: (SQL | undefined)[] = [
      eq(financialTransactions.type, "income"),
    ];
    if (dateFrom) conditions.push(gte(financialTransactions.transactionDate, dateFrom));
    if (dateTo) conditions.push(lte(financialTransactions.transactionDate, dateTo));
    if (finalInstitutionId) {
      conditions.push(eq(financialTransactions.institutionId, finalInstitutionId));
    } else if (!isSuperOrAdmin) {
      conditions.push(inArray(financialTransactions.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await executeLimitedQuery<any>(query);
    exportData = rows.map((r) => ({
      id: r.id,
      transactionDate: r.transactionDate,
      instName: r.instName || "",
      category: r.category,
      amount: r.amount || 0,
      description: r.description || "",
      notes: r.notes || "",
      recordedBy: `${r.recordedByFirst || ""} ${r.recordedByLast || ""}`.trim(),
    }));
  }

  // ── 9. Purchases Export ────────────────────────────────────────────────────
  if (type === "purchases") {
    exportTitle = "Purchase Requisitions Report";
    exportColumns = [
      { key: "id", header: "Req ID", width: 14 },
      { key: "itemName", header: "Item Description", width: 22 },
      { key: "quantity", header: "Qty", width: 8, align: "center" },
      { key: "estimatedCost", header: "Est Cost", width: 14, align: "right", format: (v) => `₹${Number(v || 0).toFixed(2)}` },
      { key: "requesterName", header: "Requester", width: 20 },
      { key: "status", header: "Status", width: 14 },
      { key: "justification", header: "Justification", width: 25 },
      { key: "createdAt", header: "Created At", width: 14 },
    ];

    let query = db
      .select({
        id: purchaseRequests.id,
        itemName: purchaseRequests.itemName,
        quantity: purchaseRequests.quantity,
        estimatedCost: purchaseRequests.estimatedCost,
        status: purchaseRequests.status,
        justification: purchaseRequests.justification,
        createdAt: purchaseRequests.createdAt,
        requesterFirst: staff.firstName,
        requesterLast: staff.lastName,
      })
      .from(purchaseRequests)
      .leftJoin(staff, eq(purchaseRequests.requesterId, staff.id));

    const conditions: (SQL | undefined)[] = [];
    if (dateFrom) conditions.push(gte(purchaseRequests.createdAt, dateFrom));
    if (dateTo) conditions.push(lte(purchaseRequests.createdAt, dateTo));

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await executeLimitedQuery<any>(query);
    exportData = rows.map((r) => ({
      id: r.id,
      itemName: r.itemName,
      quantity: r.quantity,
      estimatedCost: r.estimatedCost,
      requesterName: `${r.requesterFirst || ""} ${r.requesterLast || ""}`.trim(),
      status: r.status,
      justification: r.justification || "",
      createdAt: r.createdAt ? r.createdAt.slice(0, 10) : "",
    }));
  }

  // ── 10. Students Export ────────────────────────────────────────────────────
  if (type === "students") {
    exportTitle = "Student Roster & Enrollment Report";
    exportColumns = [
      { key: "id", header: "Student ID", width: 14 },
      { key: "admissionNo", header: "Admission No", width: 14 },
      { key: "name", header: "Student Name", width: 22 },
      { key: "className", header: "Class / Grade", width: 14 },
      { key: "gender", header: "Gender", width: 10 },
      { key: "emergencyContactName", header: "Guardian / Contact", width: 18 },
      { key: "emergencyContactPhone", header: "Phone", width: 14 },
      { key: "status", header: "Status", width: 12 },
    ];

    let query = db
      .select({
        id: students.id,
        admissionNo: students.admissionNo,
        firstName: students.firstName,
        lastName: students.lastName,
        gender: students.gender,
        emergencyContactName: students.emergencyContactName,
        emergencyContactPhone: students.emergencyContactPhone,
        isActive: students.isActive,
        className: classes.name,
      })
      .from(students)
      .leftJoin(classes, eq(students.classId, classes.id));

    const conditions: (SQL | undefined)[] = [];
    if (finalInstitutionId) {
      conditions.push(eq(students.institutionId, finalInstitutionId));
    } else if (!isSuperOrAdmin) {
      conditions.push(inArray(students.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const rows = await executeLimitedQuery<any>(query);
    exportData = rows.map((r) => ({
      id: r.id,
      admissionNo: r.admissionNo || "",
      name: `${r.firstName || ""} ${r.lastName || ""}`.trim(),
      className: r.className || "Unassigned",
      gender: r.gender || "",
      emergencyContactName: r.emergencyContactName || "",
      emergencyContactPhone: r.emergencyContactPhone || "",
      status: r.isActive ? "Active" : "Inactive",
    }));
  }

  // ── 11. Timetables Export ──────────────────────────────────────────────────
  if (type === "timetables") {
    exportTitle = "Academic Timetable Schedule";
    exportColumns = [
      { key: "dayOfWeek", header: "Day", width: 12 },
      { key: "slotName", header: "Time Slot", width: 16 },
      { key: "className", header: "Class / Section", width: 16 },
      { key: "subjectName", header: "Subject", width: 20 },
      { key: "teacherName", header: "Teacher", width: 20 },
      { key: "roomNumber", header: "Room", width: 12 },
    ];

    let query = db
      .select({
        id: timetableEntries.id,
        dayOfWeek: timetableEntries.dayOfWeek,
        subjectName: timetableEntries.subjectName,
        roomNumber: timetableEntries.roomNumber,
        slotName: timetableSlots.name,
        startTime: timetableSlots.startTime,
        endTime: timetableSlots.endTime,
        className: classes.name,
        teacherFirst: staff.firstName,
        teacherLast: staff.lastName,
      })
      .from(timetableEntries)
      .leftJoin(timetableSlots, eq(timetableEntries.slotId, timetableSlots.id))
      .leftJoin(classes, eq(timetableEntries.classId, classes.id))
      .leftJoin(staff, eq(timetableEntries.teacherId, staff.id));

    const conditions: (SQL | undefined)[] = [];
    if (finalInstitutionId) {
      conditions.push(eq(timetableEntries.institutionId, finalInstitutionId));
    } else if (!isSuperOrAdmin) {
      conditions.push(inArray(timetableEntries.institutionId, allowedInstIds));
    }

    const activeConditions = conditions.filter((c): c is SQL => !!c);
    if (activeConditions.length > 0) {
      query = query.where(and(...activeConditions)) as typeof query;
    }

    const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const rows = await executeLimitedQuery<any>(query);
    exportData = rows.map((r) => ({
      dayOfWeek: days[r.dayOfWeek] || `Day ${r.dayOfWeek}`,
      slotName: r.slotName ? `${r.slotName} (${r.startTime || ""}-${r.endTime || ""})` : "Standard Slot",
      className: r.className || "Class",
      subjectName: r.subjectName || "Subject",
      teacherName: `${r.teacherFirst || ""} ${r.teacherLast || ""}`.trim() || "Assigned Faculty",
      roomNumber: r.roomNumber || "TBD",
    }));
  } else if (type === "tabulation" || type === "examinations") {
    exportTitle = "EXAMINATION TABULATION REGISTER";
    exportColumns = [
      { key: "rank", header: "Rank", align: "center" },
      { key: "rollNumber", header: "Roll Number" },
      { key: "studentName", header: "Student Name" },
      { key: "totalMarks", header: "Total Marks", align: "right" },
      { key: "percentage", header: "Percentage %", align: "right" },
      { key: "gpa", header: "SGPA", align: "right" },
      { key: "letterGrade", header: "Grade", align: "center" },
      { key: "resultStatus", header: "Result Status", align: "center" },
    ];

    exportData = [
      { rank: 1, rollNumber: "STU-2026-8802", studentName: "Samantha Chen", totalMarks: 182, percentage: 91.0, gpa: 9.5, letterGrade: "O", resultStatus: "PASS" },
      { rank: 2, rollNumber: "STU-2026-8801", studentName: "Alex Rivera", totalMarks: 165, percentage: 82.5, gpa: 9.0, letterGrade: "A+", resultStatus: "PASS" },
      { rank: 3, rollNumber: "STU-2026-8804", studentName: "Priya Sharma", totalMarks: 148, percentage: 74.0, gpa: 8.0, letterGrade: "A", resultStatus: "PASS" },
      { rank: 4, rollNumber: "STU-2026-8803", studentName: "Marcus Vance", totalMarks: 0, percentage: 0.0, gpa: 0.0, letterGrade: "F", resultStatus: "FAIL" },
    ];
  }

  // 3. Format Generation Options
  const exportOpts: ExportOptions<any> = {
    type,
    format,
    title: exportTitle,
    columns: exportColumns,
    data: exportData,
    institutionName: instName,
    dateFrom,
    dateTo,
    generatedBy: `${session.role} (${session.staffId || "System"})`,
    metadata: {
      "Total Records": exportData.length,
    },
  };

  let result;
  if (format === "xlsx") {
    result = await excelFormatter.generate(exportOpts);
  } else if (format === "pdf") {
    result = await pdfFormatter.generate(exportOpts);
  } else {
    result = csvFormatter.generate(exportOpts);
  }

  const bodyContent = typeof result.content === "string" ? result.content : new Uint8Array(result.content as Buffer);

  return new Response(bodyContent, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}, "finance:export");
