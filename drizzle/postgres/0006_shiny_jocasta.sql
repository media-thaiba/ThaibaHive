CREATE TABLE "report_history" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text,
	"institution_id" text NOT NULL,
	"file_path" text NOT NULL,
	"format" text NOT NULL,
	"status" text NOT NULL,
	"generated_at" text DEFAULT (current_timestamp) NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"frequency" text NOT NULL,
	"format" text NOT NULL,
	"recipients" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_analytics_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"role" text NOT NULL,
	"metric_name" text NOT NULL,
	"metric_value" text NOT NULL,
	"calculated_at" text NOT NULL,
	"time_bucket" text
);
--> statement-breakpoint
ALTER TABLE "report_history" ADD CONSTRAINT "report_history_schedule_id_report_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."report_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_history" ADD CONSTRAINT "report_history_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pg_report_history_inst" ON "report_history" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_pg_report_schedules_inst" ON "report_schedules" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_pg_ws_analytics_inst_calc" ON "workspace_analytics_cache" USING btree ("institution_id","calculated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_ws_analytics_uniq_metric" ON "workspace_analytics_cache" USING btree ("institution_id","role","metric_name","time_bucket");