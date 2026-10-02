import { db } from "../packages/db";
import { staff, leaveTypes, leaveBalances, departments, staffDepartments, staffInstitutions, institutions, exams, examSchedules, gradeScales, students, markEntries } from "../packages/db/schema";
import { hashPassword } from "../src/lib/auth";
import { eq, and, sql } from "drizzle-orm";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { SignJWT } from "jose";
import { copyStandaloneAssets } from "../scripts/copy-standalone-assets";

async function globalSetup() {
  copyStandaloneAssets();
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
  const _superAdminId = await seedUser("test-superadmin@thaibahive.local", "TEST-SUPERADMIN-99", "Test", "Super", "super_admin");
  const _adminId = await seedUser("test-admin@thaibahive.local", "TEST-ADMIN-99", "Test", "Admin", "admin");
  const staffId = await seedUser("test-staff@thaibahive.local", "TEST-STAFF-99", "Test", "Staff", "staff", "test-nfc-tag-id-99");
  const hodId = await seedUser("test-hod@thaibahive.local", "TEST-HOD-99", "Test", "HOD", "hod");
  const principalId = await seedUser("test-principal@thaibahive.local", "TEST-PRIN-99", "Test", "Principal", "principal");
  const accountsId = await seedUser("test-accounts@thaibahive.local", "TEST-ACCOUNTS-99", "Test", "Accounts", "accounts");
  const purchaseId = await seedUser("test-purchase@thaibahive.local", "TEST-PURCHASE-99", "Test", "Purchase", "purchase");

  // Clean up existing institution by code and ID using PRAGMA foreign_keys = OFF
  const institutionId = "inst_campus_main";
  try {
    await db.run(sql`PRAGMA foreign_keys = OFF`);
    await db.delete(institutions).where(eq(institutions.code, "TEST-E2E")).run();
    await db.delete(institutions).where(eq(institutions.id, institutionId)).run();
    console.log("Successfully cleaned up old E2E institutions using PRAGMA foreign_keys = OFF");
  } catch (err) {
    console.error("Failed to execute PRAGMA cleanup:", err);
  } finally {
    try {
      await db.run(sql`PRAGMA foreign_keys = ON`);
    } catch {}
  }

  // Check if institution with ID 'inst_campus_main' exists
  const existingInst = await db.select().from(institutions).where(eq(institutions.id, institutionId)).get();
  if (!existingInst) {
    await db.insert(institutions).values({
      id: institutionId,
      name: "Test Institution E2E",
      code: "TEST-E2E",
      isActive: true,
    }).run();
    console.log("Seeded test institution: Test Institution E2E");
  }

  // Seed Exam data for E2E tabulation pages (exam_100)
  const gradeScaleId = "gs_default_100";
  const seedGradeScale = async (id: string, name: string, scaleType: string, rules: any[]) => {
    const existing = await db.select().from(gradeScales).where(eq(gradeScales.id, id)).get();
    if (!existing) {
      await db.insert(gradeScales).values({
        id,
        institutionId,
        name,
        scaleType,
        rulesJson: JSON.stringify(rules),
        isDefault: false,
      }).run();
      console.log(`Seeded grade scale: ${id}`);
    }
  };

  const stdRules = [
    { minPercentage: 90, maxPercentage: 100, grade: "O", gpa: 10.0, description: "Outstanding" },
    { minPercentage: 80, maxPercentage: 89.99, grade: "A+", gpa: 9.0, description: "Excellent" },
    { minPercentage: 70, maxPercentage: 79.99, grade: "A", gpa: 8.0, description: "Very Good" },
    { minPercentage: 60, maxPercentage: 69.99, grade: "B+", gpa: 7.0, description: "Good" },
    { minPercentage: 50, maxPercentage: 59.99, grade: "B", gpa: 6.0, description: "Above Average" },
    { minPercentage: 40, maxPercentage: 49.99, grade: "C", gpa: 5.0, description: "Average / Pass" },
    { minPercentage: 0, maxPercentage: 39.99, grade: "F", gpa: 0.0, description: "Fail" },
  ];

  await seedGradeScale("gs_default_100", "Standard Grading Scale E2E", "10_point", stdRules);
  await seedGradeScale("gs_10point_standard", "Standard 10-Point Grading Scale (O, A+, A, B+, B, C, F)", "10_point", stdRules);
  await seedGradeScale("gs_letter_us", "US Letter Grade Scale (A, B, C, D, F)", "letter", [
    { minPercentage: 90, maxPercentage: 100, grade: "A", gpa: 4.0, description: "Excellent" },
    { minPercentage: 80, maxPercentage: 89.99, grade: "B", gpa: 3.0, description: "Good" },
    { minPercentage: 70, maxPercentage: 79.99, grade: "C", gpa: 2.0, description: "Average" },
    { minPercentage: 60, maxPercentage: 69.99, grade: "D", gpa: 1.0, description: "Pass" },
    { minPercentage: 0, maxPercentage: 59.99, grade: "F", gpa: 0.0, description: "Fail" },
  ]);
  await seedGradeScale("gs_percentage_simple", "Simple Percentage Pass/Fail Scale (>=40% Pass)", "percent", [
    { minPercentage: 40, maxPercentage: 100, grade: "Pass", gpa: 4.0, description: "Pass" },
    { minPercentage: 0, maxPercentage: 39.99, grade: "Fail", gpa: 0.0, description: "Fail" },
  ]);

  const existingExam = await db.select().from(exams).where(eq(exams.id, "exam_100")).get();
  if (!existingExam) {
    await db.insert(exams).values({
      id: "exam_100",
      institutionId,
      title: "Term Exam 100",
      academicYear: "2025-2026",
      term: "Term 1",
      startDate: "2026-09-01",
      endDate: "2026-09-15",
      gradeScaleId,
      status: "evaluation",
    }).run();
    console.log("Seeded exam: exam_100");
  }

  const existingSched1 = await db.select().from(examSchedules).where(eq(examSchedules.id, "sched_100_math")).get();
  if (!existingSched1) {
    await db.insert(examSchedules).values({
      id: "sched_100_math",
      examId: "exam_100",
      subjectName: "Advanced Mathematics",
      examDate: "2026-09-02",
      startTime: "09:30",
      endTime: "12:30",
      durationMinutes: 180,
      maxMarks: 100,
      passMarks: 40,
      roomNumber: "Hall 101",
    }).run();
    console.log("Seeded math schedule for exam_100");
  }

  const existingStudent = await db.select().from(students).where(eq(students.id, "stud_01")).get();
  if (!existingStudent) {
    await db.insert(students).values({
      id: "stud_01",
      admissionNo: "ADM-1001",
      studentId: "HT-1001",
      firstName: "Test",
      lastName: "Student",
      gender: "male",
      email: "test.student@thaibahive.local",
      institutionId,
      isActive: true,
    }).run();
    console.log("Seeded test student for exam_100");
  }

  const existingMark1 = await db.select().from(markEntries).where(eq(markEntries.id, "mark_100_math")).get();
  if (!existingMark1) {
    await db.insert(markEntries).values({
      id: "mark_100_math",
      examScheduleId: "sched_100_math",
      studentId: "stud_01",
      marksObtained: 85,
      maxMarks: 100,
      isAbsent: false,
      status: "approved",
    }).run();
    console.log("Seeded math mark entry for exam_100");
  }

  const assignStaffToInstitution = async (sId: string, instId: string) => {
    const existing = await db
      .select()
      .from(staffInstitutions)
      .where(and(eq(staffInstitutions.staffId, sId), eq(staffInstitutions.institutionId, instId)))
      .get();
    if (!existing) {
      await db.insert(staffInstitutions).values({
        id: crypto.randomUUID(),
        staffId: sId,
        institutionId: instId,
      }).run();
      console.log(`Assigned staff ${sId} to institution ${instId}`);
    }
  };

  // Assign all test roles to test institution
  await assignStaffToInstitution(staffId, institutionId);
  await assignStaffToInstitution(hodId, institutionId);
  await assignStaffToInstitution(principalId, institutionId);
  await assignStaffToInstitution(_adminId, institutionId);
  await assignStaffToInstitution(_superAdminId, institutionId);
  await assignStaffToInstitution(accountsId, institutionId);
  await assignStaffToInstitution(purchaseId, institutionId);

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

  // Ensure auth directory exists
  const authDir = path.join(process.cwd(), ".auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Generate deterministic storageState files for each user role
  console.log("Generating deterministic E2E storageStates for all test roles...");
  const jwtSecret = process.env.AUTH_JWT_SECRET || "thaiba_jwt_secret_key_production_certified_2026";
  const secretKey = new TextEncoder().encode(jwtSecret);

  const testUsers = [
    { staffId: _superAdminId, email: "test-superadmin@thaibahive.local", employeeId: "TEST-SUPERADMIN-99", name: "Test Super", role: "super_admin" },
    { staffId: _adminId, email: "test-admin@thaibahive.local", employeeId: "TEST-ADMIN-99", name: "Test Admin", role: "admin" },
    { staffId, email: "test-staff@thaibahive.local", employeeId: "TEST-STAFF-99", name: "Test Staff", role: "staff" },
    { staffId: hodId, email: "test-hod@thaibahive.local", employeeId: "TEST-HOD-99", name: "Test HOD", role: "hod" },
    { staffId: principalId, email: "test-principal@thaibahive.local", employeeId: "TEST-PRIN-99", name: "Test Principal", role: "principal" },
    { staffId: accountsId, email: "test-accounts@thaibahive.local", employeeId: "TEST-ACCOUNTS-99", name: "Test Accounts", role: "accounts" },
    { staffId: purchaseId, email: "test-purchase@thaibahive.local", employeeId: "TEST-PURCHASE-99", name: "Test Purchase", role: "purchase" },
  ];

  for (const u of testUsers) {
    const token = await new SignJWT({
      staffId: u.staffId,
      email: u.email,
      role: u.role,
      employeeId: u.employeeId,
      name: u.name,
      institutionId,
      tokenVersion: 0,
      dpopEnabled: false,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(secretKey);

    const storageState = {
      cookies: [
        {
          name: "thaibahive_session",
          value: token,
          domain: "localhost",
          path: "/",
          expires: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    };

    const sessionPath = path.join(authDir, `${u.role}.json`);
    fs.writeFileSync(sessionPath, JSON.stringify(storageState, null, 2), "utf-8");
    console.log(`Successfully generated and cached E2E storageState for role: ${u.role}`);
  }

  console.log("Global setup complete. Cached E2E storageStates.");
}

export default globalSetup;
