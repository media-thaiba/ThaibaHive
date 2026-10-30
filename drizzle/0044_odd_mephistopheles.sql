CREATE TABLE `staff_meal_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`default_breakfast` text DEFAULT 'eating' NOT NULL,
	`default_lunch` text DEFAULT 'eating' NOT NULL,
	`default_dinner` text DEFAULT 'eating' NOT NULL,
	`skip_start_date` text,
	`skip_end_date` text,
	`recurring_skip_days` text,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_staff_meal_preferences_staff_id` ON `staff_meal_preferences` (`staff_id`);--> statement-breakpoint
CREATE TABLE `step_up_used` (
	`jti` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`action` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`institution_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`client_ip` text,
	`user_agent` text,
	`device_type` text,
	`login_at` integer NOT NULL,
	`last_active_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`logout_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_sessions_staff_status` ON `user_sessions` (`staff_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_status` ON `user_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_expires_at` ON `user_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_user_sessions_last_active_at` ON `user_sessions` (`last_active_at`);--> statement-breakpoint
ALTER TABLE `presence` ADD `expires_at` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `google_sub` text;--> statement-breakpoint
CREATE UNIQUE INDEX `staff_google_sub_unique` ON `staff` (`google_sub`);--> statement-breakpoint
ALTER TABLE `staff_availability` ADD `expires_at` text;