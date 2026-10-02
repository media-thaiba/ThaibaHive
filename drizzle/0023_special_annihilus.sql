CREATE INDEX `idx_attendance_status` ON `attendance_logs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_attendance_method` ON `attendance_logs` (`method`);--> statement-breakpoint
CREATE INDEX `idx_financial_tx_category` ON `financial_transactions` (`category`);--> statement-breakpoint
CREATE INDEX `idx_mark_entries_exam_schedule` ON `mark_entries` (`exam_schedule_id`);--> statement-breakpoint
CREATE INDEX `idx_mark_entries_student` ON `mark_entries` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_mark_entries_schedule_student_uniq` ON `mark_entries` (`exam_schedule_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_pref_audit_inst_id` ON `preference_audit_log` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_pref_audit_timestamp` ON `preference_audit_log` (`timestamp`);