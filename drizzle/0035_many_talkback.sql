CREATE TABLE `hardware_access_events` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`event_type` text NOT NULL,
	`badge_id` text,
	`staff_id` text,
	`student_id` text,
	`device_id` text NOT NULL,
	`zone_id` text,
	`from_zone_id` text,
	`to_zone_id` text,
	`authentication_method` text NOT NULL,
	`verification_result` text NOT NULL,
	`anti_passback_violation` integer DEFAULT false NOT NULL,
	`tailgate_detected` integer DEFAULT false NOT NULL,
	`duress_signal` integer DEFAULT false NOT NULL,
	`emergency_override` integer DEFAULT false NOT NULL,
	`step_up_auth_triggered` integer DEFAULT false NOT NULL,
	`step_up_auth_method` text,
	`step_up_auth_result` text,
	`rssi` integer,
	`snr` real,
	`distance_estimate_meters` real,
	`coordinates_x` real,
	`coordinates_y` real,
	`coordinates_z` real,
	`merkle_root` text,
	`merkle_proof` text,
	`metadata_json` text,
	`timestamp` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`badge_id`) REFERENCES `hardware_badges`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`device_id`) REFERENCES `hardware_devices`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`zone_id`) REFERENCES `hardware_zones`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`from_zone_id`) REFERENCES `hardware_zones`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`to_zone_id`) REFERENCES `hardware_zones`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_hw_access_events_inst_event` ON `hardware_access_events` (`institution_id`,`event_type`);--> statement-breakpoint
CREATE INDEX `idx_hw_access_events_inst_device` ON `hardware_access_events` (`institution_id`,`device_id`);--> statement-breakpoint
CREATE INDEX `idx_hw_access_events_inst_badge` ON `hardware_access_events` (`institution_id`,`badge_id`);--> statement-breakpoint
CREATE INDEX `idx_hw_access_events_inst_staff` ON `hardware_access_events` (`institution_id`,`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_hw_access_events_inst_student` ON `hardware_access_events` (`institution_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `idx_hw_access_events_inst_zone` ON `hardware_access_events` (`institution_id`,`zone_id`);--> statement-breakpoint
CREATE INDEX `idx_hw_access_events_inst_timestamp` ON `hardware_access_events` (`institution_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_hw_access_events_type` ON `hardware_access_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_hw_access_events_merkle` ON `hardware_access_events` (`merkle_root`);--> statement-breakpoint
CREATE INDEX `idx_hw_access_events_duress` ON `hardware_access_events` (`duress_signal`);--> statement-breakpoint
CREATE TABLE `hardware_badges` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`staff_id` text,
	`student_id` text,
	`badge_id` text NOT NULL,
	`badge_type` text NOT NULL,
	`credential_type` text NOT NULL,
	`encoded_data` text,
	`certificate_thumbprint` text,
	`hmac_key_id` text,
	`encrypted_private_key` text,
	`pin_hash` text,
	`biometric_enrolled` integer DEFAULT false NOT NULL,
	`face_template_id` text,
	`fingerprint_template_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text,
	`last_used_at` text,
	`last_used_zone_id` text,
	`last_used_device_id` text,
	`access_rules_json` text,
	`revoked_at` text,
	`revoked_reason` text,
	`metadata_json` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`last_used_zone_id`) REFERENCES `hardware_zones`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`last_used_device_id`) REFERENCES `hardware_devices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_hw_badges_inst_status` ON `hardware_badges` (`institution_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_hw_badges_inst_staff` ON `hardware_badges` (`institution_id`,`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_hw_badges_inst_student` ON `hardware_badges` (`institution_id`,`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hw_badges_badge_id` ON `hardware_badges` (`badge_id`);--> statement-breakpoint
CREATE INDEX `idx_hw_badges_cert` ON `hardware_badges` (`certificate_thumbprint`);--> statement-breakpoint
CREATE INDEX `idx_hw_badges_validity` ON `hardware_badges` (`valid_from`,`valid_until`);--> statement-breakpoint
CREATE TABLE `hardware_biometric_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`modality` text NOT NULL,
	`encrypted_template` text NOT NULL,
	`encryption_key_version` integer DEFAULT 1 NOT NULL,
	`algorithm` text DEFAULT 'facenet-512d-v1' NOT NULL,
	`quality_score` real DEFAULT 0 NOT NULL,
	`enrolled_at` text NOT NULL,
	`enrolled_by_device_id` text,
	`enrolled_by_staff_id` text,
	`last_verified_at` text,
	`verification_count` integer DEFAULT 0 NOT NULL,
	`false_accept_count` integer DEFAULT 0 NOT NULL,
	`false_reject_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` text,
	`metadata_json` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`enrolled_by_device_id`) REFERENCES `hardware_devices`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`enrolled_by_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_hw_bio_templates_inst_owner` ON `hardware_biometric_templates` (`institution_id`,`owner_type`,`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_hw_bio_templates_inst_modality` ON `hardware_biometric_templates` (`institution_id`,`modality`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hw_bio_templates_owner_modality` ON `hardware_biometric_templates` (`owner_type`,`owner_id`,`modality`);--> statement-breakpoint
CREATE INDEX `idx_hw_bio_templates_status` ON `hardware_biometric_templates` (`status`);--> statement-breakpoint
CREATE TABLE `hardware_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`model` text,
	`firmware_version` text,
	`mac_address` text,
	`ip_address` text,
	`status` text DEFAULT 'offline' NOT NULL,
	`zone_id` text,
	`coordinates_x` real,
	`coordinates_y` real,
	`coordinates_z` real,
	`last_heartbeat_at` text,
	`last_firmware_check_at` text,
	`firmware_update_available` integer DEFAULT false NOT NULL,
	`certificate_thumbprint` text,
	`hmac_key_id` text,
	`configuration_json` text,
	`metadata_json` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`zone_id`) REFERENCES `hardware_zones`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_hw_devices_inst_status` ON `hardware_devices` (`institution_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_hw_devices_inst_zone` ON `hardware_devices` (`institution_id`,`zone_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hw_devices_mac` ON `hardware_devices` (`mac_address`);--> statement-breakpoint
CREATE INDEX `idx_hw_devices_cert` ON `hardware_devices` (`certificate_thumbprint`);--> statement-breakpoint
CREATE TABLE `hardware_telemetry_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`device_id` text NOT NULL,
	`zone_id` text,
	`log_type` text NOT NULL,
	`rssi` integer,
	`snr` real,
	`battery_level` real,
	`temperature_celsius` real,
	`humidity_percent` real,
	`motion_detected` integer,
	`firmware_version` text,
	`certificate_expiry_days` integer,
	`cpu_usage_percent` real,
	`memory_usage_percent` real,
	`network_latency_ms` integer,
	`packet_loss_percent` real,
	`coordinates_x` real,
	`coordinates_y` real,
	`coordinates_z` real,
	`merkle_root` text,
	`merkle_proof` text,
	`metadata_json` text,
	`timestamp` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`device_id`) REFERENCES `hardware_devices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`zone_id`) REFERENCES `hardware_zones`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_hw_telemetry_inst_device` ON `hardware_telemetry_logs` (`institution_id`,`device_id`);--> statement-breakpoint
CREATE INDEX `idx_hw_telemetry_inst_type` ON `hardware_telemetry_logs` (`institution_id`,`log_type`);--> statement-breakpoint
CREATE INDEX `idx_hw_telemetry_inst_timestamp` ON `hardware_telemetry_logs` (`institution_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_hw_telemetry_device_timestamp` ON `hardware_telemetry_logs` (`device_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_hw_telemetry_merkle` ON `hardware_telemetry_logs` (`merkle_root`);--> statement-breakpoint
CREATE TABLE `hardware_zones` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`parent_zone_id` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`floor_number` integer,
	`coordinates_x` real,
	`coordinates_y` real,
	`coordinates_z` real,
	`width` real,
	`height` real,
	`path_loss_exponent` real DEFAULT 3,
	`wall_attenuation_db` real DEFAULT 0,
	`is_muster_point` integer DEFAULT false NOT NULL,
	`emergency_egress_route` text,
	`metadata_json` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_zone_id`) REFERENCES `hardware_zones`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_hw_zones_inst_parent` ON `hardware_zones` (`institution_id`,`parent_zone_id`);--> statement-breakpoint
CREATE INDEX `idx_hw_zones_inst_type` ON `hardware_zones` (`institution_id`,`type`);--> statement-breakpoint
CREATE INDEX `idx_hw_zones_muster` ON `hardware_zones` (`is_muster_point`);