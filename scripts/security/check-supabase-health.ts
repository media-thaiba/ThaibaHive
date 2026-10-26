// @ts-ignore
import { Client } from "pg";

async function main() {
  const user = "postgres.gdsbefqqsdzjjoigbaxu";
  const pw = encodeURIComponent("TH@supabase");
  const connStr = `postgresql://${user}:${pw}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`;
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log("=== Checking Database Health & Extensions ===");
  const ext = await client.query(`SELECT extname, extversion FROM pg_extension;`);
  console.log("Installed Extensions:", ext.rows.map((r: any) => `${r.extname} (${r.extversion})`).join(", "));

  console.log("\n=== Checking Database Conflict / Deadlock / Error Stats ===");
  const dbStats = await client.query(`
    SELECT datname, xact_commit, xact_rollback, blks_read, blks_hit, conflicts, deadlocks 
    FROM pg_stat_database 
    WHERE datname = 'postgres';
  `);
  console.log("Database Stats:", dbStats.rows[0]);

  console.log("\n=== Checking Realtime Publication Status ===");
  const pub = await client.query(`
    SELECT pubname, puballtables, pubinsert, pubupdate, pubdelete 
    FROM pg_publication;
  `);
  console.log("Publications:", pub.rows);

  const pubTables = await client.query(`
    SELECT schemaname, tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime';
  `);
  console.log("Tables in supabase_realtime publication:", pubTables.rows.length);

  await client.end();
}

main().catch(console.error);
