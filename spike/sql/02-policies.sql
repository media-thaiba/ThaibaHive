-- Post-migration script: Apply column grants, audit revokes, and FORCE RLS

-- 1. Column-limited grant on institutions for tenant discovery
REVOKE ALL ON institutions FROM thaibahive_app;
GRANT SELECT (id, slug, name) ON institutions TO thaibahive_app;

-- 2. Revoke mutations on append-only audit & financial ledger tables
REVOKE UPDATE, DELETE ON hostel_gate_logs FROM thaibahive_app;
REVOKE UPDATE, DELETE ON hostel_fine_actions FROM thaibahive_app;

-- 3. Enable and FORCE Row Level Security on all 11 hostel tables
DO $$ 
DECLARE 
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'hostel_settings', 'hostel_blocks', 'hostel_block_wardens', 'hostel_rooms', 
    'hostel_beds', 'hostel_bed_allocations', 'hostel_leaves', 'hostel_gate_passes', 
    'hostel_gate_logs', 'hostel_fines', 'hostel_fine_actions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_policy ON %I FOR ALL TO thaibahive_app USING (institution_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')) WITH CHECK (institution_id = NULLIF(current_setting(''app.current_tenant_id'', true), ''''));',
      tbl
    );
  END LOOP;
END $$;
