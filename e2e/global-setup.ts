import { db } from "../packages/db";
import { staff, leaveTypes, leaveBalances, departments, staffDepartments, staffInstitutions, institutions } from "../packages/db/schema";
import { hashPassword } from "../src/lib/auth";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";

async function globalSetup() {
  console.log("Seeding test users and leave types for Playwright E2E tests...");
  const passwordHash = await hashPassword("Password123");

  const seedUser = async (email: string, employeeId: string, firstName: string, lastName: string, role: string, nfcTagId?: string) => {
    let staffId = "";
    const existing = await db.select().from(staff).where(eq(staff.email, email)).get();
    if (!existing) {
      staffId = crypto.randomUUID();
      await db.insert(staff).values({
        id: staffId,
        email,
        employeeId,
        firstName,
        lastName,
        passwordHash,
        role,
        isFirstLogin: false,
        isActive: true,
        nfcTagId: nfcTagId || null,
      }).run();
      console.log(`Seeded test user: ${email} (${role})`);
    } else {
      staffId = existing.id;
      await db.update(staff).set({
        isFirstLogin: false,
        isActive: true,
        nfcTagId: nfcTagId || null,
        passwordHash,
      }).where(eq(staff.email, email)).run();
      console.log(`Updated test user fields and reset password: ${email}`);
    }
    return staffId;
  };

  // Seed multi-role test users for approval flow testing
  const _adminId = await seedUser("test-admin@thaibahive.local", "TEST-ADMIN-99", "Test", "Admin", "admin");
  const staffId = await seedUser("test-staff@thaibahive.local", "TEST-STAFF-99", "Test", "Staff", "staff", "test-nfc-tag-id-99");
  const hodId = await seedUser("test-hod@thaibahive.local", "TEST-HOD-99", "Test", "HOD", "hod");
  const principalId = await seedUser("test-principal@thaibahive.local", "TEST-PRIN-99", "Test", "Principal", "principal");

  // Seed test institution
  let institutionId = "";
  const existingInst = await db.select().from(institutions).where(eq(institutions.name, "Test Institution E2E")).get();
  if (!existingInst) {
    institutionId = crypto.randomUUID();
    await db.insert(institutions).values({
      id: institutionId,
      name: "Test Institution E2E",
      code: "TEST-E2E",
      isActive: true,
    }).run();
    console.log("Seeded test institution: Test Institution E2E");
  } else {
    institutionId = existingInst.id;
  }

  // Assign principal to institution
  const existingPrincipalInst = await db.select().from(staffInstitutions).where(
    and(eq(staffInstitutions.staffId, principalId), eq(staffInstitutions.institutionId, institutionId))
  ).get();
  if (!existingPrincipalInst) {
    await db.insert(staffInstitutions).values({
      id: crypto.randomUUID(),
      staffId: principalId,
      institutionId,
    }).run();
    console.log("Assigned principal to test institution");
  }

  // Seed test department
  let departmentId = "";
  const existingDept = await db.select().from(departments).where(eq(departments.name, "Test Department E2E")).get();
  if (!existingDept) {
    departmentId = crypto.randomUUID();
    await db.insert(departments).values({
      id: departmentId,
      name: "Test Department E2E",
      code: "TEST-DEPT",
      headUserId: hodId,
      institutionId,
      isActive: true,
    }).run();
    console.log("Seeded test department: Test Department E2E");
  } else {
    departmentId = existingDept.id;
  }

  // Assign staff to department
  const existingStaffDept = await db.select().from(staffDepartments).where(
    and(eq(staffDepartments.staffId, staffId), eq(staffDepartments.departmentId, departmentId))
  ).get();
  if (!existingStaffDept) {
    await db.insert(staffDepartments).values({
      id: crypto.randomUUID(),
      staffId,
      departmentId,
    }).run();
    console.log("Assigned staff to test department");
  }

  // Assign HOD to department
  const existingHodDept = await db.select().from(staffDepartments).where(
    and(eq(staffDepartments.staffId, hodId), eq(staffDepartments.departmentId, departmentId))
  ).get();
  if (!existingHodDept) {
    await db.insert(staffDepartments).values({
      id: crypto.randomUUID(),
      staffId: hodId,
      departmentId,
    }).run();
    console.log("Assigned HOD to test department");
  }

  // Seed leave types if empty
  const defaultTypes = [
    { name: "Sick Leave", code: "SICK", daysAllowed: 12 },
    { name: "Casual Leave", code: "CASUAL", daysAllowed: 15 },
    { name: "Annual Leave", code: "ANNUAL", daysAllowed: 20 },
  ];

  for (const dt of defaultTypes) {
    const existingType = await db.select().from(leaveTypes).where(eq(leaveTypes.code, dt.code)).get();
    if (!existingType) {
      await db.insert(leaveTypes).values({
        id: crypto.randomUUID(),
        name: dt.name,
        code: dt.code,
        daysAllowed: dt.daysAllowed,
        requiresApproval: true,
        isActive: true,
      }).run();
      console.log(`Seeded leave type: ${dt.code}`);
    }
  }

  // Seed leave balances for test-staff
  const types = await db.select().from(leaveTypes).all();
  const year = new Date().getFullYear();

  for (const t of types) {
    const existingBalance = await db
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.staffId, staffId),
          eq(leaveBalances.leaveTypeId, t.id),
          eq(leaveBalances.year, year)
        )
      )
      .get();
      
    if (!existingBalance) {
      await db.insert(leaveBalances).values({
        id: crypto.randomUUID(),
        staffId,
        leaveTypeId: t.id,
        totalDays: t.daysAllowed,
        usedDays: 0,
        year,
      }).run();
      console.log(`Seeded leave balance for test-staff@thaibahive.local / type ${t.code}`);
    }
  }
}

export default globalSetup;
