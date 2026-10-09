CREATE INDEX `idx_staff_name` ON `staff` (`first_name`,`last_name`);--> statement-breakpoint
CREATE INDEX `idx_students_name` ON `students` (`first_name`,`last_name`);--> statement-breakpoint
CREATE INDEX `idx_students_email` ON `students` (`email`);--> statement-breakpoint
CREATE INDEX `idx_tasks_title` ON `tasks` (`title`);--> statement-breakpoint
CREATE INDEX `idx_announcements_title` ON `announcements` (`title`);--> statement-breakpoint
CREATE INDEX `idx_events_title` ON `events` (`title`);
