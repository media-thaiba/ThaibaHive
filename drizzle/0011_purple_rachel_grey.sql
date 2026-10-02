DROP INDEX `idx_settings_inst_coalesce`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_settings_inst_id` ON `presence_verification_settings` (`institution_id`);