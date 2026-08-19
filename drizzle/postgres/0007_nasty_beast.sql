CREATE TABLE "job_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"status" text NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"started_at" text DEFAULT (current_timestamp) NOT NULL,
	"completed_at" text,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "preference_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" text DEFAULT (current_timestamp) NOT NULL,
	"user_id" text NOT NULL,
	"preference_key" text NOT NULL,
	"old_value" text,
	"new_value" text NOT NULL,
	"ip_address" text,
	"institution_id" text
);
--> statement-breakpoint
CREATE TABLE "scheduled_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"type" text NOT NULL,
	"format" text NOT NULL,
	"options" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_job_id_scheduled_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."scheduled_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preference_audit_log" ADD CONSTRAINT "preference_audit_log_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pg_job_executions_job" ON "job_executions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_pg_pref_audit_user_pref_ts" ON "preference_audit_log" USING btree ("user_id","preference_key","timestamp");--> statement-breakpoint
CREATE INDEX "idx_pg_scheduled_jobs_inst" ON "scheduled_jobs" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_pg_scheduled_jobs_status" ON "scheduled_jobs" USING btree ("status");