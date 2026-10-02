ALTER TABLE `daily_reports` ADD `reviewer_comment` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reports_staff_date` ON `daily_reports` (`staff_id`,`date`);