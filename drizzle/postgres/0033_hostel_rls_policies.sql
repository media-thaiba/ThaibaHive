-- Custom SQL migration: Hostel Multi-Tenant Security & Append-Only Ledger Governance

-- 1. Ensure thaibahive_app runtime role exists (fail-safe for dev, staging, and local environments)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'thaibahive_app') THEN
    CREATE ROLE thaibahive_app;
  END IF;
END $$;
--> statement-breakpoint

-- 2. Revoke mutations on append-only audit & financial ledger tables
REVOKE UPDATE, DELETE ON hostel_gate_logs FROM thaibahive_app;
--> statement-breakpoint
REVOKE UPDATE, DELETE ON hostel_fine_actions FROM thaibahive_app;
--> statement-breakpoint

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
--> statement-breakpoint

-- 4. Database-level immutability triggers for append-only ledgers (enforced on ALL roles including table owners and BYPASSRLS roles)
CREATE OR REPLACE FUNCTION prevent_hostel_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hostel ledger tables (hostel_gate_logs, hostel_fine_actions) are append-only. UPDATE and DELETE operations are strictly prohibited.'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_immutable_hostel_gate_logs ON hostel_gate_logs;
CREATE TRIGGER trg_immutable_hostel_gate_logs
BEFORE UPDATE OR DELETE ON hostel_gate_logs
FOR EACH ROW EXECUTE FUNCTION prevent_hostel_ledger_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_immutable_hostel_fine_actions ON hostel_fine_actions;
CREATE TRIGGER trg_immutable_hostel_fine_actions
BEFORE UPDATE OR DELETE ON hostel_fine_actions
FOR EACH ROW EXECUTE FUNCTION prevent_hostel_ledger_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_immutable_hostel_gate_logs_truncate ON hostel_gate_logs;
CREATE TRIGGER trg_immutable_hostel_gate_logs_truncate
BEFORE TRUNCATE ON hostel_gate_logs
FOR EACH STATEMENT EXECUTE FUNCTION prevent_hostel_ledger_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_immutable_hostel_fine_actions_truncate ON hostel_fine_actions;
CREATE TRIGGER trg_immutable_hostel_fine_actions_truncate
BEFORE TRUNCATE ON hostel_fine_actions
FOR EACH STATEMENT EXECUTE FUNCTION prevent_hostel_ledger_mutation();
