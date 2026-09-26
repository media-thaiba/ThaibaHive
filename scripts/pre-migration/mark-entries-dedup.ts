import { db } from "../../packages/db";
import { markEntries } from "../../packages/db/schema";
import { inArray } from "drizzle-orm";

/**
 * Deduplicate mark_entries on composite key (exam_schedule_id, student_id)
 * Safe and idempotent.
 */
export async function deduplicateMarkEntries(dbClient: typeof db = db): Promise<{ duplicateGroups: number; deletedRows: number }> {
  console.log("[pre-migration] Checking mark_entries for duplicate records...");

  // Query all mark entries
  const allEntries = await dbClient.select({
    id: markEntries.id,
    examScheduleId: markEntries.examScheduleId,
    studentId: markEntries.studentId,
    createdAt: markEntries.createdAt,
  }).from(markEntries).all();

  // Group by composite key
  const groups = new Map<string, typeof allEntries>();

  for (const entry of allEntries) {
    const key = `${entry.examScheduleId}:::${entry.studentId}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  let duplicateGroups = 0;
  let deletedRows = 0;
  const idsToDelete: string[] = [];

  for (const [_key, entries] of groups.entries()) {
    if (entries.length > 1) {
      duplicateGroups++;
      // Sort to keep the latest one (by createdAt or by array index if equal)
      entries.sort((a: { createdAt?: string | null }, b: { createdAt?: string | null }) => 
        (b.createdAt || "").localeCompare(a.createdAt || "")
      );
      // The first entry is kept, delete the rest
      const redundant = entries.slice(1);
      for (const r of redundant) {
        idsToDelete.push(r.id);
      }
    }
  }

  if (idsToDelete.length > 0) {
    console.log(`[pre-migration] Found ${duplicateGroups} duplicate group(s) with ${idsToDelete.length} redundant row(s) to scrub.`);
    
    // Batch delete in chunks of 50 to avoid parameter limit issues
    const chunkSize = 50;
    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
      const chunk = idsToDelete.slice(i, i + chunkSize);
      await dbClient.delete(markEntries).where(inArray(markEntries.id, chunk)).run();
    }
    deletedRows = idsToDelete.length;
    console.log(`[pre-migration] Successfully scrubbed ${deletedRows} redundant mark_entries row(s).`);
  } else {
    console.log("[pre-migration] mark_entries is clean (0 duplicates found). No-op.");
  }

  return { duplicateGroups, deletedRows };
}

// Direct execution CLI runner
if (require.main === module || process.argv[1]?.includes("mark-entries-dedup")) {
  deduplicateMarkEntries()
    .then((result) => {
      console.log(`[pre-migration] Completed with ${result.deletedRows} row(s) cleaned.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[pre-migration] Error running mark-entries deduplication:", err);
      process.exit(1);
    });
}
