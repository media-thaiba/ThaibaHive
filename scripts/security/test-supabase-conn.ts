// @ts-expect-error missing types for pg in script context
import { Client } from "pg";

async function main() {
  const hosts = [
    { name: "pooler-session-5432", host: "aws-0-ap-northeast-2.pooler.supabase.com", port: 5432 },
    { name: "pooler-transaction-6543", host: "aws-0-ap-northeast-2.pooler.supabase.com", port: 6543 },
    { name: "direct-5432", host: "db.gdsbefqqsdzjjoigbaxu.supabase.co", port: 5432 },
  ];

  for (const h of hosts) {
    const user = "postgres.gdsbefqqsdzjjoigbaxu";
    const pw = encodeURIComponent("TH@supabase");
    const connStr = `postgresql://${user}:${pw}@${h.host}:${h.port}/postgres`;
    console.log(`Testing ${h.name} (${h.host}:${h.port})...`);
    const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      const res = await client.query("SELECT current_user, current_database(), version();");
      console.log(`  -> SUCCESS on ${h.name}!`, res.rows[0].version.substring(0, 30));
      await client.end();
    } catch (err: any) {
      console.log(`  -> Failed on ${h.name}: ${err.message}`);
      try { await client.end(); } catch {}
    }
  }
}

main().catch(console.error);

