CREATE TABLE `job_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`status` text NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`started_at` text DEFAULT (current_timestamp) NOT NULL,
	`completed_at` text,
	`error_message` text,
	FOREIGN KEY (`job_id`) REFERENCES `scheduled_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_job_executions_job` ON `job_executions` (`job_id`);--> statement-breakpoint
CREATE TABLE `preference_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` text DEFAULT (current_timestamp) NOT NULL,
	`user_id` text NOT NULL,
	`preference_key` text NOT NULL,
	`old_value` text,
	`new_value` text NOT NULL,
	`ip_address` text,
	`institution_id` text,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_pref_audit_user_pref_ts` ON `preference_audit_log` (`user_id`,`preference_key`,`timestamp`);--> statement-breakpoint
CREATE TABLE `scheduled_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`type` text NOT NULL,
	`format` text NOT NULL,
	`options` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`error` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_scheduled_jobs_inst` ON `scheduled_jobs` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_jobs_status` ON `scheduled_jobs` (`status`);