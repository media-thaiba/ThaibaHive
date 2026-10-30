import { db, staff, staffInstitutions, institutions } from "../../src/db";
import { eq, and, sql } from "drizzle-orm";
import { POST as resetSsoHandler } from "../../src/app/api/staff/[id]/reset-sso/route";
import { DELETE as deleteStaffHandler } from "../../src/app/api/staff/[id]/route";
import { createSession, createStepUpToken } from "@thaiba/auth";

// SAFETY GUARD: Refuse to run against remote/production databases
const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
if (!dbUrl.startsWith("file:") && !dbUrl.includes("dev.db")) {
  throw new Error(`[FATAL SAFETY GUARD] Refusing to run test script against non-local database: ${dbUrl}`);
}

async function run() {
  console.log("==================================================================");
  console.log("   TEST: ROUTE-LEVEL SSO RESET RANK GUARD & LAST SUPER-ADMIN      ");
  console.log("==================================================================\n");

  process.env.AUTH_JWT_SECRET = "test-secret-at-least-32-chars-long-security-key";

  const instId = "test-inst-school-lockout";
  await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instId)).run();
  await db.delete(institutions).where(eq(institutions.id, instId)).run();

  await db.insert(institutions).values({
    id: instId,
    name: "Lockout Guard School",
    code: "SCH-LOCKOUT",
  }).run();

  const adminId = "test-admin-scoped-lockout";
  const superAdminTargetId = "staff_root_media_admin";

  await db.delete(staff).where(eq(staff.id, adminId)).run();
  await db.insert(staff).values({
    id: adminId,
    email: "admin.scoped@lockout.local",
    employeeId: "EMP-ADM-LOCKOUT",
    firstName: "Scoped",
    lastName: "Admin",
    role: "admin",
    isActive: true,
    tokenVersion: 0,
  }).run();

  await db.insert(staffInstitutions).values({
    id: "si-admin-lockout",
    staffId: adminId,
    institutionId: instId,
  }).run();

  // Mint valid session token for admin
  const adminSessionToken = await createSession({
    staffId: adminId,
    email: "admin.scoped@lockout.local",
    role: "admin",
    employeeId: "EMP-ADM-LOCKOUT",
    name: "Scoped Admin",
    tokenVersion: 0,
  });

  // Test 1: Admin calls reset-sso against super_admin without step-up token -> 403 STEP_UP_REQUIRED
  console.log("[Test 1] Admin calling POST /api/staff/[id]/reset-sso without step-up token...");
  const reqWithoutStepUp = new Request(`http://localhost/api/staff/${superAdminTargetId}/reset-sso`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authorization": `Bearer ${adminSessionToken}`,
    },
    body: JSON.stringify({ newEmail: "attacker@gmail.com" }),
  });
  const res1 = await resetSsoHandler(reqWithoutStepUp, { params: Promise.resolve({ id: superAdminTargetId }) } as any);
  const data1 = await res1.json();
  console.log(`  Status: ${res1.status} | Code: ${data1.code} | Error: ${data1.error}`);
  const pass1 = res1.status === 403 && data1.code === "STEP_UP_REQUIRED";

  // Test 2: Admin calls reset-sso WITH step-up token against super_admin -> MUST BE 403 Forbidden (Rank Guard)
  console.log("\n[Test 2] Admin calling POST /api/staff/[id]/reset-sso WITH step-up token against super_admin...");
  const stepUpToken = await createStepUpToken(adminId, "challenge-123");

  const reqWithStepUp = new Request(`http://localhost/api/staff/${superAdminTargetId}/reset-sso`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authorization": `Bearer ${adminSessionToken}`,
      "x-step-up-token": stepUpToken,
    },
    body: JSON.stringify({ newEmail: "attacker@gmail.com" }),
  });
  const res2 = await resetSsoHandler(reqWithStepUp, { params: Promise.resolve({ id: superAdminTargetId }) } as any);
  const data2 = await res2.json();
  console.log(`  Status: ${res2.status} | Error: ${data2.error}`);
  const pass2 = res2.status === 403;

  // Test 3: Admin calls DELETE /api/staff/[superAdminId] -> 403 Forbidden (Rank Guard)
  console.log("\n[Test 3] Admin calling DELETE /api/staff/[superAdminId]...");
  const delReq = new Request(`http://localhost/api/staff/${superAdminTargetId}`, {
    method: "DELETE",
    headers: {
      "authorization": `Bearer ${adminSessionToken}`,
    },
  });
  const res3 = await deleteStaffHandler(delReq, { params: Promise.resolve({ id: superAdminTargetId }) } as any);
  const data3 = await res3.json();
  console.log(`  Status: ${res3.status} | Error: ${data3.error}`);
  const pass3 = res3.status === 403;

  // Test 4: Last active super_admin deactivation protection (count = 1 case)
  console.log("\n[Test 4] Testing Last Active Super-Admin Lockout Guard (temporarily deactivating other super_admins)...");
  // Temporarily deactivate other super_admins so media@thaibagarden.com is the ONLY active super_admin
  const otherSuperAdmins = await db
    .select({ id: staff.id })
    .from(staff)
    .where(and(eq(staff.role, "super_admin"), sql`${staff.id} != ${superAdminTargetId}`, eq(staff.isActive, true)))
    .all();

  for (const other of otherSuperAdmins) {
    await db.update(staff).set({ isActive: false }).where(eq(staff.id, other.id)).run();
  }

  const activeCountNow = (await db.select({ count: sql<number>`count(*)` }).from(staff).where(and(eq(staff.role, "super_admin"), eq(staff.isActive, true))).get())?.count;
  console.log(`  Active super_admins count before test: ${activeCountNow}`);

  // Create temporary second super_admin to act as caller
  const callerSuperAdminId = "staff_sa_temp_caller";
  await db.delete(staff).where(eq(staff.id, callerSuperAdminId)).run();
  await db.insert(staff).values({
    id: callerSuperAdminId,
    email: "caller.sa@thaibahive.local",
    employeeId: "EMP-SA-CALLER",
    firstName: "Caller",
    lastName: "SA",
    role: "super_admin",
    isActive: true,
    tokenVersion: 0,
  }).run();

  const _saSessionToken = await createSession({
    staffId: callerSuperAdminId,
    email: "caller.sa@thaibahive.local",
    role: "super_admin",
    employeeId: "EMP-SA-CALLER",
    name: "Caller SA",
    tokenVersion: 0,
  });

  // Now caller tries to deactivate the target (superAdminTargetId) while count of other active super admins is 1
  // Temporarily deactivate caller so total active super_admins in DB is exactly 1 (only superAdminTargetId)
  await db.update(staff).set({ isActive: false }).where(eq(staff.id, callerSuperAdminId)).run();
  // Restore caller to active so session is valid, but deactivate media admin? No, we want media to be the ONLY 1 active super admin.
  // Wait, if caller is inactive, session verification fails. So let caller be active, media be active: count is 2.
  // To test count <= 1: Caller is the LAST active super admin attempting to delete media (who is deactivated) or media is the LAST active super admin.
  // If caller is super_admin and tries to delete media, when media is the ONLY super admin:
  // Let caller be active, media be active: count is 2. If caller deactivates media, count becomes 1.
  // If count is ALREADY 1 (media is active, caller is active = 2).
  // Let's set caller as the target itself (caller tries to deactivate media when media is the ONLY super_admin in DB)!
  // If media has session, media tries to delete another staff member:
  // What if caller tries to delete media when media is the ONLY active super_admin?
  // Let caller be active (role: super_admin). Then count = 2.
  // To have active count = 1: Caller must be the single active super admin!
  // But a user cannot deactivate their own account (session.staffId === id returns 400 "Cannot revoke your own account").
  // What if target is super_admin and activeSuperAdmins <= 1?
  // If target is deactivated already: activeSuperAdmins does not include target.
  // If target is active, and no other super admin is active: then activeSuperAdmins count is exactly 1!
  // And if a caller (e.g. system or another process) tries to deactivate target, activeSuperAdmins.count is <= 1!
  // Let's verify this!
  await db.update(staff).set({ isActive: true }).where(eq(staff.id, callerSuperAdminId)).run();
  // Deactivate media so media is inactive, caller is 1 active super admin.
  // If caller tries to delete media (already inactive) or caller tries to delete caller:
  // Wait, what if media is active, and caller tries to delete media when only media is active?
  // To simulate that: let's query the guard condition directly or with caller:
  // If media is active (1 active super admin), and caller is a system token (role: super_admin):
  const _systemSessionToken = await createSession({
    staffId: "system",
    email: "system@internal",
    role: "super_admin",
    employeeId: "system",
    name: "System",
    tokenVersion: 0,
  });

  // Keep media as the ONLY active super_admin (deactivate callerSuperAdminId)
  await db.update(staff).set({ isActive: false }).where(eq(staff.id, callerSuperAdminId)).run();

  const delLastReq = new Request(`http://localhost/api/staff/${superAdminTargetId}`, {
    method: "DELETE",
    headers: {
      "x-dr-secret": process.env.DR_DRILL_SECRET || "dr-secret-local-test",
    },
  });
  // Use DR secret to authenticate as system in requireAuth:
  process.env.DR_DRILL_SECRET = "dr-secret-local-test";
  const res4 = await deleteStaffHandler(delLastReq, { params: Promise.resolve({ id: superAdminTargetId }) } as any);
  const data4 = await res4.json();
  console.log(`  Status: ${res4.status} | Error: ${data4.error}`);
  const pass4 = res4.status === 400 && data4.error.includes("last active super_admin");

  // Restore other super_admins
  for (const other of otherSuperAdmins) {
    await db.update(staff).set({ isActive: true }).where(eq(staff.id, other.id)).run();
  }
  await db.delete(staff).where(eq(staff.id, callerSuperAdminId)).run();

  // Cleanup test admin and institution
  await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instId)).run();
  await db.delete(institutions).where(eq(institutions.id, instId)).run();
  await db.delete(staff).where(eq(staff.id, adminId)).run();

  console.log("\n------------------------------------------------------------------");
  console.log("VERIFICATION CRITERIA:");
  console.log("  1. Missing Step-Up Token Blocked (403):       ", pass1 ? "✅ PASS" : "❌ FAIL");
  console.log("  2. Admin -> SuperAdmin reset-sso Blocked (403):", pass2 ? "✅ PASS" : "❌ FAIL");
  console.log("  3. Admin -> SuperAdmin DELETE Blocked (403):   ", pass3 ? "✅ PASS" : "❌ FAIL");
  console.log("  4. Last Super-Admin Lockout Blocked (400):     ", pass4 ? "✅ PASS" : "❌ FAIL");
  console.log("------------------------------------------------------------------");

  if (pass1 && pass2 && pass3 && pass4) {
    console.log("\n✅ ALL ROUTE-LEVEL SSO RESET & LOCKOUT TESTS PASSED!");
  } else {
    throw new Error("Route level tests failed");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
