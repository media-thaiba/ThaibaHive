ALTER TABLE `attendance_locations` ADD `latitude` real;--> statement-breakpoint
ALTER TABLE `attendance_locations` ADD `longitude` real;--> statement-breakpoint
ALTER TABLE `attendance_locations` ADD `radius` real;--> statement-breakpoint
ALTER TABLE `tasks` ADD `sort_order` integer DEFAULT 0 NOT NULL;