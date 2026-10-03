import { db, staffInstitutions } from "@thaiba/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

async function main() {
  const queryStr = `
    SELECT s.id, s.email, s.first_name, s.last_name, s.role, s.is_active
    FROM staff s
    LEFT JOIN staff_institutions si ON s.id = si.staff_id
    WHERE s.role NOT IN ('super_admin', 'admin', 'system')
      AND s.is_active = 1
      AND si.id IS NULL
  `;

  const results = (await db.all(sql.raw(queryStr))) as Array<{ id: string }>;
  console.log(`Found ${results.length} unmapped active non-admin staff records.`);

  for (const row of results) {
    await db.insert(staffInstitutions).values({
      id: `si-${crypto.randomUUID()}`,
      staffId: row.id,
      institutionId: "inst_campus_main",
      isPrimary: 1,
      createdAt: new Date().toISOString(),
    });
    console.log(`Mapped staff ${row.id} to inst_campus_main`);
  }

  console.log("Backfill completed.");
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
