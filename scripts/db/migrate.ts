import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";
import { migrate as pgMigrate } from "drizzle-orm/node-postgres/migrator";
import { db, rawPgDb, isPostgres } from "../../packages/db";

function getEnvUrl(): { url: string; authToken?: string } {
  let url = process.env.DATABASE_URL || "";
  let authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url && fs.existsSync(".env")) {
    for (const l of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
      if (l.startsWith("DATABASE_URL=")) url = l.split("=")[1].trim().replace(/^['"]|['"]$/g, "");
      if (l.startsWith("DATABASE_AUTH_TOKEN=")) authToken = l.split("=")[1].trim().replace(/^['"]|['"]$/g, "");
    }
  }

  return { url: url || "file:./dev.db", authToken };
}

export async function runMigrations() {
  if (isPostgres) {
    console.log("[db:migrate] Running PostgreSQL migrations from ./drizzle/postgres...");
    await pgMigrate(rawPgDb || (db as any), { migrationsFolder: "./drizzle/postgres" });
  } else {
    const { url, authToken } = getEnvUrl();
    console.log(`[db:migrate] Applying SQLite/LibSQL migrations from ./drizzle to ${url.split("@").pop()}...`);
    const client = createClient({ url, authToken });

    // In SQLite, foreign key checks must be disabled during DDL table rebuilds
    await client.execute("PRAGMA foreign_keys = OFF");

    // Ensure migration tracking table exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "__drizzle_applied_migrations" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL UNIQUE,
        "applied_at" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
      )
    `);

    const appliedRes = await client.execute("SELECT name FROM __drizzle_applied_migrations");
    const appliedSet = new Set(appliedRes.rows.map(r => r.name as string));

    const drizzleDir = path.resolve(process.cwd(), "drizzle");
    const migrationFiles = fs.readdirSync(drizzleDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    let appliedCount = 0;
    for (const file of migrationFiles) {
      if (appliedSet.has(file)) continue;

      const rawSql = fs.readFileSync(path.join(drizzleDir, file), "utf8");
      const stmts = rawSql
        .split("--> statement-breakpoint")
        .map(s => s.trim())
        .filter(Boolean);

      console.log(`[db:migrate] Applying ${file} (${stmts.length} statements)...`);

      // Transactional execution per migration file
      const tx = await client.transaction("write");
      try {
        for (const stmt of stmts) {
          try {
            await tx.execute(stmt);
          } catch (err: any) {
            const isIdempotentSkip =
              err.message?.includes("already exists") ||
              err.message?.includes("duplicate column") ||
              err.message?.includes("columns are not unique") ||
              err.message?.includes("no such table") ||
              err.message?.includes("no such index");

            if (isIdempotentSkip) {
              console.warn(`[db:migrate] ℹ️ Idempotent skip in ${file}: ${err.message.slice(0, 80)}`);
            } else {
              // Fail hard on real errors (like 'no such table', syntax error, etc.)
              console.error(`[db:migrate] ❌ Error executing statement in ${file}:`, stmt);
              throw err;
            }
          }
        }

        await tx.execute({
          sql: "INSERT OR IGNORE INTO __drizzle_applied_migrations (name) VALUES (?)",
          args: [file],
        });

        await tx.commit();
        appliedCount++;
        console.log(`[db:migrate] ✅ ${file} applied and committed.`);
      } catch (err) {
        await tx.rollback();
        console.error(`[db:migrate] Rolled back ${file} due to failure.`);
        throw err;
      } finally {
        tx.close();
      }
    }

    await client.execute("PRAGMA foreign_keys = ON");

    // Ensure SQLite columns and tables match current schema.ts definitions
    const ensureColumn = async (table: string, col: string, def: string) => {
      try {
        await client.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
      } catch (err: any) {
        if (!err.message?.includes("duplicate column") && !err.message?.includes("already exists")) {
          // ignore
        }
      }
    };

    await ensureColumn("institutions", "allocated_budget", "REAL DEFAULT 0");
    await ensureColumn("institutions", "fiscal_year", "TEXT");
    await ensureColumn("staff", "face_embedding", "TEXT");
    await ensureColumn("staff", "face_registered_at", "TEXT");
    await ensureColumn("staff", "fingerprint_hash", "TEXT");
    await ensureColumn("staff", "fingerprint_registered_at", "TEXT");
    await ensureColumn("staff", "biometric_enabled", "INTEGER DEFAULT 0 NOT NULL");
    await ensureColumn("staff", "model_version", "TEXT DEFAULT 'facenet-512d-v1'");
    await ensureColumn("staff", "biometric_status", "TEXT DEFAULT 'active'");
    await ensureColumn("staff", "google_sub", "TEXT");
    await ensureColumn("performance_reviews", "institution_id", "TEXT");
    await ensureColumn("performance_reviews", "cycle_id", "TEXT");
    await ensureColumn("performance_reviews", "evaluator_staff_id", "TEXT");
    await ensureColumn("performance_reviews", "form_template_id", "TEXT");
    await ensureColumn("performance_reviews", "self_score", "REAL");
    await ensureColumn("performance_reviews", "manager_score", "REAL");
    await ensureColumn("performance_reviews", "final_score", "REAL");
    await ensureColumn("performance_reviews", "grade", "TEXT");
    await ensureColumn("performance_reviews", "self_comments", "TEXT");
    await ensureColumn("performance_reviews", "manager_comments", "TEXT");
    await ensureColumn("performance_reviews", "hr_comments", "TEXT");
    await ensureColumn("performance_reviews", "achievements", "TEXT");
    await ensureColumn("performance_reviews", "areas_for_improvement", "TEXT");
    await ensureColumn("performance_reviews", "goals", "TEXT");
    await ensureColumn("performance_reviews", "ratings_json", "TEXT");
    await ensureColumn("performance_reviews", "submitted_at", "TEXT");
    await ensureColumn("performance_reviews", "approved_at", "TEXT");
    await ensureColumn("performance_reviews", "completed_at", "TEXT");

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`performance_cycles\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`institution_id\` text NOT NULL,
        \`title\` text NOT NULL,
        \`cycle_type\` text DEFAULT 'quarterly' NOT NULL,
        \`start_date\` text NOT NULL,
        \`end_date\` text NOT NULL,
        \`self_assessment_deadline\` text NOT NULL,
        \`manager_review_deadline\` text NOT NULL,
        \`status\` text DEFAULT 'draft' NOT NULL,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL,
        \`updated_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`competency_frameworks\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`institution_id\` text NOT NULL,
        \`name\` text NOT NULL,
        \`department_id\` text,
        \`role_scope\` text DEFAULT 'all',
        \`metrics_json\` text NOT NULL,
        \`is_active\` integer DEFAULT 1 NOT NULL,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL,
        \`updated_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`evaluation_forms\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`institution_id\` text NOT NULL,
        \`framework_id\` text NOT NULL,
        \`title\` text NOT NULL,
        \`description\` text,
        \`metrics_config_json\` text NOT NULL,
        \`rating_scale\` text DEFAULT '1-5',
        \`is_active\` integer DEFAULT 1 NOT NULL,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL,
        \`updated_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`performance_goals\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`institution_id\` text NOT NULL,
        \`staff_id\` text NOT NULL,
        \`review_id\` text,
        \`title\` text NOT NULL,
        \`description\` text,
        \`target_date\` text NOT NULL,
        \`progress_percentage\` integer DEFAULT 0 NOT NULL,
        \`status\` text DEFAULT 'in_progress' NOT NULL,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL,
        \`updated_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`feedback_requests\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`institution_id\` text NOT NULL,
        \`review_id\` text NOT NULL,
        \`requester_staff_id\` text NOT NULL,
        \`peer_staff_id\` text NOT NULL,
        \`feedback_text\` text,
        \`rating\` real,
        \`status\` text DEFAULT 'pending' NOT NULL,
        \`submitted_at\` text,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);


        await client.execute(`
      CREATE TABLE IF NOT EXISTS \`canteen_items\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`institution_id\` text NOT NULL,
        \`name\` text NOT NULL,
        \`category\` text DEFAULT 'snacks' NOT NULL,
        \`price\` real NOT NULL,
        \`is_available\` integer DEFAULT 1 NOT NULL,
        \`dietary_flags\` text,
        \`image_url\` text,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`canteen_menus\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`institution_id\` text NOT NULL,
        \`date\` text NOT NULL,
        \`meal_type\` text NOT NULL,
        \`items_json\` text NOT NULL,
        \`is_active\` integer DEFAULT 1 NOT NULL,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`canteen_meal_passes\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`institution_id\` text NOT NULL,
        \`user_id\` text NOT NULL,
        \`pass_code\` text NOT NULL UNIQUE,
        \`balance\` real DEFAULT 0 NOT NULL,
        \`currency\` text DEFAULT 'INR' NOT NULL,
        \`status\` text DEFAULT 'active' NOT NULL,
        \`daily_limit\` real,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL,
        \`updated_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`canteen_transactions\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`institution_id\` text NOT NULL,
        \`pass_id\` text NOT NULL,
        \`pass_code\` text NOT NULL,
        \`user_id\` text NOT NULL,
        \`items_json\` text NOT NULL,
        \`total_amount\` real NOT NULL,
        \`idempotency_key\` text UNIQUE,
        \`cashier_staff_id\` text,
        \`status\` text DEFAULT 'completed' NOT NULL,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`tabulation_registers\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`exam_id\` text NOT NULL,
        \`student_id\` text NOT NULL,
        \`total_marks\` real DEFAULT 0 NOT NULL,
        \`percentage\` real DEFAULT 0 NOT NULL,
        \`gpa\` real DEFAULT 0 NOT NULL,
        \`letter_grade\` text DEFAULT 'F' NOT NULL,
        \`result_status\` text DEFAULT 'pending' NOT NULL,
        \`rank\` integer,
        \`published_at\` text,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`exam_audit_logs\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`exam_id\` text NOT NULL,
        \`entity_type\` text NOT NULL,
        \`entity_id\` text NOT NULL,
        \`action\` text NOT NULL,
        \`performed_by_staff_id\` text,
        \`previous_state\` text,
        \`new_state\` text,
        \`reason\` text,
        \`timestamp\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`swarm_topology\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`node_id\` text NOT NULL,
        \`tier\` text NOT NULL,
        \`status\` text NOT NULL,
        \`last_seen_at\` text NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`swarm_events\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`event_source\` text NOT NULL,
        \`severity\` text NOT NULL,
        \`message\` text NOT NULL,
        \`timestamp\` text NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`swarm_metrics\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`node_id\` text NOT NULL,
        \`metric_name\` text NOT NULL,
        \`metric_value\` real NOT NULL,
        \`timestamp\` text NOT NULL
      )
    `);

await client.execute(`
      CREATE TABLE IF NOT EXISTS \`guardians\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`relationship\` text NOT NULL,
        \`phone\` text NOT NULL,
        \`email\` text,
        \`occupation\` text,
        \`address\` text,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL,
        \`updated_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`grade_scales\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`institution_id\` text NOT NULL,
        \`name\` text NOT NULL,
        \`scale_type\` text DEFAULT '10_point' NOT NULL,
        \`rules_json\` text NOT NULL,
        \`is_default\` integer DEFAULT 0 NOT NULL,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`exams\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`institution_id\` text NOT NULL,
        \`title\` text NOT NULL,
        \`academic_year\` text NOT NULL,
        \`term\` text NOT NULL,
        \`start_date\` text NOT NULL,
        \`end_date\` text NOT NULL,
        \`grade_scale_id\` text,
        \`status\` text DEFAULT 'draft' NOT NULL,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL,
        \`updated_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`exam_schedules\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`exam_id\` text NOT NULL,
        \`course_id\` text,
        \`subject_name\` text NOT NULL,
        \`exam_date\` text NOT NULL,
        \`start_time\` text NOT NULL,
        \`end_time\` text NOT NULL,
        \`duration_minutes\` integer DEFAULT 180 NOT NULL,
        \`max_marks\` real DEFAULT 100 NOT NULL,
        \`pass_marks\` real DEFAULT 40 NOT NULL,
        \`room_number\` text,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`hall_tickets\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`exam_id\` text NOT NULL,
        \`student_id\` text NOT NULL,
        \`ticket_number\` text NOT NULL UNIQUE,
        \`fee_cleared\` integer DEFAULT 0 NOT NULL,
        \`override_fee_lock\` integer DEFAULT 0 NOT NULL,
        \`override_reason\` text,
        \`override_by_staff_id\` text,
        \`qr_payload\` text NOT NULL,
        \`status\` text DEFAULT 'issued' NOT NULL,
        \`issued_at\` text DEFAULT (current_timestamp) NOT NULL,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`mark_entries\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`exam_schedule_id\` text NOT NULL,
        \`student_id\` text NOT NULL,
        \`marks_obtained\` real,
        \`max_marks\` real DEFAULT 100 NOT NULL,
        \`is_absent\` integer DEFAULT 0 NOT NULL,
        \`evaluator_token\` text,
        \`double_blind\` integer DEFAULT 0 NOT NULL,
        \`remarks\` text,
        \`status\` text DEFAULT 'draft' NOT NULL,
        \`entered_by_staff_id\` text,
        \`moderated_by_staff_id\` text,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL,
        \`updated_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS \`attendance_locations\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`institution_id\` text,
        \`nfc_tag_id\` text,
        \`qr_secret\` text NOT NULL,
        \`is_active\` integer DEFAULT 1 NOT NULL,
        \`latitude\` real,
        \`longitude\` real,
        \`radius\` real,
        \`accuracy\` real,
        \`wifi_ssids\` text,
        \`deleted_at\` text,
        \`created_at\` text DEFAULT (current_timestamp) NOT NULL,
        \`updated_at\` text DEFAULT (current_timestamp) NOT NULL
      )
    `);

    if (appliedCount === 0) {
      console.log("[db:migrate] All SQLite/LibSQL migrations are already up to date.");
    } else {
      console.log(`[db:migrate] Successfully applied ${appliedCount} migration(s).`);
    }
  }
  console.log("[db:migrate] Migrations completed successfully.");
}

const isMainModule = typeof require !== "undefined"
  ? require.main === module
  : process.argv[1]?.includes("migrate");

if (isMainModule || process.argv[1]?.includes("migrate") || process.env.DB_MIGRATE_RUN === "1") {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[db:migrate] Migration error:", err);
      process.exit(1);
    });
}
