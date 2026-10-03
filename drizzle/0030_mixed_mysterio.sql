ALTER TABLE `bookings` ADD `institution_id` text REFERENCES institutions(id);--> statement-breakpoint
ALTER TABLE `help_desk_tickets` ADD `institution_id` text REFERENCES institutions(id);--> statement-breakpoint
ALTER TABLE `leave_requests` ADD `institution_id` text REFERENCES institutions(id);--> statement-breakpoint
ALTER TABLE `meal_notifications` ADD `institution_id` text REFERENCES institutions(id);--> statement-breakpoint
ALTER TABLE `media_assets` ADD `institution_id` text REFERENCES institutions(id);--> statement-breakpoint
ALTER TABLE `media_folders` ADD `institution_id` text REFERENCES institutions(id);--> statement-breakpoint
ALTER TABLE `tasks` ADD `institution_id` text REFERENCES institutions(id);--> statement-breakpoint
ALTER TABLE `visitors` ADD `institution_id` text REFERENCES institutions(id);