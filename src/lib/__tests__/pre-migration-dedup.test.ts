import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { markEntries } from "@/db/schema";
import { deduplicateMarkEntries } from "../../../scripts/pre-migration/mark-entries-dedup";

describe("PM-002: Pre-migration mark_entries Deduplication Integration Tests", () => {
  let client: ReturnType<typeof createClient>;
  let testDb: ReturnType<typeof drizzle>;

  beforeEach(async () => {
    client = createClient({ url: ":memory:" });
    await client.execute(`
      CREATE TABLE mark_entries (
        id TEXT PRIMARY KEY,
        exam_schedule_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        marks_obtained REAL,
        max_marks REAL DEFAULT 100,
        is_absent INTEGER DEFAULT 0,
        evaluator_token TEXT,
        double_blind INTEGER DEFAULT 0,
        remarks TEXT,
        status TEXT DEFAULT 'draft',
        entered_by_staff_id TEXT,
        moderated_by_staff_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    testDb = drizzle(client, { schema });
  });

  afterEach(() => {
    client.close();
  });

  it("should seed duplicate mark_entries in real SQLite database, deduplicate, and assert uniqueness and retention", async () => {
    // 1. Seed duplicate entries:
    // Pair A: (sched-1, stud-1) -> 3 duplicate rows with different timestamps
    // Pair B: (sched-1, stud-2) -> 1 row (unique)
    // Pair C: (sched-2, stud-1) -> 2 duplicate rows
    const seedStatements = [
      // Pair A
      `INSERT INTO mark_entries (id, exam_schedule_id, student_id, marks_obtained, created_at) VALUES ('me-a1', 'sched-1', 'stud-1', 75, '2026-08-10T08:00:00.000Z');`,
      `INSERT INTO mark_entries (id, exam_schedule_id, student_id, marks_obtained, created_at) VALUES ('me-a2', 'sched-1', 'stud-1', 82, '2026-08-10T12:00:00.000Z');`, // latest for Pair A
      `INSERT INTO mark_entries (id, exam_schedule_id, student_id, marks_obtained, created_at) VALUES ('me-a3', 'sched-1', 'stud-1', 78, '2026-08-10T10:00:00.000Z');`,
      // Pair B (unique)
      `INSERT INTO mark_entries (id, exam_schedule_id, student_id, marks_obtained, created_at) VALUES ('me-b1', 'sched-1', 'stud-2', 90, '2026-08-10T09:00:00.000Z');`,
      // Pair C
      `INSERT INTO mark_entries (id, exam_schedule_id, student_id, marks_obtained, created_at) VALUES ('me-c1', 'sched-2', 'stud-1', 65, '2026-08-10T09:00:00.000Z');`,
      `INSERT INTO mark_entries (id, exam_schedule_id, student_id, marks_obtained, created_at) VALUES ('me-c2', 'sched-2', 'stud-1', 88, '2026-08-10T14:00:00.000Z');`, // latest for Pair C
    ];

    for (const sql of seedStatements) {
      await client.execute(sql);
    }

    // Verify initial state: 6 total rows, 2 duplicate groups
    const initialCount = await client.execute("SELECT COUNT(*) as count FROM mark_entries");
    expect(Number(initialCount.rows[0].count)).toBe(6);

    const initialDuplicateGroups = await client.execute(`
      SELECT exam_schedule_id, student_id, COUNT(*) as cnt 
      FROM mark_entries 
      GROUP BY exam_schedule_id, student_id 
      HAVING COUNT(*) > 1
    `);
    expect(initialDuplicateGroups.rows).toHaveLength(2);

    // 2. Execute deduplication
    const result = await deduplicateMarkEntries(testDb);

    expect(result.duplicateGroups).toBe(2);
    expect(result.deletedRows).toBe(3); // 2 from pair A, 1 from pair C

    // 3. Uniqueness assertion: No composite key has count > 1
    const postDuplicateGroups = await client.execute(`
      SELECT exam_schedule_id, student_id, COUNT(*) as cnt 
      FROM mark_entries 
      GROUP BY exam_schedule_id, student_id 
      HAVING COUNT(*) > 1
    `);
    expect(postDuplicateGroups.rows).toHaveLength(0);

    // 4. Total row count equals unique composite keys (3 unique pairs)
    const postCount = await client.execute("SELECT COUNT(*) as count FROM mark_entries");
    expect(Number(postCount.rows[0].count)).toBe(3);

    // 5. Retention assertion: Latest records (me-a2, me-b1, me-c2) are retained
    const remainingRows = await client.execute("SELECT id, marks_obtained FROM mark_entries ORDER BY id");
    const remainingIds = remainingRows.rows.map(r => String(r.id));
    expect(remainingIds).toEqual(["me-a2", "me-b1", "me-c2"]);

    // Verify specific latest marks preserved
    const rowA = remainingRows.rows.find(r => r.id === "me-a2");
    expect(Number(rowA?.marks_obtained)).toBe(82);

    const rowC = remainingRows.rows.find(r => r.id === "me-c2");
    expect(Number(rowC?.marks_obtained)).toBe(88);
  });

  it("should be idempotent: 0 deleted rows and table remains untouched on clean database", async () => {
    await client.execute(`INSERT INTO mark_entries (id, exam_schedule_id, student_id, marks_obtained, created_at) VALUES ('me-1', 'sched-1', 'stud-1', 95, '2026-08-10T10:00:00.000Z');`);
    await client.execute(`INSERT INTO mark_entries (id, exam_schedule_id, student_id, marks_obtained, created_at) VALUES ('me-2', 'sched-1', 'stud-2', 88, '2026-08-10T10:00:00.000Z');`);

    const firstRun = await deduplicateMarkEntries(testDb);
    expect(firstRun.duplicateGroups).toBe(0);
    expect(firstRun.deletedRows).toBe(0);

    const rowCount = await client.execute("SELECT COUNT(*) as count FROM mark_entries");
    expect(Number(rowCount.rows[0].count)).toBe(2);
  });
});
