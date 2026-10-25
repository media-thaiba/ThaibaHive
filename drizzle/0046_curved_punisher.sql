CREATE TABLE `hostel_bed_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`bed_id` text NOT NULL,
	`student_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`allocated_at` text NOT NULL,
	`vacated_at` text,
	`allocated_staff_id` text NOT NULL,
	FOREIGN KEY (`institution_id`,`bed_id`) REFERENCES `hostel_beds`(`institution_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`institution_id`,`student_id`) REFERENCES `students`(`institution_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`institution_id`,`allocated_staff_id`) REFERENCES `staff_institutions`(`institution_id`,`staff_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`institution_id`,`academic_year_id`) REFERENCES `academic_years`(`institution_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_ts_alloc_allocated" CHECK(length(allocated_at) = 24 AND substr(allocated_at,11,1) = 'T' AND substr(allocated_at,24,1) = 'Z'),
	CONSTRAINT "chk_ts_alloc_vacated" CHECK(vacated_at IS NULL OR (length(vacated_at) = 24 AND substr(vacated_at,11,1) = 'T' AND substr(vacated_at,24,1) = 'Z'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_active_bed_allocation` ON `hostel_bed_allocations` (`institution_id`,`bed_id`) WHERE vacated_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_active_student_allocation` ON `hostel_bed_allocations` (`institution_id`,`student_id`) WHERE vacated_at IS NULL;--> statement-breakpoint
CREATE TABLE `hostel_beds` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`room_id` text NOT NULL,
	`bed_number` text NOT NULL,
	`is_maintenance` integer DEFAULT false NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`institution_id`,`room_id`) REFERENCES `hostel_rooms`(`institution_id`,`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bed_inst_number_active` ON `hostel_beds` (`institution_id`,`room_id`,`bed_number`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_bed_inst_id` ON `hostel_beds` (`institution_id`,`id`);--> statement-breakpoint
CREATE TABLE `hostel_block_wardens` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`block_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`assigned_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`institution_id`,`block_id`) REFERENCES `hostel_blocks`(`institution_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`institution_id`,`staff_id`) REFERENCES `staff_institutions`(`institution_id`,`staff_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_ts_warden_assigned" CHECK(length(assigned_at) = 24 AND substr(assigned_at,11,1) = 'T' AND substr(assigned_at,24,1) = 'Z'),
	CONSTRAINT "chk_ts_warden_revoked" CHECK(revoked_at IS NULL OR (length(revoked_at) = 24 AND substr(revoked_at,11,1) = 'T' AND substr(revoked_at,24,1) = 'Z'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_active_block_warden` ON `hostel_block_wardens` (`institution_id`,`block_id`,`staff_id`) WHERE revoked_at IS NULL;--> statement-breakpoint
CREATE TABLE `hostel_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`name` text NOT NULL,
	`gender` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_block_inst_name_active` ON `hostel_blocks` (`institution_id`,`name`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_block_inst_id` ON `hostel_blocks` (`institution_id`,`id`);--> statement-breakpoint
CREATE TABLE `hostel_fine_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`fine_id` text NOT NULL,
	`action_type` text NOT NULL,
	`amount` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_staff_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`institution_id`,`fine_id`) REFERENCES `hostel_fines`(`institution_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`institution_id`,`actor_staff_id`) REFERENCES `staff_institutions`(`institution_id`,`staff_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_actor_system_consistency" CHECK(
    (actor_type = 'system' AND actor_staff_id IS NULL) OR 
    (actor_type = 'staff' AND actor_staff_id IS NOT NULL)
  ),
	CONSTRAINT "chk_ts_fine_act_created" CHECK(length(created_at) = 24 AND substr(created_at,11,1) = 'T' AND substr(created_at,24,1) = 'Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_fine_action_idempotency` ON `hostel_fine_actions` (`institution_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_single_assessed_per_fine` ON `hostel_fine_actions` (`institution_id`,`fine_id`) WHERE action_type = 'ASSESSED';--> statement-breakpoint
CREATE UNIQUE INDEX `idx_single_waiver_per_fine` ON `hostel_fine_actions` (`institution_id`,`fine_id`) WHERE action_type = 'WAIVED';--> statement-breakpoint
CREATE TABLE `hostel_fines` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`student_id` text NOT NULL,
	`leave_id` text,
	`fine_category` text NOT NULL,
	`days_late` integer DEFAULT 0 NOT NULL,
	`rate_per_day` integer DEFAULT 0 NOT NULL,
	`total_amount` integer NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'assessed' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`institution_id`,`student_id`) REFERENCES `students`(`institution_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`institution_id`,`leave_id`,`student_id`) REFERENCES `hostel_leaves`(`institution_id`,`id`,`student_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_fine_amounts_positive" CHECK(total_amount > 0 AND paid_amount >= 0 AND paid_amount <= total_amount),
	CONSTRAINT "chk_ts_fine_created" CHECK(length(created_at) = 24 AND substr(created_at,11,1) = 'T' AND substr(created_at,24,1) = 'Z'),
	CONSTRAINT "chk_ts_fine_updated" CHECK(length(updated_at) = 24 AND substr(updated_at,11,1) = 'T' AND substr(updated_at,24,1) = 'Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_single_late_fine_per_leave` ON `hostel_fines` (`institution_id`,`leave_id`) WHERE leave_id IS NOT NULL AND fine_category = 'late_return';--> statement-breakpoint
CREATE UNIQUE INDEX `uq_fine_inst_id` ON `hostel_fines` (`institution_id`,`id`);--> statement-breakpoint
CREATE TABLE `hostel_gate_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`pass_id` text,
	`direction` text NOT NULL,
	`scanned_at` text NOT NULL,
	`received_at` text NOT NULL,
	`device_id` text NOT NULL,
	`guard_staff_id` text NOT NULL,
	`verification_result` text NOT NULL,
	`override_reason` text,
	`idempotency_key` text NOT NULL,
	FOREIGN KEY (`institution_id`,`pass_id`) REFERENCES `hostel_gate_passes`(`institution_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`institution_id`,`guard_staff_id`) REFERENCES `staff_institutions`(`institution_id`,`staff_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_ts_log_scanned" CHECK(length(scanned_at) = 24 AND substr(scanned_at,11,1) = 'T' AND substr(scanned_at,24,1) = 'Z'),
	CONSTRAINT "chk_ts_log_received" CHECK(length(received_at) = 24 AND substr(received_at,11,1) = 'T' AND substr(received_at,24,1) = 'Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_gate_log_idempotency` ON `hostel_gate_logs` (`institution_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_unique_verified_scan` ON `hostel_gate_logs` (`institution_id`,`pass_id`,`direction`) WHERE pass_id IS NOT NULL AND verification_result IN ('verified', 'manual_override');--> statement-breakpoint
CREATE TABLE `hostel_gate_passes` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`leave_id` text NOT NULL,
	`student_id` text NOT NULL,
	`pass_number` text NOT NULL,
	`token_hash` text NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text NOT NULL,
	`status` text DEFAULT 'issued' NOT NULL,
	`issued_staff_id` text NOT NULL,
	`issued_at` text NOT NULL,
	`revoked_at` text,
	`revoked_staff_id` text,
	`revoke_reason` text,
	FOREIGN KEY (`institution_id`,`leave_id`,`student_id`) REFERENCES `hostel_leaves`(`institution_id`,`id`,`student_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`institution_id`,`issued_staff_id`) REFERENCES `staff_institutions`(`institution_id`,`staff_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`institution_id`,`revoked_staff_id`) REFERENCES `staff_institutions`(`institution_id`,`staff_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_ts_pass_valid_from" CHECK(length(valid_from) = 24 AND substr(valid_from,11,1) = 'T' AND substr(valid_from,24,1) = 'Z'),
	CONSTRAINT "chk_ts_pass_valid_until" CHECK(length(valid_until) = 24 AND substr(valid_until,11,1) = 'T' AND substr(valid_until,24,1) = 'Z'),
	CONSTRAINT "chk_ts_pass_issued" CHECK(length(issued_at) = 24 AND substr(issued_at,11,1) = 'T' AND substr(issued_at,24,1) = 'Z'),
	CONSTRAINT "chk_ts_pass_revoked" CHECK(revoked_at IS NULL OR (length(revoked_at) = 24 AND substr(revoked_at,11,1) = 'T' AND substr(revoked_at,24,1) = 'Z'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pass_token_hash` ON `hostel_gate_passes` (`institution_id`,`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pass_number` ON `hostel_gate_passes` (`institution_id`,`pass_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_one_live_pass_per_leave` ON `hostel_gate_passes` (`institution_id`,`leave_id`) WHERE status != 'revoked';--> statement-breakpoint
CREATE UNIQUE INDEX `uq_pass_inst_id` ON `hostel_gate_passes` (`institution_id`,`id`);--> statement-breakpoint
CREATE TABLE `hostel_leaves` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`student_id` text NOT NULL,
	`leave_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expected_out_at` text NOT NULL,
	`expected_in_at` text NOT NULL,
	`actual_out_at` text,
	`actual_in_at` text,
	`authorized_pickup_name` text NOT NULL,
	`authorized_pickup_phone` text NOT NULL,
	`parent_consent_received` integer DEFAULT false NOT NULL,
	`approved_staff_id` text,
	`approved_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`institution_id`,`student_id`) REFERENCES `students`(`institution_id`,`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`institution_id`,`approved_staff_id`) REFERENCES `staff_institutions`(`institution_id`,`staff_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_leave_time_order" CHECK(expected_in_at > expected_out_at),
	CONSTRAINT "chk_ts_leave_exp_out" CHECK(length(expected_out_at) = 24 AND substr(expected_out_at,11,1) = 'T' AND substr(expected_out_at,24,1) = 'Z'),
	CONSTRAINT "chk_ts_leave_exp_in" CHECK(length(expected_in_at) = 24 AND substr(expected_in_at,11,1) = 'T' AND substr(expected_in_at,24,1) = 'Z'),
	CONSTRAINT "chk_ts_leave_act_out" CHECK(actual_out_at IS NULL OR (length(actual_out_at) = 24 AND substr(actual_out_at,11,1) = 'T' AND substr(actual_out_at,24,1) = 'Z')),
	CONSTRAINT "chk_ts_leave_act_in" CHECK(actual_in_at IS NULL OR (length(actual_in_at) = 24 AND substr(actual_in_at,11,1) = 'T' AND substr(actual_in_at,24,1) = 'Z')),
	CONSTRAINT "chk_ts_leave_app" CHECK(approved_at IS NULL OR (length(approved_at) = 24 AND substr(approved_at,11,1) = 'T' AND substr(approved_at,24,1) = 'Z')),
	CONSTRAINT "chk_ts_leave_created" CHECK(length(created_at) = 24 AND substr(created_at,11,1) = 'T' AND substr(created_at,24,1) = 'Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_leave_inst_id` ON `hostel_leaves` (`institution_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_leave_inst_id_student` ON `hostel_leaves` (`institution_id`,`id`,`student_id`);--> statement-breakpoint
CREATE TABLE `hostel_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`block_id` text NOT NULL,
	`room_number` text NOT NULL,
	`capacity` integer NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`institution_id`,`block_id`) REFERENCES `hostel_blocks`(`institution_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_room_capacity_positive" CHECK(capacity > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_room_inst_number_active` ON `hostel_rooms` (`institution_id`,`block_id`,`room_number`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_room_inst_id` ON `hostel_rooms` (`institution_id`,`id`);--> statement-breakpoint
CREATE TABLE `hostel_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`late_fine_rate_per_day_minor` integer DEFAULT 5000 NOT NULL,
	`grace_period_minutes` integer DEFAULT 60 NOT NULL,
	`rounding_rule` text DEFAULT 'ceil' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_settings_positive" CHECK(late_fine_rate_per_day_minor > 0 AND grace_period_minutes >= 0),
	CONSTRAINT "chk_ts_settings_updated" CHECK(length(updated_at) = 24 AND substr(updated_at,11,1) = 'T' AND substr(updated_at,24,1) = 'Z')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_settings_inst` ON `hostel_settings` (`institution_id`);--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `trg_immutable_gate_logs_update` BEFORE UPDATE ON `hostel_gate_logs` BEGIN SELECT RAISE(ABORT, 'hostel_gate_logs is append-only. UPDATE not allowed.'); END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `trg_immutable_gate_logs_delete` BEFORE DELETE ON `hostel_gate_logs` BEGIN SELECT RAISE(ABORT, 'hostel_gate_logs is append-only. DELETE not allowed.'); END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `trg_immutable_fine_actions_update` BEFORE UPDATE ON `hostel_fine_actions` BEGIN SELECT RAISE(ABORT, 'hostel_fine_actions is append-only. UPDATE not allowed.'); END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `trg_immutable_fine_actions_delete` BEFORE DELETE ON `hostel_fine_actions` BEGIN SELECT RAISE(ABORT, 'hostel_fine_actions is append-only. DELETE not allowed.'); END;