-- Pre-migration script: Create roles and establish default privileges

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'thaibahive_maintenance') THEN
    CREATE ROLE thaibahive_maintenance WITH LOGIN BYPASSRLS PASSWORD 'spike_maint_password';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'thaibahive_app') THEN
    CREATE ROLE thaibahive_app WITH LOGIN PASSWORD 'spike_runtime_password';
  END IF;
  -- Mock Supabase public roles for local test verification
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

-- Schema usage and create permissions
GRANT ALL ON SCHEMA public TO thaibahive_maintenance;
GRANT USAGE ON SCHEMA public TO thaibahive_app;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Default privileges for future tables created by the maintenance role
ALTER DEFAULT PRIVILEGES FOR ROLE thaibahive_maintenance IN SCHEMA public 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO thaibahive_app;

