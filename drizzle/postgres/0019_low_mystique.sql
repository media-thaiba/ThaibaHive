CREATE TABLE "hardware_access_events" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"event_type" text NOT NULL,
	"badge_id" text,
	"staff_id" text,
	"student_id" text,
	"device_id" text NOT NULL,
	"zone_id" text,
	"from_zone_id" text,
	"to_zone_id" text,
	"authentication_method" text NOT NULL,
	"verification_result" text NOT NULL,
	"anti_passback_violation" boolean DEFAULT false NOT NULL,
	"tailgate_detected" boolean DEFAULT false NOT NULL,
	"duress_signal" boolean DEFAULT false NOT NULL,
	"emergency_override" boolean DEFAULT false NOT NULL,
	"step_up_auth_triggered" boolean DEFAULT false NOT NULL,
	"step_up_auth_method" text,
	"step_up_auth_result" text,
	"rssi" integer,
	"snr" double precision,
	"distance_estimate_meters" double precision,
	"coordinates_x" double precision,
	"coordinates_y" double precision,
	"coordinates_z" double precision,
	"merkle_root" text,
	"merkle_proof" text,
	"metadata_json" text,
	"timestamp" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hardware_badges" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"staff_id" text,
	"student_id" text,
	"badge_id" text NOT NULL,
	"badge_type" text NOT NULL,
	"credential_type" text NOT NULL,
	"encoded_data" text,
	"certificate_thumbprint" text,
	"hmac_key_id" text,
	"encrypted_private_key" text,
	"pin_hash" text,
	"biometric_enrolled" boolean DEFAULT false NOT NULL,
	"face_template_id" text,
	"fingerprint_template_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"valid_from" text NOT NULL,
	"valid_until" text,
	"last_used_at" text,
	"last_used_zone_id" text,
	"last_used_device_id" text,
	"access_rules_json" text,
	"revoked_at" text,
	"revoked_reason" text,
	"metadata_json" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hardware_biometric_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" text NOT NULL,
	"modality" text NOT NULL,
	"encrypted_template" text NOT NULL,
	"encryption_key_version" integer DEFAULT 1 NOT NULL,
	"algorithm" text DEFAULT 'facenet-512d-v1' NOT NULL,
	"quality_score" double precision DEFAULT 0 NOT NULL,
	"enrolled_at" text NOT NULL,
	"enrolled_by_device_id" text,
	"enrolled_by_staff_id" text,
	"last_verified_at" text,
	"verification_count" integer DEFAULT 0 NOT NULL,
	"false_accept_count" integer DEFAULT 0 NOT NULL,
	"false_reject_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" text,
	"metadata_json" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hardware_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"model" text,
	"firmware_version" text,
	"mac_address" text,
	"ip_address" text,
	"status" text DEFAULT 'offline' NOT NULL,
	"zone_id" text,
	"coordinates_x" double precision,
	"coordinates_y" double precision,
	"coordinates_z" double precision,
	"last_heartbeat_at" text,
	"last_firmware_check_at" text,
	"firmware_update_available" boolean DEFAULT false NOT NULL,
	"certificate_thumbprint" text,
	"hmac_key_id" text,
	"configuration_json" text,
	"metadata_json" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hardware_telemetry_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"device_id" text NOT NULL,
	"zone_id" text,
	"log_type" text NOT NULL,
	"rssi" integer,
	"snr" double precision,
	"battery_level" double precision,
	"temperature_celsius" double precision,
	"humidity_percent" double precision,
	"motion_detected" boolean,
	"firmware_version" text,
	"certificate_expiry_days" integer,
	"cpu_usage_percent" double precision,
	"memory_usage_percent" double precision,
	"network_latency_ms" integer,
	"packet_loss_percent" double precision,
	"coordinates_x" double precision,
	"coordinates_y" double precision,
	"coordinates_z" double precision,
	"merkle_root" text,
	"merkle_proof" text,
	"metadata_json" text,
	"timestamp" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hardware_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"parent_zone_id" text,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"floor_number" integer,
	"coordinates_x" double precision,
	"coordinates_y" double precision,
	"coordinates_z" double precision,
	"width" double precision,
	"height" double precision,
	"path_loss_exponent" double precision DEFAULT 3,
	"wall_attenuation_db" double precision DEFAULT 0,
	"is_muster_point" boolean DEFAULT false NOT NULL,
	"emergency_egress_route" text,
	"metadata_json" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hardware_access_events" ADD CONSTRAINT "hardware_access_events_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_access_events" ADD CONSTRAINT "hardware_access_events_badge_id_hardware_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."hardware_badges"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_access_events" ADD CONSTRAINT "hardware_access_events_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_access_events" ADD CONSTRAINT "hardware_access_events_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_access_events" ADD CONSTRAINT "hardware_access_events_device_id_hardware_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."hardware_devices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_access_events" ADD CONSTRAINT "hardware_access_events_zone_id_hardware_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."hardware_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_access_events" ADD CONSTRAINT "hardware_access_events_from_zone_id_hardware_zones_id_fk" FOREIGN KEY ("from_zone_id") REFERENCES "public"."hardware_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_access_events" ADD CONSTRAINT "hardware_access_events_to_zone_id_hardware_zones_id_fk" FOREIGN KEY ("to_zone_id") REFERENCES "public"."hardware_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_badges" ADD CONSTRAINT "hardware_badges_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_badges" ADD CONSTRAINT "hardware_badges_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_badges" ADD CONSTRAINT "hardware_badges_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_badges" ADD CONSTRAINT "hardware_badges_last_used_zone_id_hardware_zones_id_fk" FOREIGN KEY ("last_used_zone_id") REFERENCES "public"."hardware_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_badges" ADD CONSTRAINT "hardware_badges_last_used_device_id_hardware_devices_id_fk" FOREIGN KEY ("last_used_device_id") REFERENCES "public"."hardware_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_biometric_templates" ADD CONSTRAINT "hardware_biometric_templates_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_biometric_templates" ADD CONSTRAINT "hardware_biometric_templates_enrolled_by_device_id_hardware_devices_id_fk" FOREIGN KEY ("enrolled_by_device_id") REFERENCES "public"."hardware_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_biometric_templates" ADD CONSTRAINT "hardware_biometric_templates_enrolled_by_staff_id_staff_id_fk" FOREIGN KEY ("enrolled_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_devices" ADD CONSTRAINT "hardware_devices_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_devices" ADD CONSTRAINT "hardware_devices_zone_id_hardware_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."hardware_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_telemetry_logs" ADD CONSTRAINT "hardware_telemetry_logs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_telemetry_logs" ADD CONSTRAINT "hardware_telemetry_logs_device_id_hardware_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."hardware_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_telemetry_logs" ADD CONSTRAINT "hardware_telemetry_logs_zone_id_hardware_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."hardware_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_zones" ADD CONSTRAINT "hardware_zones_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_zones" ADD CONSTRAINT "hardware_zones_parent_zone_id_hardware_zones_id_fk" FOREIGN KEY ("parent_zone_id") REFERENCES "public"."hardware_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pg_hw_access_events_inst_event" ON "hardware_access_events" USING btree ("institution_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_access_events_inst_device" ON "hardware_access_events" USING btree ("institution_id","device_id");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_access_events_inst_badge" ON "hardware_access_events" USING btree ("institution_id","badge_id");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_access_events_inst_staff" ON "hardware_access_events" USING btree ("institution_id","staff_id");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_access_events_inst_student" ON "hardware_access_events" USING btree ("institution_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_access_events_inst_zone" ON "hardware_access_events" USING btree ("institution_id","zone_id");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_access_events_inst_timestamp" ON "hardware_access_events" USING btree ("institution_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_access_events_type" ON "hardware_access_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_access_events_merkle" ON "hardware_access_events" USING btree ("merkle_root");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_access_events_duress" ON "hardware_access_events" USING btree ("duress_signal");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_badges_inst_status" ON "hardware_badges" USING btree ("institution_id","status");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_badges_inst_staff" ON "hardware_badges" USING btree ("institution_id","staff_id");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_badges_inst_student" ON "hardware_badges" USING btree ("institution_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_hw_badges_badge_id" ON "hardware_badges" USING btree ("badge_id");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_badges_cert" ON "hardware_badges" USING btree ("certificate_thumbprint");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_badges_validity" ON "hardware_badges" USING btree ("valid_from","valid_until");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_bio_templates_inst_owner" ON "hardware_biometric_templates" USING btree ("institution_id","owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_bio_templates_inst_modality" ON "hardware_biometric_templates" USING btree ("institution_id","modality");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_hw_bio_templates_owner_modality" ON "hardware_biometric_templates" USING btree ("owner_type","owner_id","modality");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_bio_templates_status" ON "hardware_biometric_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_devices_inst_status" ON "hardware_devices" USING btree ("institution_id","status");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_devices_inst_zone" ON "hardware_devices" USING btree ("institution_id","zone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_hw_devices_mac" ON "hardware_devices" USING btree ("mac_address");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_devices_cert" ON "hardware_devices" USING btree ("certificate_thumbprint");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_telemetry_inst_device" ON "hardware_telemetry_logs" USING btree ("institution_id","device_id");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_telemetry_inst_type" ON "hardware_telemetry_logs" USING btree ("institution_id","log_type");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_telemetry_inst_timestamp" ON "hardware_telemetry_logs" USING btree ("institution_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_telemetry_device_timestamp" ON "hardware_telemetry_logs" USING btree ("device_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_telemetry_merkle" ON "hardware_telemetry_logs" USING btree ("merkle_root");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_zones_inst_parent" ON "hardware_zones" USING btree ("institution_id","parent_zone_id");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_zones_inst_type" ON "hardware_zones" USING btree ("institution_id","type");--> statement-breakpoint
CREATE INDEX "idx_pg_hw_zones_muster" ON "hardware_zones" USING btree ("is_muster_point");