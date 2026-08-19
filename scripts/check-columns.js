const { createClient } = require("@libsql/client");
const client = createClient({
  url: "file:./dev.db"
});

async function main() {
  try {
    const result = await client.execute("PRAGMA table_info(preference_audit_log)");
    console.log("Columns of preference_audit_log:", result.rows.map(r => r.name));
  } catch (e) {
    console.error(e);
  }
}

main().then(() => process.exit(0));
