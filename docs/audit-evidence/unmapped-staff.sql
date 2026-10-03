-- Production Read-Only Query: Identify Active Staff Without Institution Mapping
-- Target: SQLite and PostgreSQL Compatible
-- Purpose: Safely lists all active staff members with 0 entries in staff_institutions

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
  AND s.role != 'super_admin'
  AND (s.is_active = TRUE OR s.is_active = 1 OR s.is_active IS NULL)
ORDER BY s.created_at DESC;
