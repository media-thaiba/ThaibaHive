ALTER TABLE "audit_logs" ADD COLUMN "sequence_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "signature" text;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_audit_logs_tenant_seq" ON "audit_logs" USING btree ("tenant_id","sequence_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_audit_logs_tenant_hash" ON "audit_logs" USING btree ("tenant_id","current_hash");--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "uq_ay_inst_id" UNIQUE("institution_id","id");--> statement-breakpoint
ALTER TABLE "staff_institutions" ADD CONSTRAINT "uq_staff_inst" UNIQUE("institution_id","staff_id");--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "uq_student_inst_id" UNIQUE("institution_id","id");