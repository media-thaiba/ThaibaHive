CREATE INDEX `idx_academic_years_institution` ON `academic_years` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_bookings_institution` ON `bookings` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_bookings_resource_id` ON `bookings` (`resource_id`);--> statement-breakpoint
CREATE INDEX `idx_classes_institution` ON `classes` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_classes_department` ON `classes` (`department_id`);--> statement-breakpoint
CREATE INDEX `idx_departments_institution` ON `departments` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_help_desk_tickets_institution` ON `help_desk_tickets` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_help_desk_tickets_status` ON `help_desk_tickets` (`status`);--> statement-breakpoint
CREATE INDEX `idx_leave_requests_institution` ON `leave_requests` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_meal_notifications_institution` ON `meal_notifications` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_meal_notifications_date_meal` ON `meal_notifications` (`date`,`meal_type`);--> statement-breakpoint
CREATE INDEX `idx_media_assets_institution` ON `media_assets` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_media_folders_institution` ON `media_folders` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_media_folders_parent_id` ON `media_folders` (`parent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_staff_institutions_staff_inst_unique` ON `staff_institutions` (`staff_id`,`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_institution` ON `tasks` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_visitors_institution` ON `visitors` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_visitors_status` ON `visitors` (`status`);