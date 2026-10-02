CREATE TABLE `access_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`app_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reason` text,
	`assigned_role_id` text,
	`routed_to_id` text,
	`reviewed_at` text,
	`review_notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`app_id`) REFERENCES `marketplace_apps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_role_id`) REFERENCES `app_default_roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`routed_to_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `app_default_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`role_name` text NOT NULL,
	`permissions` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `marketplace_apps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `marketplace_apps` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`icon` text,
	`category` text NOT NULL,
	`department_id` text,
	`subdomain` text,
	`route_prefix` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketplace_apps_slug_unique` ON `marketplace_apps` (`slug`);--> statement-breakpoint
CREATE TABLE `user_app_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`app_id` text NOT NULL,
	`role_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`installed_at` text DEFAULT (current_timestamp) NOT NULL,
	`revoked_at` text,
	`revoked_by_id` text,
	`revoked_reason` text,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`app_id`) REFERENCES `marketplace_apps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `app_default_roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`revoked_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_app_assignments_staff_app` ON `user_app_assignments` (`staff_id`,`app_id`);