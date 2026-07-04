import bcrypt from "bcryptjs";
import { db } from "./index";
import { staff } from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const existing = await db
    .select()
    .from(staff)
    .where(eq(staff.email, "admin@thaibahive.local"))
    .get();

  if (existing) {
    console.log("Admin user already exists, skipping seed.");
    process.exit(0);
  }

  await db
    .insert(staff)
    .values({
      id: crypto.randomUUID(),
      email: "admin@thaibahive.local",
      employeeId: "ADMIN-001",
      firstName: "Super",
      lastName: "Admin",
      role: "super_admin",
      designation: "System Administrator",
      passwordHash,
    })
    .run();

  console.log("Admin user created:");
  console.log("  Email:    admin@thaibahive.local");
  console.log("  Password: admin123");
  console.log("  Role:     super_admin");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
