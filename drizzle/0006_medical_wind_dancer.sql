CREATE TABLE `attendance_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`institution_id` text,
	`nfc_tag_id` text,
	`qr_secret` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_locations_nfc_tag_id_unique` ON `attendance_locations` (`nfc_tag_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_location_nfc_tag` ON `attendance_locations` (`nfc_tag_id`);--> statement-breakpoint
ALTER TABLE `staff` ADD `nfc_tag_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `staff_nfc_tag_id_unique` ON `staff` (`nfc_tag_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_staff_nfc_tag` ON `staff` (`nfc_tag_id`);