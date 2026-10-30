ALTER TABLE `audit_logs` ADD `sequence_number` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `signature` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_audit_logs_tenant_seq` ON `audit_logs` (`tenant_id`,`sequence_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_audit_logs_tenant_hash` ON `audit_logs` (`tenant_id`,`current_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_ay_inst_id` ON `academic_years` (`institution_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_staff_inst` ON `staff_institutions` (`institution_id`,`staff_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_student_inst_id` ON `students` (`institution_id`,`id`);