import { db, staff, staffInstitutions } from "../../src/db";

async function main() {
  console.log("=== Querying Active Staff Without Institution Mapping ===");

  const allStaff = await db.select().from(staff);
  const mappings = await db.select().from(staffInstitutions);

  const mappedStaffIds = new Set(mappings.map((m) => m.staffId));
  const unmapped = allStaff.filter((s) => s.isActive && !mappedStaffIds.has(s.id));

  console.log(`Total staff in DB: ${allStaff.length}`);
  console.log(`Total active unmapped staff members: ${unmapped.length}`);
  const byRole: Record<string, typeof unmapped> = {};
  for (const s of unmapped) {
    byRole[s.role] = byRole[s.role] || [];
    byRole[s.role].push(s);
  }

  for (const [role, list] of Object.entries(byRole)) {
    console.log(`\nRole [${role}] (${list.length} accounts):`);
    for (const item of list) {
      console.log(`  - ${item.id} | ${item.firstName} ${item.lastName} (${item.email})`);
    }
  }

  if (unmapped.length === 0) {
    console.log("✅ Zero unmapped active staff members found.");
  }
}

main().catch(console.error);
