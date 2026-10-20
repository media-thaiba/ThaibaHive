PRAGMA foreign_keys=OFF;--> statement-breakpoint
UPDATE `visitors` SET `institution_id` = COALESCE((SELECT `id` FROM `institutions` ORDER BY `created_at` ASC LIMIT 1), 'inst_default') WHERE `institution_id` IS NULL;--> statement-breakpoint
CREATE TABLE `__new_visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact` text,
	`id_type` text,
	`id_number` text,
	`host_staff_id` text,
	`purpose` text NOT NULL,
	`check_in` text NOT NULL,
	`check_out` text,
	`status` text DEFAULT 'checked_in' NOT NULL,
	`notes` text,
	`institution_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`host_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_visitors`("id", "name", "contact", "id_type", "id_number", "host_staff_id", "purpose", "check_in", "check_out", "status", "notes", "institution_id", "created_at") SELECT "id", "name", "contact", "id_type", "id_number", "host_staff_id", "purpose", "check_in", "check_out", "status", "notes", COALESCE("institution_id", (SELECT "id" FROM "institutions" ORDER BY "created_at" ASC LIMIT 1), 'inst_default'), "created_at" FROM `visitors`;--> statement-breakpoint
DROP TABLE `visitors`;--> statement-breakpoint
ALTER TABLE `__new_visitors` RENAME TO `visitors`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_visitors_status` ON `visitors` (`status`);
