CREATE TABLE `cross_campus_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`prev_hash` text NOT NULL,
	`entry_hash` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `cross_campus_bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cross_campus_alloc_booking_seq` ON `cross_campus_allocations` (`booking_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_cross_campus_alloc_booking` ON `cross_campus_allocations` (`booking_id`);--> statement-breakpoint
CREATE TABLE `cross_campus_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_id` text NOT NULL,
	`requester_institution_id` text NOT NULL,
	`host_institution_id` text NOT NULL,
	`title` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`expires_at` text,
	`status` text DEFAULT 'requested' NOT NULL,
	`requested_by` text NOT NULL,
	`decided_by` text,
	`decided_at` text,
	`decision_reason` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`pool_id`) REFERENCES `resource_pools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requester_institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`host_institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requested_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`decided_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_cross_campus_bookings_pool_status` ON `cross_campus_bookings` (`pool_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_cross_campus_bookings_req_inst` ON `cross_campus_bookings` (`requester_institution_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_cross_campus_bookings_host_inst` ON `cross_campus_bookings` (`host_institution_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_cross_campus_bookings_time` ON `cross_campus_bookings` (`starts_at`,`ends_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cross_campus_bookings_pool_starts` ON `cross_campus_bookings` (`pool_id`,`starts_at`) WHERE status IN ('approved', 'confirmed');--> statement-breakpoint
CREATE TABLE `resource_pools` (
	`id` text PRIMARY KEY NOT NULL,
	`regional_group_id` text NOT NULL,
	`home_institution_id` text NOT NULL,
	`resource_type` text NOT NULL,
	`name` text NOT NULL,
	`capacity` integer DEFAULT 1 NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`regional_group_id`) REFERENCES `regional_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`home_institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_resource_pools_reg_group` ON `resource_pools` (`regional_group_id`);--> statement-breakpoint
CREATE INDEX `idx_resource_pools_home_inst` ON `resource_pools` (`home_institution_id`);--> statement-breakpoint
CREATE INDEX `idx_resource_pools_type` ON `resource_pools` (`resource_type`);--> statement-breakpoint
CREATE TABLE `sis_connectors` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`standard` text NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`credential_ref` text NOT NULL,
	`auth_mode` text DEFAULT 'oauth2' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`schedule_cron` text,
	`field_mapping_json` text,
	`last_sync_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sis_connectors_inst_name` ON `sis_connectors` (`institution_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_sis_connectors_inst_enabled` ON `sis_connectors` (`institution_id`,`enabled`);--> statement-breakpoint
CREATE TABLE `sis_mapping_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`connector_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`external_id` text NOT NULL,
	`proposed_payload_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`resolved_by` text,
	`resolved_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connector_id`) REFERENCES `sis_connectors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_sis_mapping_queue_inst_status` ON `sis_mapping_queue` (`institution_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_sis_mapping_queue_conn_status` ON `sis_mapping_queue` (`connector_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_sis_mapping_queue_entity_ext` ON `sis_mapping_queue` (`entity_type`,`external_id`);--> statement-breakpoint
CREATE TABLE `sis_sync_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`run_id` text,
	`entity_type` text NOT NULL,
	`external_id` text NOT NULL,
	`action` text NOT NULL,
	`input_hash` text NOT NULL,
	`prev_hash` text NOT NULL,
	`entry_hash` text NOT NULL,
	`retention_days` integer DEFAULT 90 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`run_id`) REFERENCES `sis_sync_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sis_sync_audit_run` ON `sis_sync_audit` (`run_id`);--> statement-breakpoint
CREATE INDEX `idx_sis_sync_audit_inst_created` ON `sis_sync_audit` (`institution_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sis_sync_records` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`connector_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`external_id` text NOT NULL,
	`local_table` text,
	`local_id` text,
	`state` text DEFAULT 'mapped' NOT NULL,
	`last_seen_at` text DEFAULT (current_timestamp) NOT NULL,
	`payload_hash` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connector_id`) REFERENCES `sis_connectors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sis_sync_records_uniq` ON `sis_sync_records` (`connector_id`,`entity_type`,`external_id`);--> statement-breakpoint
CREATE INDEX `idx_sis_sync_records_inst_entity` ON `sis_sync_records` (`institution_id`,`entity_type`);--> statement-breakpoint
CREATE INDEX `idx_sis_sync_records_local` ON `sis_sync_records` (`local_table`,`local_id`);--> statement-breakpoint
CREATE TABLE `sis_sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`connector_id` text NOT NULL,
	`mode` text DEFAULT 'full' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`checkpoint_json` text,
	`read_count` integer DEFAULT 0 NOT NULL,
	`created_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`skipped_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`error_summary` text,
	`started_at` text DEFAULT (current_timestamp) NOT NULL,
	`finished_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connector_id`) REFERENCES `sis_connectors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sis_sync_runs_inst_started` ON `sis_sync_runs` (`institution_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_sis_sync_runs_conn_status` ON `sis_sync_runs` (`connector_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sis_sync_runs_conn_running` ON `sis_sync_runs` (`connector_id`) WHERE status = 'running';