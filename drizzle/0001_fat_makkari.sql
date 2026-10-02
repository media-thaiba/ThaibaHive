CREATE TABLE `financial_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	`transaction_date` text NOT NULL,
	`recorded_by_id` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meal_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`date` text NOT NULL,
	`meal_type` text NOT NULL,
	`status` text DEFAULT 'skip' NOT NULL,
	`guest_count` integer DEFAULT 0,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vehicle_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`booked_by_id` text NOT NULL,
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text,
	`purpose` text NOT NULL,
	`destination` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by_id` text,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booked_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vehicle_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`date` text NOT NULL,
	`start_odometer` integer,
	`end_odometer` integer,
	`distance_km` real,
	`fuel_litres` real,
	`fuel_cost` real,
	`route` text,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`driver_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_number` text NOT NULL,
	`model` text NOT NULL,
	`type` text NOT NULL,
	`capacity` integer DEFAULT 1 NOT NULL,
	`fuel_type` text DEFAULT 'petrol' NOT NULL,
	`institution_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_registration_number_unique` ON `vehicles` (`registration_number`);