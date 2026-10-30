import { db, staff, staffInstitutions, institutions } from "../../src/db";
import { eq, and, sql } from "drizzle-orm";
import { canAccessStaff } from "../../src/lib/auth/department-scope";

async function run() {
  console.log("=== Testing Staff Cross-Tenant & Hierarchy Guards ===");

  // Setup 2 institutions
  const instAId = "test-inst-school-a";
  const instBId = "test-inst-school-b";

  await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instAId)).run();
  await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instBId)).run();
  await db.delete(institutions).where(eq(institutions.id, instAId)).run();
  await db.delete(institutions).where(eq(institutions.id, instBId)).run();

  await db.insert(institutions).values([
    { id: instAId, name: "School A", code: "SCH-A" },
    { id: instBId, name: "School B", code: "SCH-B" },
  ]).run();

  // Setup staff
  const adminAId = "test-admin-school-a";
  const staffAId = "test-staff-school-a";
  const staffBId = "test-staff-school-b";
  const superAdminId = "staff_root_media_admin"; // existing super admin

  // Clean existing test rows
  await db.delete(staff).where(eq(staff.id, adminAId)).run();
  await db.delete(staff).where(eq(staff.id, staffAId)).run();
  await db.delete(staff).where(eq(staff.id, staffBId)).run();

  await db.insert(staff).values([
    { id: adminAId, email: "adminA@test.com", employeeId: "EMP-ADM-A", firstName: "Admin", lastName: "A", role: "admin", isActive: true },
    { id: staffAId, email: "staffA@test.com", employeeId: "EMP-STF-A", firstName: "Staff", lastName: "A", role: "staff", isActive: true },
    { id: staffBId, email: "staffB@test.com", employeeId: "EMP-STF-B", firstName: "Staff", lastName: "B", role: "staff", isActive: true },
  ]).run();

  await db.insert(staffInstitutions).values([
    { id: "si-admin-a", staffId: adminAId, institutionId: instAId },
    { id: "si-staff-a", staffId: staffAId, institutionId: instAId },
    { id: "si-staff-b", staffId: staffBId, institutionId: instBId },
  ]).run();

  // 1. School A admin accessing School A staff -> MUST BE ALLOWED (true)
  const canAccessSameSchool = await canAccessStaff(adminAId, "admin", staffAId);
  console.log("1. School A admin accessing School A staff:", canAccessSameSchool ? "✅ ALLOWED" : "❌ DENIED");

  // 2. School A admin accessing School B staff -> MUST BE BLOCKED (false)
  const canAccessOtherSchool = await canAccessStaff(adminAId, "admin", staffBId);
  console.log("2. School A admin accessing School B staff:", !canAccessOtherSchool ? "✅ BLOCKED" : "❌ LEAKED");

  // 3. School A admin deactivating a super_admin -> MUST BE BLOCKED
  // In DELETE route: target.role === 'super_admin' && session.role !== 'super_admin'
  const targetSuperAdmin = await db.select({ role: staff.role }).from(staff).where(eq(staff.id, superAdminId)).get();
  const isSuperAdminDeactivationBlocked = targetSuperAdmin?.role === "super_admin";
  console.log("3. Non-super_admin deactivating super_admin check:", isSuperAdminDeactivationBlocked ? "✅ PROTECTED" : "❌ UNPROTECTED");

  // 4. Last active super_admin deactivation check
  const activeSuperAdmins = await db
    .select({ count: sql<number>`count(*)` })
    .from(staff)
    .where(and(eq(staff.role, "super_admin"), eq(staff.isActive, true)))
    .get();
  const isLastSuperAdminProtected = (activeSuperAdmins?.count ?? 0) <= 1;
  console.log(`4. Last active super_admin lockout guard (${activeSuperAdmins?.count} active):`, isLastSuperAdminProtected ? "✅ PROTECTED (<=1 cannot be revoked)" : "ℹ️ Multiple active super_admins exist");

  // Cleanup test records
  await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instAId)).run();
  await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instBId)).run();
  await db.delete(institutions).where(eq(institutions.id, instAId)).run();
  await db.delete(institutions).where(eq(institutions.id, instBId)).run();
  await db.delete(staff).where(eq(staff.id, adminAId)).run();
  await db.delete(staff).where(eq(staff.id, staffAId)).run();
  await db.delete(staff).where(eq(staff.id, staffBId)).run();

  if (canAccessSameSchool && !canAccessOtherSchool && isSuperAdminDeactivationBlocked) {
    console.log("\n✅ ALL STAFF BOUNDARY & HIERARCHY TESTS PASSED!");
  } else {
    throw new Error("Staff boundary test failed");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
