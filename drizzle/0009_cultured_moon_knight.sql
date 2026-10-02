CREATE TABLE `activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_id` text,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activity_logs_staff_idx` ON `activity_logs` (`staff_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_action_idx` ON `activity_logs` (`action`);--> statement-breakpoint
CREATE INDEX `activity_logs_resource_idx` ON `activity_logs` (`resource_type`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`text` text,
	`media_url` text,
	`media_type` text DEFAULT 'text' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `chat_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `chat_messages_room_idx` ON `chat_messages` (`room_id`);--> statement-breakpoint
CREATE INDEX `chat_messages_sender_idx` ON `chat_messages` (`sender_id`);--> statement-breakpoint
CREATE TABLE `chat_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`role` text DEFAULT 'Member' NOT NULL,
	`added_by_id` text,
	`last_read_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `chat_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `chat_participants_room_idx` ON `chat_participants` (`room_id`);--> statement-breakpoint
CREATE INDEX `chat_participants_staff_idx` ON `chat_participants` (`staff_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `chat_participants_room_staff_uniq` ON `chat_participants` (`room_id`,`staff_id`);--> statement-breakpoint
CREATE TABLE `chat_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`created_by_id` text NOT NULL,
	`last_message_time` text,
	`last_message_preview` text,
	`icon_url` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`created_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `chat_rooms_creator_idx` ON `chat_rooms` (`created_by_id`);--> statement-breakpoint
CREATE TABLE `field_work_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`attendance_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`started_at` text DEFAULT (current_timestamp) NOT NULL,
	`ended_at` text,
	`reason` text,
	`status` text DEFAULT 'pending_approval' NOT NULL,
	`approved_by` text,
	`approved_at` text,
	`rejection_reason` text,
	`location_snapshots` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`attendance_id`) REFERENCES `attendance_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `presence` (
	`staff_id` text PRIMARY KEY NOT NULL,
	`online` integer DEFAULT false NOT NULL,
	`last_seen_at` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`status_text` text,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `presence_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`attendance_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`accuracy` real,
	`is_within_geofence` integer DEFAULT true NOT NULL,
	`is_mock_location` integer DEFAULT false,
	`wifi_ssid` text,
	`verification_method` text DEFAULT 'gps',
	`distance_from_office` real,
	`network_state` text DEFAULT 'online',
	`battery_level` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`attendance_id`) REFERENCES `attendance_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `presence_verification_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text,
	`is_enabled` integer DEFAULT true NOT NULL,
	`shadow_mode` integer DEFAULT true NOT NULL,
	`check_interval_minutes` integer DEFAULT 10,
	`grace_period_minutes` integer DEFAULT 5,
	`auto_checkout_on_violation` integer DEFAULT false,
	`geofence_radius_meters` integer DEFAULT 150,
	`low_battery_interval_minutes` integer DEFAULT 15,
	`critical_battery_suspend` integer DEFAULT true,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP INDEX `attendance_locations_nfc_tag_id_unique`;--> statement-breakpoint
DROP INDEX `idx_location_nfc_tag`;--> statement-breakpoint
ALTER TABLE `attendance_locations` ADD `accuracy` real;--> statement-breakpoint
ALTER TABLE `attendance_locations` ADD `wifi_ssids` text;--> statement-breakpoint
ALTER TABLE `attendance_locations` ADD `deleted_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_location_qr_secret` ON `attendance_locations` (`qr_secret`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX `idx_location_active` ON `attendance_locations` (`institution_id`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_location_nfc_tag` ON `attendance_locations` (`nfc_tag_id`) WHERE deleted_at IS NULL;--> statement-breakpoint
ALTER TABLE `attendance_logs` ADD `presence_status` text DEFAULT 'verified';--> statement-breakpoint
ALTER TABLE `attendance_logs` ADD `last_verified_at` text;--> statement-breakpoint
ALTER TABLE `attendance_logs` ADD `geofence_violations` integer DEFAULT 0;