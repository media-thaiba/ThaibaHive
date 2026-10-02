CREATE TABLE `approval_delegations` (
	`id` text PRIMARY KEY NOT NULL,
	`delegator_id` text NOT NULL,
	`delegate_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`is_active` integer DEFAULT true NOT NULL,
	`reason` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`delegator_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`delegate_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `checklist_template_items` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `checklist_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `checklist_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'onboarding' NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff_checklist_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`checklist_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`is_completed` integer DEFAULT false NOT NULL,
	`completed_by_id` text,
	`completed_at` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`checklist_id`) REFERENCES `staff_checklists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`completed_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `staff_checklists` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_id` text NOT NULL,
	`template_id` text,
	`type` text DEFAULT 'onboarding' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`started_at` text,
	`completed_at` text,
	`notes` text,
	`created_by_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`template_id`) REFERENCES `checklist_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `staff` ADD `token_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `is_first_login` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `onboarding_completed_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_attendance_staff_date` ON `attendance_logs` (`staff_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leave_balances_staff_leave_year` ON `leave_balances` (`staff_id`,`leave_type_id`,`year`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_poll_responses_poll_staff` ON `poll_responses` (`poll_id`,`staff_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `staff_date_idx` ON `staff_shifts` (`staff_id`,`effective_from`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_departments` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`head_user_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`head_user_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_departments`("id", "institution_id", "name", "code", "description", "head_user_id", "is_active", "created_at", "updated_at") SELECT "id", "institution_id", "name", "code", "description", "head_user_id", "is_active", "created_at", "updated_at" FROM `departments`;--> statement-breakpoint
DROP TABLE `departments`;--> statement-breakpoint
ALTER TABLE `__new_departments` RENAME TO `departments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;