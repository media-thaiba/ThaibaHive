import { db } from "../packages/db";
import { staff, leaveTypes, leaveBalances } from "../packages/db/schema";
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
        isActive: true, // Force active state for E2E tests
        nfcTagId: nfcTagId || null,
        passwordHash, // Reset password on every run to avoid sync errors
      }).where(eq(staff.email, email)).run();
      console.log(`Updated test user fields and reset password: ${email}`);
    }
    return staffId;
  };

  await seedUser("test-admin@thaibahive.local", "TEST-ADMIN-99", "Test", "Admin", "admin");
  const staffId = await seedUser("test-staff@thaibahive.local", "TEST-STAFF-99", "Test", "Staff", "staff", "test-nfc-tag-id-99");

  // 1. Seed leave types if empty
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

  // 2. Seed leave balances for test-staff
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
