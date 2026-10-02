PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_presence_verification_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text,
	`is_enabled` integer DEFAULT true NOT NULL,
	`shadow_mode` integer DEFAULT true NOT NULL,
	`check_interval_minutes` integer DEFAULT 10 NOT NULL,
	`grace_period_minutes` integer DEFAULT 5 NOT NULL,
	`auto_checkout_on_violation` integer DEFAULT false NOT NULL,
	`geofence_radius_meters` integer DEFAULT 150 NOT NULL,
	`low_battery_interval_minutes` integer DEFAULT 15 NOT NULL,
	`critical_battery_suspend` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_presence_verification_settings`("id", "institution_id", "is_enabled", "shadow_mode", "check_interval_minutes", "grace_period_minutes", "auto_checkout_on_violation", "geofence_radius_meters", "low_battery_interval_minutes", "critical_battery_suspend", "created_at", "updated_at") SELECT "id", "institution_id", "is_enabled", "shadow_mode", "check_interval_minutes", "grace_period_minutes", "auto_checkout_on_violation", "geofence_radius_meters", "low_battery_interval_minutes", "critical_battery_suspend", "created_at", "updated_at" FROM `presence_verification_settings`;--> statement-breakpoint
DROP TABLE `presence_verification_settings`;--> statement-breakpoint
ALTER TABLE `__new_presence_verification_settings` RENAME TO `presence_verification_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_settings_inst_coalesce` ON `presence_verification_settings` (`coalesce("institution_id"`,` 'GLOBAL_DEFAULT')`);