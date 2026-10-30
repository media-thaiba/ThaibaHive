import { db, staff, staffInstitutions } from "../../src/db";
import { like, eq, sql } from "drizzle-orm";

async function run() {
  console.log("=== DB AUDIT FOR AUTO-PROVISIONED ROWS & EXTRA RECORDS ===");

  // 1. Rows created by old Google auto-provisioning (EMP-G-%)
  const autoProvisioned = await db
    .select({
      id: staff.id,
      email: staff.email,
      employeeId: staff.employeeId,
      role: staff.role,
      isActive: staff.isActive,
      isFirstLogin: staff.isFirstLogin,
      createdAt: staff.createdAt,
    })
    .from(staff)
    .where(like(staff.employeeId, "EMP-G-%"))
    .all();

  console.log(`1. EMP-G-% rows count: ${autoProvisioned.length}`);
  if (autoProvisioned.length > 0) {
    console.log("Found:", autoProvisioned);
  }

  // 2. Active staff with no institution membership
  const allActive = await db
    .select({ id: staff.id, email: staff.email, role: staff.role })
    .from(staff)
    .where(eq(staff.isActive, true))
    .all();

  const allMappings = await db
    .select({ staffId: staffInstitutions.staffId })
    .from(staffInstitutions)
    .all();

  const mappedSet = new Set(allMappings.map((m) => m.staffId));
  const unmappedActive = allActive.filter((s) => !mappedSet.has(s.id));

  console.log(`\n2. Active staff with no institution membership: ${unmappedActive.length}`);
  console.log(unmappedActive);

  // 3. Current admins / super_admins
  const admins = await db
    .select({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      isActive: staff.isActive,
      googleSub: staff.googleSub,
    })
    .from(staff)
    .where(sql`${staff.role} in ('super_admin', 'admin')`)
    .all();

  console.log(`\n3. Current admins & super_admins count: ${admins.length}`);
  console.log(admins);

  // 4. Trace the total count and how it changed
  console.log(`\n4. Total staff count: ${allActive.length} active (total in table: ${(await db.select({ count: sql<number>`count(*)` }).from(staff).get())?.count})`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
