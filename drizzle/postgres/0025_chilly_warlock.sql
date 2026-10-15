ALTER TABLE "attendance_logs" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD COLUMN "source" text DEFAULT 'self' NOT NULL;--> statement-breakpoint
ALTER TABLE "presence_logs" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence_logs" ADD CONSTRAINT "presence_logs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pg_attendance_inst" ON "attendance_logs" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_pg_presence_logs_inst" ON "presence_logs" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_pg_presence_logs_staff_created" ON "presence_logs" USING btree ("staff_id","created_at");