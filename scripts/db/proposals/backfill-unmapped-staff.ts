import { db, staffInstitutions } from "@thaiba/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

interface UnmappedStaffRow {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: number;
}

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const targetInstitutionId = process.env.DEFAULT_TARGET_INSTITUTION_ID;

  if (!targetInstitutionId) {
    console.error("❌ ERROR: DEFAULT_TARGET_INSTITUTION_ID environment variable is required.");
    console.error("Please specify an explicit target institution (e.g., DEFAULT_TARGET_INSTITUTION_ID=inst_... tsx scripts/db/proposals/backfill-unmapped-staff.ts)");
    process.exit(1);
  }

  const queryStr = `
    SELECT s.id, s.email, s.first_name, s.last_name, s.role, s.is_active
    FROM staff s
    LEFT JOIN staff_institutions si ON s.id = si.staff_id
    WHERE s.role NOT IN ('super_admin', 'admin', 'system')
      AND s.is_active = 1
      AND si.id IS NULL
    ORDER BY s.id ASC
  `;

  console.log("================================================================================");
  console.log("             THAIBAHIVE UNMAPPED STAFF INSTITUTION MAPPING PROPOSAL             ");
  console.log("================================================================================");
  console.log(`Execution Mode : ${isApply ? "🔴 LIVE APPLY (WRITE ENABLED)" : "🟢 DRY RUN (READ ONLY - NO WRITES)"}`);
  console.log(`Default Target : ${targetInstitutionId}`);
  console.log(`Timestamp      : ${new Date().toISOString()}\n`);

  const results = (await db.all(sql.raw(queryStr))) as UnmappedStaffRow[];
  console.log(`Discovered unmapped active non-admin staff records: ${results.length}\n`);

  if (results.length === 0) {
    console.log("✅ Zero unmapped active non-admin staff found. Database is 100% mapped.");
    return;
  }

  console.log("--------------------------------------------------------------------------------");
  console.log("PROPOSED STAFF INSTITUTION ASSIGNMENTS:");
  console.log("--------------------------------------------------------------------------------");

  for (let i = 0; i < results.length; i++) {
    const row = results[i];
    const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || "Unknown Name";
    console.log(
      `[${i + 1}/${results.length}] Staff ID: ${row.id.padEnd(36)} | Role: ${row.role.padEnd(10)} | Name: ${name.padEnd(20)} | Email: ${(row.email || "N/A").padEnd(25)} -> Proposed Institution: ${targetInstitutionId} (isPrimary: 1)`
    );
  }

  console.log("--------------------------------------------------------------------------------\n");

  if (!isApply) {
    console.log("🔒 [DRY-RUN MODE ACTIVE] No changes were written to the database.");
    console.log("To review and apply these assignments to the database, run with --apply:");
    console.log("   npx tsx scripts/db/proposals/backfill-unmapped-staff.ts --apply\n");
    return;
  }

  console.log("🚀 Applying proposed assignments to database...");
  for (const row of results) {
    await db.insert(staffInstitutions).values({
      id: `si-${crypto.randomUUID()}`,
      staffId: row.id,
      institutionId: targetInstitutionId,
    });
    console.log(`✅ Successfully mapped staff ${row.id} to ${targetInstitutionId}`);
  }

  console.log(`\n🎉 Backfill applied successfully. Total records inserted: ${results.length}`);
}

main().catch((err) => {
  console.error("Backfill proposal execution failed:", err);
  process.exit(1);
});
