import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function ensureAttendanceEventTablesExist(): Promise<void> {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS attendance_events (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      institution_id TEXT,
      client_event_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'geofence',
      effective_at INTEGER NOT NULL,
      time_trust TEXT NOT NULL DEFAULT 'server',
      device_claimed_at INTEGER,
      received_at INTEGER NOT NULL,
      local_date TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      accuracy_m REAL,
      is_mocked INTEGER NOT NULL DEFAULT 0,
      geofence_id TEXT,
      device_id TEXT,
      app_version TEXT,
      flags TEXT,
      is_pilot INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `);

  await db.run(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_att_events_staff_client ON attendance_events (staff_id, client_event_id);
  `);
  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_att_events_staff_date_eff ON attendance_events (staff_id, local_date, effective_at);
  `);
  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_att_events_inst ON attendance_events (institution_id);
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS attendance_days (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      institution_id TEXT,
      local_date TEXT NOT NULL,
      first_in INTEGER,
      last_out INTEGER,
      first_in_time TEXT,
      last_out_time TEXT,
      total_minutes INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'present',
      needs_review INTEGER NOT NULL DEFAULT 0,
      review_reason TEXT,
      is_pilot INTEGER NOT NULL DEFAULT 1,
      rebuilt_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `);

  await db.run(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_att_days_staff_date ON attendance_days (staff_id, local_date);
  `);
  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_att_days_inst_date ON attendance_days (institution_id, local_date);
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS punch_attempts (
      id TEXT PRIMARY KEY,
      staff_id TEXT,
      request_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      app_version TEXT,
      kind TEXT,
      method TEXT,
      outcome TEXT NOT NULL,
      reason TEXT,
      raw_payload_snippet TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
  `);

  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_punch_attempts_req ON punch_attempts (request_id);
  `);
  await db.run(sql`
    CREATE INDEX IF NOT EXISTS idx_punch_attempts_staff_created ON punch_attempts (staff_id, created_at);
  `);
}
