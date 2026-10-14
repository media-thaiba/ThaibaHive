CREATE TABLE `conference_signals` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`room_id` text NOT NULL,
	`sender_peer_id` text NOT NULL,
	`recipient_peer_id` text NOT NULL,
	`signal_type` text NOT NULL,
	`payload_json` text NOT NULL,
	`sequence_num` integer DEFAULT 1 NOT NULL,
	`delivered` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `streaming_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_conference_signals_inst_id` ON `conference_signals` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_conference_signals_room_recip` ON `conference_signals` (`room_id`,`recipient_peer_id`);--> statement-breakpoint
CREATE INDEX `idx_conference_signals_created` ON `conference_signals` (`created_at`);--> statement-breakpoint
CREATE TABLE `sso_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`provider_id` text,
	`provider_type` text NOT NULL,
	`event_type` text NOT NULL,
	`subject_id` text,
	`ip_address` text,
	`user_agent` text,
	`prev_hash` text,
	`merkle_hash` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sso_audit_inst_id` ON `sso_audit_logs` (`institution_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_federated_identity_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`user_id` text NOT NULL,
	`provider_type` text NOT NULL,
	`provider_id` text,
	`external_subject_id` text NOT NULL,
	`external_email` text,
	`external_groups_json` text,
	`mapped_role` text DEFAULT 'staff' NOT NULL,
	`attributes_json` text,
	`jit_provisioned` integer DEFAULT false NOT NULL,
	`last_login_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_federated_identity_mappings`("id", "tenant_id", "institution_id", "user_id", "provider_type", "provider_id", "external_subject_id", "external_email", "external_groups_json", "mapped_role", "attributes_json", "jit_provisioned", "last_login_at", "created_at") SELECT "id", "tenant_id", "tenant_id" AS "institution_id", "user_id", "provider_type", "provider_id", "external_subject_id", "external_email", "external_groups_json", "mapped_role", "attributes_json", "jit_provisioned", "last_login_at", "created_at" FROM `federated_identity_mappings`;--> statement-breakpoint
DROP TABLE `federated_identity_mappings`;--> statement-breakpoint
ALTER TABLE `__new_federated_identity_mappings` RENAME TO `federated_identity_mappings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_fim_inst_id` ON `federated_identity_mappings` (`institution_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_fim_unique_sub` ON `federated_identity_mappings` (`institution_id`,`provider_type`,`external_subject_id`);--> statement-breakpoint
ALTER TABLE `oidc_providers` ADD `institution_id` text NOT NULL REFERENCES institutions(id);--> statement-breakpoint
ALTER TABLE `oidc_providers` ADD `authorization_endpoint` text;--> statement-breakpoint
ALTER TABLE `oidc_providers` ADD `token_endpoint` text;--> statement-breakpoint
ALTER TABLE `oidc_providers` ADD `userinfo_endpoint` text;--> statement-breakpoint
ALTER TABLE `oidc_providers` ADD `jwks_uri` text;--> statement-breakpoint
ALTER TABLE `oidc_providers` ADD `scopes` text DEFAULT 'openid email profile' NOT NULL;--> statement-breakpoint
ALTER TABLE `oidc_providers` ADD `discovery_cache_json` text;--> statement-breakpoint
ALTER TABLE `oidc_providers` ADD `jwks_cache_json` text;--> statement-breakpoint
ALTER TABLE `oidc_providers` ADD `cache_expires_at` text;--> statement-breakpoint
CREATE INDEX `idx_oidc_providers_inst_id` ON `oidc_providers` (`institution_id`);--> statement-breakpoint
ALTER TABLE `saml_providers` ADD `institution_id` text NOT NULL REFERENCES institutions(id);--> statement-breakpoint
ALTER TABLE `saml_providers` ADD `slo_url` text;--> statement-breakpoint
ALTER TABLE `saml_providers` ADD `cert_expires_at` text;--> statement-breakpoint
ALTER TABLE `saml_providers` ADD `binding` text DEFAULT 'HTTP-POST' NOT NULL;--> statement-breakpoint
ALTER TABLE `saml_providers` ADD `want_assertions_signed` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `saml_providers` ADD `attribute_mapping_json` text;--> statement-breakpoint
CREATE INDEX `idx_saml_providers_inst_id` ON `saml_providers` (`institution_id`);--> statement-breakpoint
CREATE TABLE `__new_stream_recordings` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`room_id` text NOT NULL,
	`stream_id` text NOT NULL,
	`duration_seconds` integer DEFAULT 0 NOT NULL,
	`file_size_bytes` integer DEFAULT 0 NOT NULL,
	`recording_url` text NOT NULL,
	`checksum_sha256` text,
	`is_encrypted` integer DEFAULT false NOT NULL,
	`retention_days` integer DEFAULT 90 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `streaming_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_stream_recordings`("id", "tenant_id", "institution_id", "room_id", "stream_id", "duration_seconds", "file_size_bytes", "recording_url", "checksum_sha256", "is_encrypted", "retention_days", "created_at") SELECT "id", "tenant_id", "tenant_id" AS "institution_id", "room_id", "stream_id", "duration_seconds", "file_size_bytes", "recording_url", "checksum_sha256", "is_encrypted", "retention_days", "created_at" FROM `stream_recordings`;--> statement-breakpoint
DROP TABLE `stream_recordings`;--> statement-breakpoint
ALTER TABLE `__new_stream_recordings` RENAME TO `stream_recordings`;--> statement-breakpoint
CREATE INDEX `idx_stream_recordings_inst_id` ON `stream_recordings` (`institution_id`);--> statement-breakpoint
ALTER TABLE `streaming_rooms` ADD `institution_id` text NOT NULL REFERENCES institutions(id);--> statement-breakpoint
ALTER TABLE `streaming_rooms` ADD `passcode_hash` text;--> statement-breakpoint
ALTER TABLE `streaming_rooms` ADD `is_e2ee_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `streaming_rooms` ADD `room_type` text DEFAULT 'conference' NOT NULL;--> statement-breakpoint
ALTER TABLE `streaming_rooms` ADD `recording_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `streaming_rooms` ADD `expires_at` text;--> statement-breakpoint
CREATE INDEX `idx_streaming_rooms_inst_id` ON `streaming_rooms` (`institution_id`);--> statement-breakpoint
CREATE TABLE `__new_streaming_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`room_id` text NOT NULL,
	`participant_user_id` text NOT NULL,
	`peer_id` text,
	`role` text DEFAULT 'ATTENDEE' NOT NULL,
	`audio_muted` integer DEFAULT true NOT NULL,
	`video_muted` integer DEFAULT false NOT NULL,
	`e2ee_public_key` text,
	`connection_quality` text DEFAULT 'good',
	`is_screen_sharing` integer DEFAULT false NOT NULL,
	`joined_at` text DEFAULT (current_timestamp) NOT NULL,
	`left_at` text,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `streaming_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_streaming_sessions`("id", "institution_id", "room_id", "participant_user_id", "peer_id", "role", "audio_muted", "video_muted", "e2ee_public_key", "connection_quality", "is_screen_sharing", "joined_at", "left_at") SELECT "id", '' AS "institution_id", "room_id", "participant_user_id", "peer_id", "role", "audio_muted", "video_muted", "e2ee_public_key", "connection_quality", "is_screen_sharing", "joined_at", "left_at" FROM `streaming_sessions`;--> statement-breakpoint
DROP TABLE `streaming_sessions`;--> statement-breakpoint
ALTER TABLE `__new_streaming_sessions` RENAME TO `streaming_sessions`;--> statement-breakpoint
CREATE INDEX `idx_streaming_sessions_inst_id` ON `streaming_sessions` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_streaming_sessions_room_peer` ON `streaming_sessions` (`room_id`,`peer_id`);