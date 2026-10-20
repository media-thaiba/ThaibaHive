import { db } from "@/db";
import { staff, staffInstitutions, institutions } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

async function backfillStaffInstitutions() {
  console.log("[Backfill] Starting staff_institutions backfill...");

  // Find active staff without institution mappings
  const orphanedStaff = await db
    .select({
      id: staff.id,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
    })
    .from(staff)
    .leftJoin(staffInstitutions, eq(staff.id, staffInstitutions.staffId))
    .where(and(eq(staff.isActive, true), isNull(staffInstitutions.staffId)))
    .all();

  console.log(`[Backfill] Found ${orphanedStaff.length} active staff without institution mappings`);

  if (orphanedStaff.length === 0) {
    console.log("[Backfill] No orphaned staff found. Done.");
    return;
  }

  // Use inst_campus_main as default institution
  let targetInstitutionId: string;

  const defaultInst = await db
    .select({ id: institutions.id })
    .from(institutions)
    .where(eq(institutions.id, "inst_campus_main"))
    .get();

  if (defaultInst) {
    targetInstitutionId = defaultInst.id;
  } else {
    console.error("[Backfill] Default institution 'inst_campus_main' not found!");
    // Fallback to first active institution
    const fallback = await db
      .select({ id: institutions.id })
      .from(institutions)
      .where(eq(institutions.isActive, true))
      .get();
    if (!fallback) {
      throw new Error("No active institutions found!");
    }
    console.log(`[Backfill] Using fallback institution: ${fallback.id}`);
    targetInstitutionId = fallback.id;
  }

  console.log(`[Backfill] Assigning to institution: ${targetInstitutionId}`);

  // Insert mappings
  let inserted = 0;
  for (const s of orphanedStaff) {
    try {
      await db.insert(staffInstitutions).values({
        id: randomUUID(),
        staffId: s.id,
        institutionId: targetInstitutionId,
      }).run();
      inserted++;
      console.log(`  ✓ ${s.email} (${s.role}) -> ${targetInstitutionId}`);
    } catch (_err) {
      // Unique constraint violation = already exists (race condition)
      console.log(`  ⊘ ${s.email} (${s.role}) already mapped (skipped)`);
    }
  }

  console.log(`[Backfill] Complete. Inserted ${inserted}/${orphanedStaff.length} mappings.`);
}

backfillStaffInstitutions()
  .then(() => process.exit(0))
  .catch((_err) => {
    console.error("[Backfill] Failed:", _err);
    process.exit(1);
  });