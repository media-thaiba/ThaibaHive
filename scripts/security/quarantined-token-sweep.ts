import { requireAuth } from "../../src/lib/api/auth-guard";
import { createSession } from "../../packages/auth/session";
import { db } from "../../src/db";
import { staff, staffInstitutions } from "../../packages/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// Define representative handlers wrapped with requireAuth:
const dummyHandler = async (req: Request, session: any) => {
  return NextResponse.json({ ok: true, session });
};

const routesToTest = [
  // 1. Allowlisted Onboarding Endpoints
  { path: "/api/institutions", method: "GET", expected: 200, name: "Institutions (allowlisted GET)" },
  { path: "/api/institutions", method: "POST", expected: 403, name: "Institutions (disallowed POST)" },
  { path: "/api/departments", method: "GET", expected: 200, name: "Departments (allowlisted GET)" },
  { path: "/api/departments", method: "POST", expected: 403, name: "Departments (disallowed POST)" },
  { path: "/api/auth/me", method: "GET", expected: 200, name: "Auth Me (allowlisted GET)" },
  { path: "/api/auth/onboarding/affiliate", method: "POST", expected: 200, name: "Onboarding Affiliate (allowlisted POST)" },
  { path: "/api/auth/onboarding/affiliate", method: "GET", expected: 403, name: "Onboarding Affiliate (disallowed GET)" },

  // 2. Core Internal Campus Data Routes (MUST FAIL-CLOSED to 403 ACCOUNT_PENDING)
  { path: "/api/dashboard/stats", method: "GET", expected: 403, name: "Dashboard Stats" },
  { path: "/api/attendance/stats", method: "GET", expected: 403, name: "Attendance Stats" },
  { path: "/api/academic/students", method: "GET", expected: 403, name: "Students List" },
  { path: "/api/academic/students", method: "POST", expected: 403, name: "Student Creation" },
  { path: "/api/finance/stats", method: "GET", expected: 403, name: "Finance Stats" },
  { path: "/api/finance/payroll", method: "GET", expected: 403, name: "Finance Payroll" },
  { path: "/api/circulars", method: "GET", expected: 403, name: "Internal Circulars" },
  { path: "/api/events", method: "GET", expected: 403, name: "Internal Events" },
  { path: "/api/examinations", method: "GET", expected: 403, name: "Examinations" },
  { path: "/api/leaves", method: "GET", expected: 403, name: "Staff Leaves" },
  { path: "/api/reports", method: "GET", expected: 403, name: "Campus Reports" },
  { path: "/api/tasks", method: "GET", expected: 403, name: "Staff Tasks" },
  { path: "/api/canteen", method: "GET", expected: 403, name: "Canteen Operations" },
  { path: "/api/assets", method: "GET", expected: 403, name: "Campus Assets" },
  { path: "/api/grievances", method: "GET", expected: 403, name: "Grievances" },
  { path: "/api/chat/channels", method: "GET", expected: 403, name: "Campus Chat" },
  { path: "/api/facility/workorders", method: "GET", expected: 403, name: "Facility Work Orders" },
  { path: "/api/announcements", method: "GET", expected: 403, name: "Announcements" },
  { path: "/api/alumni/directory", method: "GET", expected: 403, name: "Alumni Directory" },
  { path: "/api/supply/requisitions", method: "GET", expected: 403, name: "Supply Requisitions" },
  { path: "/api/staff", method: "GET", expected: 403, name: "Staff Directory" },
];

async function runSweep() {
  console.log("===============================================================");
  console.log("   RUNTIME QUARANTINE SWEEP: UNMAPPED PENDING TOKEN (TALLIES)  ");
  console.log("===============================================================\n");

  const testStaffId = `staff_quarantine_sweep_${Date.now()}`;
  const testEmail = `quarantine.sweep.${Date.now()}@thaibahive.local`;
  const testEmpId = `EMP-SWEEP-${Date.now().toString().slice(-6)}`;

  // 1. Create a quarantined user in DB: role is "staff", isActive is true, but has NO institution membership
  await db.insert(staff).values({
    id: testStaffId,
    email: testEmail,
    employeeId: testEmpId,
    firstName: "Quarantined",
    lastName: "User",
    role: "staff",
    isActive: true,
    isFirstLogin: true,
    tokenVersion: 0,
  });

  try {
    const token = await createSession({
      staffId: testStaffId,
      email: testEmail,
      role: "staff",
      employeeId: testEmpId,
      name: "Quarantined User",
      tokenVersion: 0,
    });

    let passed = 0;
    let failed = 0;
    const tally: Record<number, number> = {};

    for (const r of routesToTest) {
      const wrapped = requireAuth(dummyHandler, "staff:read");
      const req = new Request(`https://thaiba-hive.vercel.app${r.path}`, {
        method: r.method,
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      try {
        const res = await wrapped(req);
        const status = res.status;
        const data = await res.json().catch(() => ({}));
        
        tally[status] = (tally[status] || 0) + 1;

        const ok = status === r.expected;
        if (ok) {
          passed++;
          console.log(`  [PASS] ${r.method.padEnd(6)} ${r.path.padEnd(32)} -> ${status} ${data.code ? `[code: ${data.code}]` : "[allowed onboarding]"}`);
        } else {
          failed++;
          console.error(`  [FAIL] ${r.method.padEnd(6)} ${r.path.padEnd(32)} -> Expected ${r.expected}, got ${status}: ${JSON.stringify(data)}`);
        }
      } catch (err: any) {
        failed++;
        console.error(`  [ERROR] ${r.method} ${r.path}:`, err.message);
      }
    }

    console.log("\n---------------------------------------------------------------");
    console.log(`TOTAL ROUTES TESTED: ${routesToTest.length}`);
    console.log(`PASSED: ${passed} | FAILED: ${failed}`);
    console.log("STATUS CODE TALLY:", JSON.stringify(tally));
    console.log("---------------------------------------------------------------\n");

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    // Cleanup mock staff
    await db.delete(staff).where(eq(staff.id, testStaffId));
  }
}

runSweep().catch(console.error);
