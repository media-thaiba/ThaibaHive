import { sqliteTable, text, integer, unique, uniqueIndex, check, foreignKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { institutions, students, staffInstitutions, academicYears } from "../packages/db/schema";

// ─── TPSH Hostel ERP ───

// 1. Hostel Settings (Tenant Config)
export const hostelSettings = sqliteTable("hostel_settings", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  lateFineRatePerDayMinor: integer("late_fine_rate_per_day_minor").default(5000).notNull(), // ₹50.00 in paise
  gracePeriodMinutes: integer("grace_period_minutes").default(60).notNull(),
  roundingRule: text("rounding_rule", { enum: ["ceil", "floor"] }).default("ceil").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  unique("uq_settings_inst").on(table.institutionId),
  check("chk_settings_positive", sql`late_fine_rate_per_day_minor > 0 AND grace_period_minutes >= 0`),
  check("chk_ts_settings_updated", sql`length(updated_at) = 24 AND substr(updated_at,11,1) = 'T' AND substr(updated_at,24,1) = 'Z'`),
  foreignKey({
    columns: [table.institutionId],
    foreignColumns: [institutions.id],
  }).onDelete("restrict"),
]);

// 2. Hostel Blocks
export const hostelBlocks = sqliteTable("hostel_blocks", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  name: text("name").notNull(),
  gender: text("gender", { enum: ["boys", "girls"] }).notNull(),
  deletedAt: text("deleted_at"),
}, (table) => [
  unique("uq_block_inst_id").on(table.institutionId, table.id),
  uniqueIndex("idx_block_inst_name_active")
    .on(table.institutionId, table.name)
    .where(sql`deleted_at IS NULL`),
  foreignKey({
    columns: [table.institutionId],
    foreignColumns: [institutions.id],
  }).onDelete("restrict"),
]);

// 3. Hostel Block Wardens
export const hostelBlockWardens = sqliteTable("hostel_block_wardens", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  blockId: text("block_id").notNull(),
  staffId: text("staff_id").notNull(),
  assignedAt: text("assigned_at").notNull(),
  revokedAt: text("revoked_at"),
}, (table) => [
  uniqueIndex("idx_active_block_warden")
    .on(table.institutionId, table.blockId, table.staffId)
    .where(sql`revoked_at IS NULL`),
  check("chk_ts_warden_assigned", sql`length(assigned_at) = 24 AND substr(assigned_at,11,1) = 'T' AND substr(assigned_at,24,1) = 'Z'`),
  check("chk_ts_warden_revoked", sql`revoked_at IS NULL OR (length(revoked_at) = 24 AND substr(revoked_at,11,1) = 'T' AND substr(revoked_at,24,1) = 'Z')`),
  foreignKey({
    columns: [table.institutionId, table.blockId],
    foreignColumns: [hostelBlocks.institutionId, hostelBlocks.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.institutionId, table.staffId],
    foreignColumns: [staffInstitutions.institutionId, staffInstitutions.staffId],
  }).onDelete("restrict"),
]);

// 4. Hostel Rooms
export const hostelRooms = sqliteTable("hostel_rooms", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  blockId: text("block_id").notNull(),
  roomNumber: text("room_number").notNull(),
  capacity: integer("capacity").notNull(),
  deletedAt: text("deleted_at"),
}, (table) => [
  unique("uq_room_inst_id").on(table.institutionId, table.id),
  uniqueIndex("idx_room_inst_number_active")
    .on(table.institutionId, table.blockId, table.roomNumber)
    .where(sql`deleted_at IS NULL`),
  check("chk_room_capacity_positive", sql`capacity > 0`),
  foreignKey({
    columns: [table.institutionId, table.blockId],
    foreignColumns: [hostelBlocks.institutionId, hostelBlocks.id],
  }).onDelete("restrict"),
]);

// 5. Hostel Beds
export const hostelBeds = sqliteTable("hostel_beds", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  roomId: text("room_id").notNull(),
  bedNumber: text("bed_number").notNull(),
  isMaintenance: integer("is_maintenance", { mode: "boolean" }).default(false).notNull(),
  deletedAt: text("deleted_at"),
}, (table) => [
  unique("uq_bed_inst_id").on(table.institutionId, table.id),
  uniqueIndex("idx_bed_inst_number_active")
    .on(table.institutionId, table.roomId, table.bedNumber)
    .where(sql`deleted_at IS NULL`),
  foreignKey({
    columns: [table.institutionId, table.roomId],
    foreignColumns: [hostelRooms.institutionId, hostelRooms.id],
  }).onDelete("restrict"),
]);

// 6. Bed Allocations (Dialect-neutral vacated_at IS NULL)
export const hostelBedAllocations = sqliteTable("hostel_bed_allocations", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  bedId: text("bed_id").notNull(),
  studentId: text("student_id").notNull(),
  academicYearId: text("academic_year_id").notNull(),
  allocatedAt: text("allocated_at").notNull(),
  vacatedAt: text("vacated_at"),
  allocatedStaffId: text("allocated_staff_id").notNull(),
}, (table) => [
  uniqueIndex("idx_active_bed_allocation")
    .on(table.institutionId, table.bedId)
    .where(sql`vacated_at IS NULL`),
  uniqueIndex("idx_active_student_allocation")
    .on(table.institutionId, table.studentId)
    .where(sql`vacated_at IS NULL`),
  check("chk_ts_alloc_allocated", sql`length(allocated_at) = 24 AND substr(allocated_at,11,1) = 'T' AND substr(allocated_at,24,1) = 'Z'`),
  check("chk_ts_alloc_vacated", sql`vacated_at IS NULL OR (length(vacated_at) = 24 AND substr(vacated_at,11,1) = 'T' AND substr(vacated_at,24,1) = 'Z')`),
  foreignKey({
    columns: [table.institutionId, table.bedId],
    foreignColumns: [hostelBeds.institutionId, hostelBeds.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.institutionId, table.studentId],
    foreignColumns: [students.institutionId, students.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.institutionId, table.allocatedStaffId],
    foreignColumns: [staffInstitutions.institutionId, staffInstitutions.staffId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.institutionId, table.academicYearId],
    foreignColumns: [academicYears.institutionId, academicYears.id],
  }).onDelete("restrict"),
]);

// 7. Hostel Leaves
export const hostelLeaves = sqliteTable("hostel_leaves", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  studentId: text("student_id").notNull(),
  leaveType: text("leave_type", { enum: ["home", "medical", "emergency", "outing"] }).notNull(),
  status: text("status", { enum: ["pending", "approved", "active", "completed", "rejected", "cancelled"] }).default("pending").notNull(),
  expectedOutAt: text("expected_out_at").notNull(),
  expectedInAt: text("expected_in_at").notNull(),
  actualOutAt: text("actual_out_at"),
  actualInAt: text("actual_in_at"),
  authorizedPickupName: text("authorized_pickup_name").notNull(),
  authorizedPickupPhone: text("authorized_pickup_phone").notNull(),
  parentConsentReceived: integer("parent_consent_received", { mode: "boolean" }).default(false).notNull(),
  approvedStaffId: text("approved_staff_id"),
  approvedAt: text("approved_at"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  unique("uq_leave_inst_id").on(table.institutionId, table.id),
  unique("uq_leave_inst_id_student").on(table.institutionId, table.id, table.studentId),
  check("chk_leave_time_order", sql`expected_in_at > expected_out_at`),
  check("chk_ts_leave_exp_out", sql`length(expected_out_at) = 24 AND substr(expected_out_at,11,1) = 'T' AND substr(expected_out_at,24,1) = 'Z'`),
  check("chk_ts_leave_exp_in", sql`length(expected_in_at) = 24 AND substr(expected_in_at,11,1) = 'T' AND substr(expected_in_at,24,1) = 'Z'`),
  check("chk_ts_leave_act_out", sql`actual_out_at IS NULL OR (length(actual_out_at) = 24 AND substr(actual_out_at,11,1) = 'T' AND substr(actual_out_at,24,1) = 'Z')`),
  check("chk_ts_leave_act_in", sql`actual_in_at IS NULL OR (length(actual_in_at) = 24 AND substr(actual_in_at,11,1) = 'T' AND substr(actual_in_at,24,1) = 'Z')`),
  check("chk_ts_leave_app", sql`approved_at IS NULL OR (length(approved_at) = 24 AND substr(approved_at,11,1) = 'T' AND substr(approved_at,24,1) = 'Z')`),
  check("chk_ts_leave_created", sql`length(created_at) = 24 AND substr(created_at,11,1) = 'T' AND substr(created_at,24,1) = 'Z'`),
  foreignKey({
    columns: [table.institutionId, table.studentId],
    foreignColumns: [students.institutionId, students.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.institutionId, table.approvedStaffId],
    foreignColumns: [staffInstitutions.institutionId, staffInstitutions.staffId],
  }).onDelete("restrict"),
]);

// 8. Hostel Gate Passes
export const hostelGatePasses = sqliteTable("hostel_gate_passes", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  leaveId: text("leave_id").notNull(),
  studentId: text("student_id").notNull(),
  passNumber: text("pass_number").notNull(),
  tokenHash: text("token_hash").notNull(), // SHA-256 of single-reveal QR secret
  validFrom: text("valid_from").notNull(),
  validUntil: text("valid_until").notNull(),
  status: text("status", { enum: ["issued", "used_out", "used_in", "revoked"] }).default("issued").notNull(),
  issuedStaffId: text("issued_staff_id").notNull(),
  issuedAt: text("issued_at").notNull(),
  revokedAt: text("revoked_at"),
  revokedStaffId: text("revoked_staff_id"),
  revokeReason: text("revoke_reason"),
}, (table) => [
  unique("uq_pass_inst_id").on(table.institutionId, table.id),
  uniqueIndex("idx_pass_token_hash").on(table.institutionId, table.tokenHash),
  uniqueIndex("idx_pass_number").on(table.institutionId, table.passNumber),
  // Exactly one live pass per leave
  uniqueIndex("idx_one_live_pass_per_leave")
    .on(table.institutionId, table.leaveId)
    .where(sql`status != 'revoked'`),
  check("chk_ts_pass_valid_from", sql`length(valid_from) = 24 AND substr(valid_from,11,1) = 'T' AND substr(valid_from,24,1) = 'Z'`),
  check("chk_ts_pass_valid_until", sql`length(valid_until) = 24 AND substr(valid_until,11,1) = 'T' AND substr(valid_until,24,1) = 'Z'`),
  check("chk_ts_pass_issued", sql`length(issued_at) = 24 AND substr(issued_at,11,1) = 'T' AND substr(issued_at,24,1) = 'Z'`),
  check("chk_ts_pass_revoked", sql`revoked_at IS NULL OR (length(revoked_at) = 24 AND substr(revoked_at,11,1) = 'T' AND substr(revoked_at,24,1) = 'Z')`),
  foreignKey({
    columns: [table.institutionId, table.leaveId, table.studentId],
    foreignColumns: [hostelLeaves.institutionId, hostelLeaves.id, hostelLeaves.studentId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.institutionId, table.issuedStaffId],
    foreignColumns: [staffInstitutions.institutionId, staffInstitutions.staffId],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.institutionId, table.revokedStaffId],
    foreignColumns: [staffInstitutions.institutionId, staffInstitutions.staffId],
  }).onDelete("restrict"),
]);

// 9. Hostel Gate Logs
export const hostelGateLogs = sqliteTable("hostel_gate_logs", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  passId: text("pass_id"), // Nullable to log unknown/tampered attempts without FK failure
  direction: text("direction", { enum: ["out", "in"] }).notNull(),
  scannedAt: text("scanned_at").notNull(), // Device reported timestamp
  receivedAt: text("received_at").notNull(), // Server arrival timestamp
  deviceId: text("device_id").notNull(),
  guardStaffId: text("guard_staff_id").notNull(),
  verificationResult: text("verification_result", {
    enum: ["verified", "tampered", "expired_rejected", "revoked_rejected", "out_of_window_rejected", "manual_override"]
  }).notNull(),
  overrideReason: text("override_reason"),
  idempotencyKey: text("idempotency_key").notNull(),
}, (table) => [
  uniqueIndex("idx_gate_log_idempotency").on(table.institutionId, table.idempotencyKey),
  // Prevent double gate-pass scan races on entry/exit
  uniqueIndex("idx_unique_verified_scan")
    .on(table.institutionId, table.passId, table.direction)
    .where(sql`pass_id IS NOT NULL AND verification_result IN ('verified', 'manual_override')`),
  check("chk_ts_log_scanned", sql`length(scanned_at) = 24 AND substr(scanned_at,11,1) = 'T' AND substr(scanned_at,24,1) = 'Z'`),
  check("chk_ts_log_received", sql`length(received_at) = 24 AND substr(received_at,11,1) = 'T' AND substr(received_at,24,1) = 'Z'`),
  foreignKey({
    columns: [table.institutionId, table.passId],
    foreignColumns: [hostelGatePasses.institutionId, hostelGatePasses.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.institutionId, table.guardStaffId],
    foreignColumns: [staffInstitutions.institutionId, staffInstitutions.staffId],
  }).onDelete("restrict"),
]);

// 10. Hostel Fines
export const hostelFines = sqliteTable("hostel_fines", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  studentId: text("student_id").notNull(),
  leaveId: text("leave_id"),
  fineCategory: text("fine_category", { enum: ["late_return", "disciplinary", "property_damage", "misconduct"] }).notNull(),
  daysLate: integer("days_late").default(0).notNull(),
  ratePerDay: integer("rate_per_day").default(0).notNull(),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").default(0).notNull(),
  status: text("status", { enum: ["assessed", "partially_paid", "paid", "waived"] }).default("assessed").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  unique("uq_fine_inst_id").on(table.institutionId, table.id),
  // Single late fine per leave
  uniqueIndex("idx_single_late_fine_per_leave")
    .on(table.institutionId, table.leaveId)
    .where(sql`leave_id IS NOT NULL AND fine_category = 'late_return'`),
  check("chk_fine_amounts_positive", sql`total_amount > 0 AND paid_amount >= 0 AND paid_amount <= total_amount`),
  check("chk_ts_fine_created", sql`length(created_at) = 24 AND substr(created_at,11,1) = 'T' AND substr(created_at,24,1) = 'Z'`),
  check("chk_ts_fine_updated", sql`length(updated_at) = 24 AND substr(updated_at,11,1) = 'T' AND substr(updated_at,24,1) = 'Z'`),
  foreignKey({
    columns: [table.institutionId, table.studentId],
    foreignColumns: [students.institutionId, students.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.institutionId, table.leaveId, table.studentId],
    foreignColumns: [hostelLeaves.institutionId, hostelLeaves.id, hostelLeaves.studentId],
  }).onDelete("restrict"),
]);

// 11. Hostel Fine Actions (Append-Only Ledger)
export const hostelFineActions = sqliteTable("hostel_fine_actions", {
  id: text("id").primaryKey(),
  institutionId: text("institution_id").notNull(),
  fineId: text("fine_id").notNull(),
  actionType: text("action_type", { enum: ["ASSESSED", "WAIVED"] }).notNull(),
  amount: integer("amount").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  payloadHash: text("payload_hash").notNull(),
  actorType: text("actor_type", { enum: ["system", "staff"] }).notNull(),
  actorStaffId: text("actor_staff_id"), // Nullable for system actors
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_fine_action_idempotency").on(table.institutionId, table.idempotencyKey),
  uniqueIndex("idx_single_assessed_per_fine")
    .on(table.institutionId, table.fineId)
    .where(sql`action_type = 'ASSESSED'`),
  uniqueIndex("idx_single_waiver_per_fine")
    .on(table.institutionId, table.fineId)
    .where(sql`action_type = 'WAIVED'`),
  check("chk_actor_system_consistency", sql`
    (actor_type = 'system' AND actor_staff_id IS NULL) OR 
    (actor_type = 'staff' AND actor_staff_id IS NOT NULL)
  `),
  check("chk_ts_fine_act_created", sql`length(created_at) = 24 AND substr(created_at,11,1) = 'T' AND substr(created_at,24,1) = 'Z'`),
  foreignKey({
    columns: [table.institutionId, table.fineId],
    foreignColumns: [hostelFines.institutionId, hostelFines.id],
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.institutionId, table.actorStaffId],
    foreignColumns: [staffInstitutions.institutionId, staffInstitutions.staffId],
  }).onDelete("restrict"),
]);
