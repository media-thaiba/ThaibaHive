CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`file_url` text NOT NULL,
	`thumbnail_url` text,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`file_type` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`folder_id` text,
	`tags` text,
	`metadata` text,
	`download_count` integer DEFAULT 0 NOT NULL,
	`created_by_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`folder_id`) REFERENCES `media_folders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_media_assets_folder_id` ON `media_assets` (`folder_id`);--> statement-breakpoint
CREATE INDEX `idx_media_assets_file_type` ON `media_assets` (`file_type`);--> statement-breakpoint
CREATE INDEX `idx_media_assets_status` ON `media_assets` (`status`);--> statement-breakpoint
CREATE TABLE `media_downloads` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`user_id` text,
	`ip_address` text,
	`user_agent` text,
	`downloaded_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `media_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`department_id` text,
	`created_by_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `media_folders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `media_share_links` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text,
	`folder_id` text,
	`token` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`password_hash` text,
	`expires_at` text,
	`download_count` integer DEFAULT 0 NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`created_by_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `media_assets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`folder_id`) REFERENCES `media_folders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_share_links_token_unique` ON `media_share_links` (`token`);--> statement-breakpoint
CREATE TABLE `media_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`sha256` text NOT NULL,
	`total_chunks` integer NOT NULL,
	`completed_chunks` text NOT NULL,
	`created_by_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`created_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_tokens_token_hash_unique` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `staff_device_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`token` text NOT NULL,
	`platform` text NOT NULL,
	`device_name` text,
	`last_used_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_device_tokens_token_unique` ON `staff_device_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `system_configs` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
