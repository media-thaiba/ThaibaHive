-- Production Read-Only Query: Identify Active Staff Without Institution Mapping
-- Target: SQLite and PostgreSQL Compatible
-- Note: This query has NOT been run against the production database.

SELECT 
    s.id AS staff_id,
    TRIM(s.first_name || ' ' || s.last_name) AS full_name,
    s.email,
    s.role,
    s.is_active,
    s.created_at
FROM staff s
LEFT JOIN staff_institutions si ON s.id = si.staff_id
WHERE si.staff_id IS NULL
  AND s.role NOT IN ('super_admin', 'admin', 'system')
  AND s.is_active = 1
ORDER BY s.created_at DESC;
