CREATE TABLE `circular_downloads` (
	`id` text PRIMARY KEY NOT NULL,
	`circular_id` text NOT NULL,
	`staff_id` text,
	`ip_address` text,
	`user_agent` text,
	`downloaded_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`circular_id`) REFERENCES `circulars`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
