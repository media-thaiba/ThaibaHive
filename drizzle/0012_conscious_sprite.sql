DROP INDEX `idx_settings_inst_id`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_settings_inst_coalesce` ON `presence_verification_settings` (coalesce(`institution_id`, 'GLOBAL_DEFAULT'));