CREATE TABLE `attendance_days` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`institution_id` text,
	`local_date` text NOT NULL,
	`first_in` integer,
	`last_out` integer,
	`first_in_time` text,
	`last_out_time` text,
	`total_minutes` integer DEFAULT 0,
	`status` text DEFAULT 'present' NOT NULL,
	`needs_review` integer DEFAULT false NOT NULL,
	`review_reason` text,
	`is_pilot` integer DEFAULT true NOT NULL,
	`rebuilt_at` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_att_days_staff_date` ON `attendance_days` (`staff_id`,`local_date`);--> statement-breakpoint
CREATE INDEX `idx_att_days_inst_date` ON `attendance_days` (`institution_id`,`local_date`);--> statement-breakpoint
CREATE TABLE `attendance_events` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`institution_id` text,
	`client_event_id` text NOT NULL,
	`kind` text NOT NULL,
	`method` text DEFAULT 'geofence' NOT NULL,
	`effective_at` integer NOT NULL,
	`time_trust` text DEFAULT 'server' NOT NULL,
	`device_claimed_at` integer,
	`received_at` integer NOT NULL,
	`local_date` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`accuracy_m` real,
	`is_mocked` integer DEFAULT false NOT NULL,
	`geofence_id` text,
	`device_id` text,
	`app_version` text,
	`flags` text,
	`is_pilot` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_att_events_staff_client` ON `attendance_events` (`staff_id`,`client_event_id`);--> statement-breakpoint
CREATE INDEX `idx_att_events_staff_date_eff` ON `attendance_events` (`staff_id`,`local_date`,`effective_at`);--> statement-breakpoint
CREATE INDEX `idx_att_events_inst` ON `attendance_events` (`institution_id`);--> statement-breakpoint
CREATE TABLE `punch_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text,
	`request_id` text,
	`ip_address` text,
	`user_agent` text,
	`app_version` text,
	`kind` text,
	`method` text,
	`outcome` text NOT NULL,
	`reason` text,
	`raw_payload_snippet` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_punch_attempts_req` ON `punch_attempts` (`request_id`);--> statement-breakpoint
CREATE INDEX `idx_punch_attempts_staff_created` ON `punch_attempts` (`staff_id`,`created_at`);