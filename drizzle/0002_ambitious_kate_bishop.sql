CREATE TABLE `asset_service_history` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`service_date` text NOT NULL,
	`description` text NOT NULL,
	`cost` real,
	`serviced_by` text,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`model` text,
	`serial_number` text,
	`institution_id` text,
	`assigned_to_id` text,
	`location` text,
	`purchase_date` text,
	`purchase_cost` real,
	`warranty_end` text,
	`status` text DEFAULT 'available' NOT NULL,
	`qr_code` text,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `expense_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`amount` real NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`receipt_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by_id` text,
	`reviewed_at` text,
	`review_notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `grievances` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text,
	`is_anonymous` integer DEFAULT true NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`subject` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`response` text,
	`responded_by_id` text,
	`responded_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responded_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `performance_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`period` text NOT NULL,
	`rating` integer,
	`goals` text,
	`achievements` text,
	`areas_for_improvement` text,
	`manager_comments` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`requester_id` text NOT NULL,
	`item_name` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`estimated_cost` real,
	`justification` text,
	`status` text DEFAULT 'pending_hod' NOT NULL,
	`approved_by_hod_id` text,
	`approved_by_accounts_id` text,
	`approved_by_purchase_id` text,
	`approved_at` text,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`requester_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by_hod_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by_accounts_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by_purchase_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `staff_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_availability_staff_id_unique` ON `staff_availability` (`staff_id`);--> statement-breakpoint
CREATE TABLE `visitors` (
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
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`host_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `staff` ADD `qualifications` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `certificates` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `experience_years` real;--> statement-breakpoint
ALTER TABLE `staff` ADD `skills` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `languages` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `emergency_contact_name` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `emergency_contact_phone` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `aadhaar` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `pan` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `bank_account` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `ifsc_code` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `contract_end_date` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `teaching_subjects` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `biography` text;