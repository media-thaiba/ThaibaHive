CREATE TABLE `mobile_sync_processed` (
	`client_event_id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_mobile_sync_processed_staff` ON `mobile_sync_processed` (`staff_id`);