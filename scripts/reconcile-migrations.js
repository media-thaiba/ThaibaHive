const fs = require("node:fs");
const crypto = require("node:crypto");
const { createClient } = require("@libsql/client");

const client = createClient({
  url: "file:./dev.db"
});

async function main() {
  console.log("Reconciling database migrations...");
  const migrationFolderTo = "./drizzle";
  const journalPath = `${migrationFolderTo}/meta/_journal.json`;
  
  if (!fs.existsSync(journalPath)) {
    throw new Error(`Can't find meta/_journal.json file`);
  }
  
  const journal = JSON.parse(fs.readFileSync(journalPath).toString());
  
  // Get currently applied migration hashes
  const appliedResult = await client.execute("SELECT hash FROM __drizzle_migrations");
  const appliedHashes = new Set(appliedResult.rows.map(r => r.hash));
  console.log(`Currently applied migrations in DB: ${appliedHashes.size}`);
  
  // Reconcile entries up to 0022 (index 22)
  for (const entry of journal.entries) {
    if (entry.tag === "0023_special_annihilus") {
      console.log(`Skipping new migration ${entry.tag} to let migrator run it.`);
      continue;
    }
    
    const query = fs.readFileSync(`${migrationFolderTo}/${entry.tag}.sql`).toString();
    const hash = crypto.createHash("sha256").update(query).digest("hex");
    
    if (!appliedHashes.has(hash)) {
      console.log(`Marking migration ${entry.tag} (hash: ${hash.substring(0, 10)}...) as applied.`);
      await client.execute({
        sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
        args: [hash, entry.when]
      });
    } else {
      console.log(`Migration ${entry.tag} already registered.`);
    }
  }
  
  console.log("Reconciliation complete.");
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Reconciliation failed:", err);
    process.exit(1);
  });
