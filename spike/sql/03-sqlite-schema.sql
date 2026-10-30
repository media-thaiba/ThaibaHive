-- SQLite DDL for ThaibaHive Hostel ERP (Dual-Dialect Parity)
PRAGMA foreign_keys = ON;

-- 1. Stub parent tables with required composite unique targets
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  admission_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  UNIQUE(institution_id, id),
  UNIQUE(institution_id, admission_number)
);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_institutions (
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  role TEXT NOT NULL,
  UNIQUE(institution_id, staff_id)
);

CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  is_current TEXT NOT NULL DEFAULT 'true',
  UNIQUE(institution_id, id)
);

-- 2. 11 Hostel ERP Tables
CREATE TABLE IF NOT EXISTS hostel_settings (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL UNIQUE REFERENCES institutions(id) ON DELETE RESTRICT,
  late_fine_rate_per_day_minor INTEGER NOT NULL DEFAULT 5000,
  grace_period_minutes INTEGER NOT NULL DEFAULT 60,
  rounding_rule TEXT NOT NULL DEFAULT 'ceil',
  updated_at TEXT NOT NULL,
  CHECK (late_fine_rate_per_day_minor > 0 AND grace_period_minutes >= 0),
  CHECK (length(updated_at) = 24 AND substr(updated_at,11,1) = 'T' AND substr(updated_at,24,1) = 'Z')
);

CREATE TABLE IF NOT EXISTS hostel_blocks (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  deleted_at TEXT,
  UNIQUE(institution_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_block_inst_name_active 
  ON hostel_blocks (institution_id, name) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS hostel_block_wardens (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (institution_id, block_id) REFERENCES hostel_blocks(institution_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT,
  CHECK (length(assigned_at) = 24 AND substr(assigned_at,11,1) = 'T' AND substr(assigned_at,24,1) = 'Z'),
  CHECK (revoked_at IS NULL OR (length(revoked_at) = 24 AND substr(revoked_at,11,1) = 'T' AND substr(revoked_at,24,1) = 'Z'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_block_warden 
  ON hostel_block_wardens (institution_id, block_id, staff_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS hostel_rooms (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  deleted_at TEXT,
  UNIQUE(institution_id, id),
  FOREIGN KEY (institution_id, block_id) REFERENCES hostel_blocks(institution_id, id) ON DELETE RESTRICT,
  CHECK (capacity > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_inst_number_active 
  ON hostel_rooms (institution_id, block_id, room_number) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS hostel_beds (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  room_id TEXT NOT NULL,
  bed_number TEXT NOT NULL,
  is_maintenance INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  UNIQUE(institution_id, id),
  FOREIGN KEY (institution_id, room_id) REFERENCES hostel_rooms(institution_id, id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bed_inst_number_active 
  ON hostel_beds (institution_id, room_id, bed_number) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS hostel_bed_allocations (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  bed_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  allocated_at TEXT NOT NULL,
  vacated_at TEXT,
  allocated_staff_id TEXT NOT NULL,
  FOREIGN KEY (institution_id, bed_id) REFERENCES hostel_beds(institution_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, student_id) REFERENCES students(institution_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, allocated_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, academic_year_id) REFERENCES academic_years(institution_id, id) ON DELETE RESTRICT,
  CHECK (length(allocated_at) = 24 AND substr(allocated_at,11,1) = 'T' AND substr(allocated_at,24,1) = 'Z'),
  CHECK (vacated_at IS NULL OR (length(vacated_at) = 24 AND substr(vacated_at,11,1) = 'T' AND substr(vacated_at,24,1) = 'Z'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_bed_allocation 
  ON hostel_bed_allocations (institution_id, bed_id) WHERE vacated_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_student_allocation 
  ON hostel_bed_allocations (institution_id, student_id) WHERE vacated_at IS NULL;

CREATE TABLE IF NOT EXISTS hostel_leaves (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  expected_out_at TEXT NOT NULL,
  expected_in_at TEXT NOT NULL,
  actual_out_at TEXT,
  actual_in_at TEXT,
  authorized_pickup_name TEXT NOT NULL,
  authorized_pickup_phone TEXT NOT NULL,
  parent_consent_received INTEGER NOT NULL DEFAULT 0,
  approved_staff_id TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(institution_id, id),
  UNIQUE(institution_id, id, student_id),
  FOREIGN KEY (institution_id, student_id) REFERENCES students(institution_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, approved_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT,
  CHECK (expected_in_at > expected_out_at),
  CHECK (length(expected_out_at) = 24 AND substr(expected_out_at,11,1) = 'T' AND substr(expected_out_at,24,1) = 'Z'),
  CHECK (length(expected_in_at) = 24 AND substr(expected_in_at,11,1) = 'T' AND substr(expected_in_at,24,1) = 'Z'),
  CHECK (actual_out_at IS NULL OR (length(actual_out_at) = 24 AND substr(actual_out_at,11,1) = 'T' AND substr(actual_out_at,24,1) = 'Z')),
  CHECK (actual_in_at IS NULL OR (length(actual_in_at) = 24 AND substr(actual_in_at,11,1) = 'T' AND substr(actual_in_at,24,1) = 'Z')),
  CHECK (approved_at IS NULL OR (length(approved_at) = 24 AND substr(approved_at,11,1) = 'T' AND substr(approved_at,24,1) = 'Z')),
  CHECK (length(created_at) = 24 AND substr(created_at,11,1) = 'T' AND substr(created_at,24,1) = 'Z')
);

CREATE TABLE IF NOT EXISTS hostel_gate_passes (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  leave_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  pass_number TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued',
  issued_staff_id TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  revoked_at TEXT,
  revoked_staff_id TEXT,
  revoke_reason TEXT,
  UNIQUE(institution_id, id),
  UNIQUE(institution_id, token_hash),
  UNIQUE(institution_id, pass_number),
  FOREIGN KEY (institution_id, leave_id, student_id) REFERENCES hostel_leaves(institution_id, id, student_id) ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, issued_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, revoked_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT,
  CHECK (length(valid_from) = 24 AND substr(valid_from,11,1) = 'T' AND substr(valid_from,24,1) = 'Z'),
  CHECK (length(valid_until) = 24 AND substr(valid_until,11,1) = 'T' AND substr(valid_until,24,1) = 'Z'),
  CHECK (length(issued_at) = 24 AND substr(issued_at,11,1) = 'T' AND substr(issued_at,24,1) = 'Z'),
  CHECK (revoked_at IS NULL OR (length(revoked_at) = 24 AND substr(revoked_at,11,1) = 'T' AND substr(revoked_at,24,1) = 'Z'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_live_pass_per_leave 
  ON hostel_gate_passes (institution_id, leave_id) WHERE status != 'revoked';

CREATE TABLE IF NOT EXISTS hostel_gate_logs (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  pass_id TEXT,
  direction TEXT NOT NULL,
  scanned_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  device_id TEXT NOT NULL,
  guard_staff_id TEXT NOT NULL,
  verification_result TEXT NOT NULL,
  override_reason TEXT,
  idempotency_key TEXT NOT NULL,
  UNIQUE(institution_id, idempotency_key),
  FOREIGN KEY (institution_id, pass_id) REFERENCES hostel_gate_passes(institution_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, guard_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT,
  CHECK (length(scanned_at) = 24 AND substr(scanned_at,11,1) = 'T' AND substr(scanned_at,24,1) = 'Z'),
  CHECK (length(received_at) = 24 AND substr(received_at,11,1) = 'T' AND substr(received_at,24,1) = 'Z')
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_verified_scan 
  ON hostel_gate_logs (institution_id, pass_id, direction) 
  WHERE pass_id IS NOT NULL AND verification_result IN ('verified', 'manual_override');

CREATE TABLE IF NOT EXISTS hostel_fines (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  leave_id TEXT,
  fine_category TEXT NOT NULL,
  days_late INTEGER NOT NULL DEFAULT 0,
  rate_per_day INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'assessed',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(institution_id, id),
  FOREIGN KEY (institution_id, student_id) REFERENCES students(institution_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, leave_id, student_id) REFERENCES hostel_leaves(institution_id, id, student_id) ON DELETE RESTRICT,
  CHECK (total_amount > 0 AND paid_amount >= 0 AND paid_amount <= total_amount),
  CHECK (length(created_at) = 24 AND substr(created_at,11,1) = 'T' AND substr(created_at,24,1) = 'Z'),
  CHECK (length(updated_at) = 24 AND substr(updated_at,11,1) = 'T' AND substr(updated_at,24,1) = 'Z')
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_late_fine_per_leave 
  ON hostel_fines (institution_id, leave_id) 
  WHERE leave_id IS NOT NULL AND fine_category = 'late_return';

CREATE TABLE IF NOT EXISTS hostel_fine_actions (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  fine_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_staff_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(institution_id, idempotency_key),
  FOREIGN KEY (institution_id, fine_id) REFERENCES hostel_fines(institution_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (institution_id, actor_staff_id) REFERENCES staff_institutions(institution_id, staff_id) ON DELETE RESTRICT,
  CHECK ((actor_type = 'system' AND actor_staff_id IS NULL) OR (actor_type = 'staff' AND actor_staff_id IS NOT NULL)),
  CHECK (length(created_at) = 24 AND substr(created_at,11,1) = 'T' AND substr(created_at,24,1) = 'Z')
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_assessed_per_fine 
  ON hostel_fine_actions (institution_id, fine_id) WHERE action_type = 'ASSESSED';
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_waiver_per_fine 
  ON hostel_fine_actions (institution_id, fine_id) WHERE action_type = 'WAIVED';
