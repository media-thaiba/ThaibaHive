/**
 * Workspace URL bridge redirects (Phase 1.4).
 *
 * Navigation and dashboards link to canonical workspace URLs (e.g. /my-work/attendance).
 * Legacy pages still live at their original routes (e.g. /attendance) until the full
 * route migration lands. These mappings keep every workspace URL functional by
 * redirecting to the existing legacy page.
 */
export const WORKSPACE_REDIRECTS: Record<string, string> = {
  // My Work
  "/my-work/attendance": "/attendance",
  "/my-work/tasks": "/tasks",
  "/my-work/leaves": "/leaves",
  "/my-work/reports": "/reports",
  "/my-work/approvals": "/approvals",
  "/my-work/canteen": "/canteen",
  "/my-work/timeline": "/timeline",

  // School
  "/school/students": "/academic/students",
  "/school/classes": "/academic/classes",
  "/school/examinations": "/examinations",
  "/school/academic-years": "/academic/academic-years",
  "/school/timetable": "/academic/timetable",
  "/school/attendance": "/attendance",
  "/school/grades": "/examinations/report-cards",

  // Operations
  "/operations/finance": "/finance",
  "/operations/finance/tax": "/finance/tax",
  "/operations/finance/purchases": "/finance/purchases",
  "/operations/finance/payroll": "/finance/payroll",
  "/operations/finance/reconciliation": "/finance/reconciliation",
  "/operations/fleet": "/vehicles",
  "/operations/assets": "/assets",
  "/operations/procurement": "/purchases",
  "/operations/facilities": "/help-desk",

  // Administration
  "/admin/hardware": "/admin/nfc",
  "/admin/audit": "/admin/audit-logs",
  "/admin/tenant": "/settings",
  "/admin/keys": "/admin/security/identity",
  "/admin/security": "/admin/security/zero-trust",
};
