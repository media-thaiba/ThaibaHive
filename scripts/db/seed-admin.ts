import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, databaseUrl } from "../../packages/db";
import { staff, staffInstitutions, institutions } from "../../src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function main() {
  console.log("[seed-admin] Connected to database URL:", databaseUrl);
  const email = "director@thaibahive.local";
  const password = "Password123";
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  // Find or create default institution
  let defaultInst = await db.select().from(institutions).limit(1).get();
  if (!defaultInst) {
    const instId = crypto.randomUUID();
    await db.insert(institutions).values({
      id: instId,
      name: "Thaiba Garden Campus",
      code: "TGC-MAIN",
      type: "campus",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }).run();
    defaultInst = { id: instId, name: "Thaiba Garden Campus", code: "TGC-MAIN", type: "campus", isActive: true, createdAt: now, updatedAt: now } as any;
  }

  // 1. Upsert director@thaibahive.local
  const existingDirector = await db.select().from(staff).where(eq(staff.email, email)).get();
  let directorId = existingDirector?.id;
  if (!existingDirector) {
    directorId = crypto.randomUUID();
    await db.insert(staff).values({
      id: directorId,
      email,
      employeeId: "DIR-001",
      firstName: "Director",
      lastName: "Thaiba",
      designation: "Managing Director",
      role: "super_admin",
      isActive: true,
      emailVerifiedAt: now,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    }).run();
    console.log(`[seed-admin] Created ${email} (ID: ${directorId})`);
  } else {
    await db.update(staff).set({ passwordHash, role: "super_admin", isActive: true, emailVerifiedAt: now, updatedAt: now }).where(eq(staff.email, email)).run();
    console.log(`[seed-admin] Updated password and role for ${email}`);
  }

  // Ensure staffInstitutions mapping exists
  if (directorId && defaultInst) {
    const existingMap = await db.select().from(staffInstitutions).where(eq(staffInstitutions.staffId, directorId)).get();
    if (!existingMap) {
      await db.insert(staffInstitutions).values({
        id: crypto.randomUUID(),
        staffId: directorId,
        institutionId: defaultInst.id,
      }).run();
      console.log(`[seed-admin] Linked director to institution ${defaultInst.id}`);
    }
  }

  // 2. Also reset test-superadmin@thaibahive.local to the same known password
  const existingSuperadmin = await db.select().from(staff).where(eq(staff.email, "test-superadmin@thaibahive.local")).get();
  if (existingSuperadmin) {
    await db.update(staff).set({ passwordHash, role: "super_admin", isActive: true, emailVerifiedAt: now, updatedAt: now }).where(eq(staff.email, "test-superadmin@thaibahive.local")).run();
    console.log(`[seed-admin] Updated password for test-superadmin@thaibahive.local to ${password}`);
  }

  console.log("\n========================================");
  console.log("Admin accounts ready for login:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role:     super_admin`);
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[seed-admin] Error:", e);
    process.exit(1);
  });
