// @ts-expect-error missing types for pg in script context
import { Client } from "pg";

async function main() {
  const user = "postgres.gdsbefqqsdzjjoigbaxu";
  const pw = encodeURIComponent("TH@supabase");
  const connStr = `postgresql://${user}:${pw}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`;
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const act = await client.query(`
    SELECT pid, usename, state, wait_event_type, wait_event, query_start, query 
    FROM pg_stat_activity 
    WHERE usename = 'postgres' AND pid <> pg_backend_pid();
  `);
  console.log("Active queries:", JSON.stringify(act.rows, null, 2));

  const tables = await client.query(`
    SELECT count(*)::int as count 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `);
  console.log("Current table count:", tables.rows[0].count);

  const migrations = await client.query(`
    SELECT * FROM information_schema.tables WHERE table_schema = 'drizzle';
  `);
  console.log("Drizzle schema tables:", migrations.rows.map((r: any) => r.table_name));

  if (migrations.rows.length > 0) {
    const migs = await client.query(`SELECT * FROM drizzle.__drizzle_migrations;`);
    console.log("Migrations applied so far:", migs.rows);
  }

  await client.end();
}

main().catch(console.error);
