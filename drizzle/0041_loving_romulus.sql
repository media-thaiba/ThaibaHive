ALTER TABLE `attendance_logs` ADD `institution_id` text REFERENCES institutions(id);--> statement-breakpoint
ALTER TABLE `attendance_logs` ADD `source` text DEFAULT 'self' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_attendance_inst` ON `attendance_logs` (`institution_id`);--> statement-breakpoint
ALTER TABLE `presence_logs` ADD `institution_id` text REFERENCES institutions(id);--> statement-breakpoint
CREATE INDEX `idx_presence_logs_inst` ON `presence_logs` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_presence_logs_staff_created` ON `presence_logs` (`staff_id`,`created_at`);