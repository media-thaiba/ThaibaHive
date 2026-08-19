const { createClient } = require("@libsql/client");
const client = createClient({
  url: "file:./dev.db"
});

async function main() {
  const result = await client.execute("SELECT * FROM sqlite_master WHERE type='table'");
  console.log("Tables in database:", result.rows.map(r => r.name));
  
  try {
    const migrations = await client.execute("SELECT * FROM __drizzle_migrations ORDER BY created_at DESC");
    console.log("Applied migrations:", migrations.rows);
  } catch (e) {
    console.error("Failed to query __drizzle_migrations:", e.message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
