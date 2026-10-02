DROP INDEX `idx_settings_inst_coalesce`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_settings_inst_id` ON `presence_verification_settings` (`institution_id`) WHERE institution_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_settings_global_uniq` ON `presence_verification_settings` (`is_enabled`) WHERE institution_id IS NULL;