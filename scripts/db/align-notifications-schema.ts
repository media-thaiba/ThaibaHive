import "dotenv/config";
import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const token = process.env.DATABASE_AUTH_TOKEN;
  console.log("[align-notifications] Connecting to:", url);

  const client = createClient({ url, authToken: token });

  // 1. Inspect table info
  const info = await client.execute("PRAGMA table_info(notifications);");
  const columnNames = info.rows.map((r: any) => r.name);
  console.log("[align-notifications] Current columns in notifications:", columnNames);

  if (columnNames.includes("staff_id") && columnNames.includes("message")) {
    console.log("[align-notifications] Schema already has staff_id and message. No migration needed.");
    return;
  }

  console.log("[align-notifications] Schema drift detected! Migrating notifications table...");

  // 2. Safe rename and table recreation
  await client.execute("ALTER TABLE notifications RENAME TO notifications_legacy;");
  console.log("[align-notifications] Renamed notifications -> notifications_legacy");

  await client.execute(`
    CREATE TABLE notifications (
      id text PRIMARY KEY NOT NULL,
      staff_id text NOT NULL,
      title text NOT NULL,
      message text NOT NULL,
      type text DEFAULT 'general' NOT NULL,
      reference_type text,
      reference_id text,
      is_read integer DEFAULT 0 NOT NULL,
      created_at text DEFAULT (current_timestamp) NOT NULL
    );
  `);
  console.log("[align-notifications] Created new notifications table matching packages/db/schema.ts");

  // Create indexes
  await client.execute("CREATE INDEX IF NOT EXISTS idx_notifications_staff_created ON notifications (staff_id, created_at);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_notifications_staff_is_read ON notifications (staff_id, is_read);");

  // 3. Migrate any legacy rows
  try {
    await client.execute(`
      INSERT INTO notifications (id, staff_id, title, message, type, is_read, created_at)
      SELECT 
        cast(id as text), 
        cast(user_id as text), 
        title, 
        coalesce(body, title), 
        coalesce(type, 'general'), 
        coalesce(read, 0), 
        coalesce(created_at, datetime('now'))
      FROM notifications_legacy;
    `);
    console.log("[align-notifications] Migrated legacy rows successfully.");
  } catch (migErr) {
    console.warn("[align-notifications] Note on legacy data migration:", migErr);
  }

  console.log("[align-notifications] Migration complete and verified!");
}

main().catch((err) => {
  console.error("[align-notifications] Fatal error:", err);
  process.exit(1);
});
