CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`gateway` text NOT NULL,
	`event_id` text NOT NULL,
	`gateway_payment_id` text,
	`status` text NOT NULL,
	`processed_at` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_events_idempotency_key_unique` ON `webhook_events` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_webhook_gateway` ON `webhook_events` (`gateway`);--> statement-breakpoint
CREATE INDEX `idx_webhook_event` ON `webhook_events` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_webhook_key` ON `webhook_events` (`idempotency_key`);--> statement-breakpoint
ALTER TABLE `fee_payments` ADD `reconciled_at` text;--> statement-breakpoint
ALTER TABLE `fee_payments` ADD `reconciliation_batch_id` text REFERENCES fee_reconciliation_batches(id);--> statement-breakpoint
CREATE INDEX `idx_attendance_register_locked_by` ON `attendance_register` (`locked_by_id`);--> statement-breakpoint
CREATE INDEX `idx_classes_teacher` ON `classes` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `idx_classes_academic_year` ON `classes` (`academic_year_id`);--> statement-breakpoint
CREATE INDEX `idx_events_institution` ON `events` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_events_department` ON `events` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_student_attendance_marked_by` ON `student_attendance_logs` (`marked_by_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_assigned_by` ON `tasks` (`assigned_by_id`);