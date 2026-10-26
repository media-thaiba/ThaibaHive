CREATE TABLE "attendance_days" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"institution_id" text,
	"local_date" text NOT NULL,
	"first_in" bigint,
	"last_out" bigint,
	"first_in_time" text,
	"last_out_time" text,
	"total_minutes" integer DEFAULT 0,
	"status" text DEFAULT 'present' NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"review_reason" text,
	"is_pilot" boolean DEFAULT true NOT NULL,
	"rebuilt_at" bigint NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_events" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"institution_id" text,
	"client_event_id" text NOT NULL,
	"kind" text NOT NULL,
	"method" text DEFAULT 'geofence' NOT NULL,
	"effective_at" bigint NOT NULL,
	"time_trust" text DEFAULT 'server' NOT NULL,
	"device_claimed_at" bigint,
	"received_at" bigint NOT NULL,
	"local_date" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"accuracy_m" double precision,
	"is_mocked" boolean DEFAULT false NOT NULL,
	"geofence_id" text,
	"device_id" text,
	"app_version" text,
	"flags" text,
	"is_pilot" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "punch_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text,
	"request_id" text,
	"ip_address" text,
	"user_agent" text,
	"app_version" text,
	"kind" text,
	"method" text,
	"outcome" text NOT NULL,
	"reason" text,
	"raw_payload_snippet" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_days" ADD CONSTRAINT "attendance_days_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_days" ADD CONSTRAINT "attendance_days_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_att_days_staff_date" ON "attendance_days" USING btree ("staff_id","local_date");--> statement-breakpoint
CREATE INDEX "idx_att_days_inst_date" ON "attendance_days" USING btree ("institution_id","local_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_att_events_staff_client" ON "attendance_events" USING btree ("staff_id","client_event_id");--> statement-breakpoint
CREATE INDEX "idx_att_events_staff_date_eff" ON "attendance_events" USING btree ("staff_id","local_date","effective_at");--> statement-breakpoint
CREATE INDEX "idx_att_events_inst" ON "attendance_events" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_punch_attempts_req" ON "punch_attempts" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_punch_attempts_staff_created" ON "punch_attempts" USING btree ("staff_id","created_at");