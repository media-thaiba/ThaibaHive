CREATE TABLE `workspace_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`staff_id` text,
	`guardian_id` text,
	`workspace_type` text NOT NULL,
	`layout_config` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guardian_id`) REFERENCES `guardians`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_prefs_staff_id` ON `workspace_preferences` (`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_workspace_prefs_guardian_id` ON `workspace_preferences` (`guardian_id`);--> statement-breakpoint
CREATE INDEX `idx_workspace_prefs_inst_id` ON `workspace_preferences` (`institution_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspace_prefs_staff_ws_uniq` ON `workspace_preferences` (`staff_id`,`workspace_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspace_prefs_guard_ws_uniq` ON `workspace_preferences` (`guardian_id`,`workspace_type`);