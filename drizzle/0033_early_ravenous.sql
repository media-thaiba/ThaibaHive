CREATE TABLE `chat_channel_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`client_message_id` text,
	`content` text NOT NULL,
	`type` text DEFAULT 'text' NOT NULL,
	`reply_to_id` text,
	`attachment_url` text,
	`edited_at` text,
	`deleted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`channel_id`) REFERENCES `chat_channels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chat_channel_msg_channel_created` ON `chat_channel_messages` (`channel_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_chat_channel_msg_inst_channel` ON `chat_channel_messages` (`institution_id`,`channel_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_channel_msg_sender_client` ON `chat_channel_messages` (`sender_id`,`client_message_id`);--> statement-breakpoint
CREATE TABLE `chat_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'group' NOT NULL,
	`created_by_id` text NOT NULL,
	`avatar_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chat_channels_inst_type` ON `chat_channels` (`institution_id`,`type`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_chat_channels_inst` ON `chat_channels` (`institution_id`);--> statement-breakpoint
CREATE TABLE `chat_members` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` text DEFAULT (current_timestamp) NOT NULL,
	`last_read_at` text,
	`muted_until` text,
	FOREIGN KEY (`channel_id`) REFERENCES `chat_channels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_chat_members_channel_staff` ON `chat_members` (`channel_id`,`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_members_staff` ON `chat_members` (`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_members_channel` ON `chat_members` (`channel_id`);--> statement-breakpoint
CREATE TABLE `chat_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`status` text DEFAULT 'delivered' NOT NULL,
	`delivered_at` text DEFAULT (current_timestamp) NOT NULL,
	`read_at` text,
	FOREIGN KEY (`message_id`) REFERENCES `chat_channel_messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_chat_receipts_msg_staff` ON `chat_receipts` (`message_id`,`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_receipts_staff` ON `chat_receipts` (`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_announcements_title` ON `announcements` (`title`);--> statement-breakpoint
CREATE INDEX `idx_events_title` ON `events` (`title`);--> statement-breakpoint
CREATE INDEX `idx_staff_name` ON `staff` (`first_name`,`last_name`);--> statement-breakpoint
CREATE INDEX `idx_students_name` ON `students` (`first_name`,`last_name`);--> statement-breakpoint
CREATE INDEX `idx_students_email` ON `students` (`email`);--> statement-breakpoint
CREATE INDEX `idx_tasks_title` ON `tasks` (`title`);