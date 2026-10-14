CREATE TABLE "cross_campus_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"action" text NOT NULL,
	"actor_id" text NOT NULL,
	"payload_hash" text NOT NULL,
	"prev_hash" text NOT NULL,
	"entry_hash" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cross_campus_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"pool_id" text NOT NULL,
	"requester_institution_id" text NOT NULL,
	"host_institution_id" text NOT NULL,
	"title" text NOT NULL,
	"starts_at" text NOT NULL,
	"ends_at" text NOT NULL,
	"expires_at" text,
	"status" text DEFAULT 'requested' NOT NULL,
	"requested_by" text NOT NULL,
	"decided_by" text,
	"decided_at" text,
	"decision_reason" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_pools" (
	"id" text PRIMARY KEY NOT NULL,
	"regional_group_id" text NOT NULL,
	"home_institution_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"name" text NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sis_connectors" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"standard" text NOT NULL,
	"name" text NOT NULL,
	"base_url" text NOT NULL,
	"credential_ref" text NOT NULL,
	"auth_mode" text DEFAULT 'oauth2' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"schedule_cron" text,
	"field_mapping_json" text,
	"last_sync_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sis_mapping_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"connector_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"external_id" text NOT NULL,
	"proposed_payload_json" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_by" text,
	"resolved_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sis_sync_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"run_id" text,
	"entity_type" text NOT NULL,
	"external_id" text NOT NULL,
	"action" text NOT NULL,
	"input_hash" text NOT NULL,
	"prev_hash" text NOT NULL,
	"entry_hash" text NOT NULL,
	"retention_days" integer DEFAULT 90 NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sis_sync_records" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"connector_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"external_id" text NOT NULL,
	"local_table" text,
	"local_id" text,
	"state" text DEFAULT 'mapped' NOT NULL,
	"last_seen_at" text DEFAULT (current_timestamp) NOT NULL,
	"payload_hash" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sis_sync_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"connector_id" text NOT NULL,
	"mode" text DEFAULT 'full' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"checkpoint_json" text,
	"read_count" integer DEFAULT 0 NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"error_summary" text,
	"started_at" text DEFAULT (current_timestamp) NOT NULL,
	"finished_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cross_campus_allocations" ADD CONSTRAINT "cross_campus_allocations_booking_id_cross_campus_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."cross_campus_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_campus_bookings" ADD CONSTRAINT "cross_campus_bookings_pool_id_resource_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."resource_pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_campus_bookings" ADD CONSTRAINT "cross_campus_bookings_requester_institution_id_institutions_id_fk" FOREIGN KEY ("requester_institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_campus_bookings" ADD CONSTRAINT "cross_campus_bookings_host_institution_id_institutions_id_fk" FOREIGN KEY ("host_institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_campus_bookings" ADD CONSTRAINT "cross_campus_bookings_requested_by_staff_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_campus_bookings" ADD CONSTRAINT "cross_campus_bookings_decided_by_staff_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_pools" ADD CONSTRAINT "resource_pools_regional_group_id_regional_groups_id_fk" FOREIGN KEY ("regional_group_id") REFERENCES "public"."regional_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_pools" ADD CONSTRAINT "resource_pools_home_institution_id_institutions_id_fk" FOREIGN KEY ("home_institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sis_connectors" ADD CONSTRAINT "sis_connectors_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sis_mapping_queue" ADD CONSTRAINT "sis_mapping_queue_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sis_mapping_queue" ADD CONSTRAINT "sis_mapping_queue_connector_id_sis_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."sis_connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sis_mapping_queue" ADD CONSTRAINT "sis_mapping_queue_resolved_by_staff_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sis_sync_audit" ADD CONSTRAINT "sis_sync_audit_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sis_sync_audit" ADD CONSTRAINT "sis_sync_audit_run_id_sis_sync_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."sis_sync_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sis_sync_records" ADD CONSTRAINT "sis_sync_records_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sis_sync_records" ADD CONSTRAINT "sis_sync_records_connector_id_sis_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."sis_connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sis_sync_runs" ADD CONSTRAINT "sis_sync_runs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sis_sync_runs" ADD CONSTRAINT "sis_sync_runs_connector_id_sis_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."sis_connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_cross_campus_alloc_booking_seq" ON "cross_campus_allocations" USING btree ("booking_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_pg_cross_campus_alloc_booking" ON "cross_campus_allocations" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_pg_cross_campus_bookings_pool_status" ON "cross_campus_bookings" USING btree ("pool_id","status");--> statement-breakpoint
CREATE INDEX "idx_pg_cross_campus_bookings_req_inst" ON "cross_campus_bookings" USING btree ("requester_institution_id","status");--> statement-breakpoint
CREATE INDEX "idx_pg_cross_campus_bookings_host_inst" ON "cross_campus_bookings" USING btree ("host_institution_id","status");--> statement-breakpoint
CREATE INDEX "idx_pg_cross_campus_bookings_time" ON "cross_campus_bookings" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_cross_campus_bookings_pool_starts" ON "cross_campus_bookings" USING btree ("pool_id","starts_at") WHERE status IN ('approved', 'confirmed');--> statement-breakpoint
CREATE INDEX "idx_pg_resource_pools_reg_group" ON "resource_pools" USING btree ("regional_group_id");--> statement-breakpoint
CREATE INDEX "idx_pg_resource_pools_home_inst" ON "resource_pools" USING btree ("home_institution_id");--> statement-breakpoint
CREATE INDEX "idx_pg_resource_pools_type" ON "resource_pools" USING btree ("resource_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_sis_connectors_inst_name" ON "sis_connectors" USING btree ("institution_id","name");--> statement-breakpoint
CREATE INDEX "idx_pg_sis_connectors_inst_enabled" ON "sis_connectors" USING btree ("institution_id","enabled");--> statement-breakpoint
CREATE INDEX "idx_pg_sis_mapping_queue_inst_status" ON "sis_mapping_queue" USING btree ("institution_id","status");--> statement-breakpoint
CREATE INDEX "idx_pg_sis_mapping_queue_conn_status" ON "sis_mapping_queue" USING btree ("connector_id","status");--> statement-breakpoint
CREATE INDEX "idx_pg_sis_mapping_queue_entity_ext" ON "sis_mapping_queue" USING btree ("entity_type","external_id");--> statement-breakpoint
CREATE INDEX "idx_pg_sis_sync_audit_run" ON "sis_sync_audit" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_pg_sis_sync_audit_inst_created" ON "sis_sync_audit" USING btree ("institution_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_sis_sync_records_uniq" ON "sis_sync_records" USING btree ("connector_id","entity_type","external_id");--> statement-breakpoint
CREATE INDEX "idx_pg_sis_sync_records_inst_entity" ON "sis_sync_records" USING btree ("institution_id","entity_type");--> statement-breakpoint
CREATE INDEX "idx_pg_sis_sync_records_local" ON "sis_sync_records" USING btree ("local_table","local_id");--> statement-breakpoint
CREATE INDEX "idx_pg_sis_sync_runs_inst_started" ON "sis_sync_runs" USING btree ("institution_id","started_at");--> statement-breakpoint
CREATE INDEX "idx_pg_sis_sync_runs_conn_status" ON "sis_sync_runs" USING btree ("connector_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_sis_sync_runs_conn_running" ON "sis_sync_runs" USING btree ("connector_id") WHERE status = 'running';--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE OR REPLACE FUNCTION immutable_tsrange(t1 text, t2 text)
RETURNS tsrange AS $$
  SELECT tsrange(t1::timestamp, t2::timestamp);
$$ LANGUAGE sql IMMUTABLE;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cross_campus_bookings_no_overlap'
  ) THEN
    ALTER TABLE "cross_campus_bookings" ADD CONSTRAINT "cross_campus_bookings_no_overlap" EXCLUDE USING gist (pool_id WITH =, immutable_tsrange(starts_at, ends_at) WITH &&) WHERE (status IN ('approved', 'confirmed'));
  END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cross_campus_bookings_time_order'
  ) THEN
    ALTER TABLE "cross_campus_bookings" ADD CONSTRAINT "cross_campus_bookings_time_order" CHECK (ends_at > starts_at);
  END IF;
END $$;