-- ==============================================================================
-- ThaibaHive: Enable Row-Level Security (RLS) on All Public Schema Tables
-- ==============================================================================
--
-- PURPOSE:
-- Supabase automatically exposes all tables in the `public` schema over its
-- REST and GraphQL APIs using the PostgREST engine. If Row Level Security is disabled
-- on a table, anyone with the project's anonymous public key (anon key) can query
-- or modify that table directly.
--
-- ThaibaHive connects to Postgres through the backend application using direct
-- database connection pooling (`postgres` or service role) which bypasses RLS.
-- Therefore, enabling RLS on all tables with no default public policies completely
-- blocks unauthorized PostgREST / anon-key access while leaving Next.js backend
-- operations 100% functional.
--
-- EXECUTION:
-- Run this script via Supabase SQL Editor or via `pnpm db:enable-rls` / psql.
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
    table_count INT := 0;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename NOT LIKE 'pg_%' 
          AND tablename NOT LIKE '_drizzle_%'
    ) 
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        table_count := table_count + 1;
        RAISE NOTICE 'Enabled RLS on public.%', r.tablename;
    END LOOP;
    
    RAISE NOTICE 'Successfully enabled Row Level Security on % tables.', table_count;
END $$;
