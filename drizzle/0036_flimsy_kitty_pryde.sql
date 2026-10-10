CREATE TABLE `agent_live_session_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`session_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`segment_type` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `agent_live_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agent_live_segments_seq` ON `agent_live_session_segments` (`session_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_agent_live_segments_inst_time` ON `agent_live_session_segments` (`institution_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `agent_live_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`session_type` text NOT NULL,
	`camera_zone_id` text,
	`model_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`keyframe_interval_seconds` integer DEFAULT 1 NOT NULL,
	`max_duration_seconds` integer DEFAULT 900 NOT NULL,
	`total_seconds` integer DEFAULT 0 NOT NULL,
	`total_frames` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`started_by` text,
	`started_at` text DEFAULT (current_timestamp) NOT NULL,
	`ended_at` text,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`camera_zone_id`) REFERENCES `hardware_zones`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`started_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_agent_live_inst_status` ON `agent_live_sessions` (`institution_id`,`status`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_agent_live_zone` ON `agent_live_sessions` (`camera_zone_id`);--> statement-breakpoint
CREATE TABLE `agent_plugin_installations` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`plugin_id` text NOT NULL,
	`installed_version` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`granted_tool_permissions_json` text NOT NULL,
	`config_json` text,
	`installed_by` text,
	`last_run_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plugin_id`) REFERENCES `agent_plugins`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`installed_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agent_plugin_inst_tenant_plugin` ON `agent_plugin_installations` (`institution_id`,`plugin_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_plugin_inst_enabled` ON `agent_plugin_installations` (`institution_id`,`enabled`);--> statement-breakpoint
CREATE TABLE `agent_plugin_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`plugin_id` text NOT NULL,
	`reviewer_staff_id` text NOT NULL,
	`rating` integer NOT NULL,
	`review_text` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plugin_id`) REFERENCES `agent_plugins`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agent_reviews_inst_user_plugin` ON `agent_plugin_reviews` (`institution_id`,`plugin_id`,`reviewer_staff_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_reviews_plugin` ON `agent_plugin_reviews` (`plugin_id`);--> statement-breakpoint
CREATE TABLE `agent_plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text,
	`scope` text DEFAULT 'global' NOT NULL,
	`plugin_key` text NOT NULL,
	`display_name` text NOT NULL,
	`summary` text NOT NULL,
	`description` text,
	`version` text NOT NULL,
	`author_staff_id` text,
	`author_verified` integer DEFAULT false NOT NULL,
	`category` text NOT NULL,
	`capabilities_json` text NOT NULL,
	`manifest_json` text NOT NULL,
	`manifest_hash` text NOT NULL,
	`approval_status` text DEFAULT 'draft' NOT NULL,
	`installed_count` integer DEFAULT 0 NOT NULL,
	`rating_avg` real DEFAULT 0 NOT NULL,
	`rating_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agent_plugins_key_ver` ON `agent_plugins` (`plugin_key`,`version`);--> statement-breakpoint
CREATE INDEX `idx_agent_plugins_inst_scope` ON `agent_plugins` (`institution_id`,`scope`,`approval_status`);--> statement-breakpoint
CREATE INDEX `idx_agent_plugins_category` ON `agent_plugins` (`category`);--> statement-breakpoint
CREATE INDEX `idx_agent_plugins_manifest` ON `agent_plugins` (`manifest_hash`);--> statement-breakpoint
CREATE TABLE `agent_workflow_graphs` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`graph_name` text NOT NULL,
	`description` text,
	`canvas_state_json` text NOT NULL,
	`dsl_payload_json` text NOT NULL,
	`dsl_hash` text NOT NULL,
	`workflow_id` text,
	`graph_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workflow_id`) REFERENCES `agentic_workflows`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agent_graphs_inst_name_ver` ON `agent_workflow_graphs` (`institution_id`,`graph_name`,`graph_version`);--> statement-breakpoint
CREATE INDEX `idx_agent_graphs_inst_status` ON `agent_workflow_graphs` (`institution_id`,`status`);