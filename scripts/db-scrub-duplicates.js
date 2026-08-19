const { createClient } = require("@libsql/client");
const client = createClient({
  url: process.env.DATABASE_URL || "file:./dev.db"
});

async function scrub() {
  console.log("[Data Scrubbing] Connecting to database...");
  
  // Find duplicates count
  const duplicates = await client.execute(`
    SELECT exam_schedule_id, student_id, count(*) as count 
    FROM mark_entries 
    GROUP BY exam_schedule_id, student_id 
    HAVING count(*) > 1
  `);

  console.log(`[Data Scrubbing] Found ${duplicates.rows.length} groups of duplicate mark entries.`);

  if (duplicates.rows.length > 0) {
    console.log("[Data Scrubbing] Cleaning up duplicates, keeping latest by updated_at...");
    
    const result = await client.execute(`
      DELETE FROM mark_entries
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY exam_schedule_id, student_id 
            ORDER BY updated_at DESC, created_at DESC, id DESC
          ) as rn
          FROM mark_entries
        ) WHERE rn = 1
      )
    `);
    
    console.log(`[Data Scrubbing] Cleaned up ${result.rowsAffected} duplicate rows.`);
  } else {
    console.log("[Data Scrubbing] No duplicates found.");
  }
}

scrub()
  .then(() => {
    console.log("[Data Scrubbing] Completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[Data Scrubbing] Error:", err);
    process.exit(1);
  });
