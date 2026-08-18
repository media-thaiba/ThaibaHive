-- Pre-Migration Deduplication Script for mark_entries
-- Target: Deduplicate rows on (exam_schedule_id, student_id) composite unique key, keeping the latest record.
-- Safe & Idempotent: Only deletes redundant duplicate rows when duplicates exist.

-- ==============================================================================
-- 1. DETECTION QUERY: Check if duplicate mark entries exist
-- ==============================================================================
-- SELECT exam_schedule_id, student_id, COUNT(*) as cnt
-- FROM mark_entries
-- GROUP BY exam_schedule_id, student_id
-- HAVING COUNT(*) > 1;

-- ==============================================================================
-- 2. SQLITE SCRUBBING QUERY: Keep latest rowid for each (exam_schedule_id, student_id)
-- ==============================================================================
DELETE FROM mark_entries
WHERE rowid NOT IN (
    SELECT MAX(rowid)
    FROM mark_entries
    GROUP BY exam_schedule_id, student_id
);

-- ==============================================================================
-- 3. POSTGRESQL SCRUBBING QUERY: Keep latest ctid or id based on created_at
-- ==============================================================================
-- DELETE FROM mark_entries a USING (
--     SELECT MIN(ctid) as ctid, exam_schedule_id, student_id
--     FROM mark_entries
--     GROUP BY exam_schedule_id, student_id HAVING COUNT(*) > 1
-- ) b
-- WHERE a.exam_schedule_id = b.exam_schedule_id
--   AND a.student_id = b.student_id
--   AND a.ctid <> b.ctid;
