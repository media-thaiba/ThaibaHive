CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"gateway" text NOT NULL,
	"event_id" text NOT NULL,
	"gateway_payment_id" text,
	"status" text NOT NULL,
	"processed_at" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fee_payments" ADD COLUMN "reconciled_at" text;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD COLUMN "reconciliation_batch_id" text;--> statement-breakpoint
CREATE INDEX "idx_pg_webhook_gateway" ON "webhook_events" USING btree ("gateway");--> statement-breakpoint
CREATE INDEX "idx_pg_webhook_event" ON "webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_webhook_key" ON "webhook_events" USING btree ("idempotency_key");--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_reconciliation_batch_id_fee_reconciliation_batches_id_fk" FOREIGN KEY ("reconciliation_batch_id") REFERENCES "public"."fee_reconciliation_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pg_attendance_register_locked_by" ON "attendance_register" USING btree ("locked_by_id");--> statement-breakpoint
CREATE INDEX "idx_pg_classes_teacher_id" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_pg_classes_academic_year_id" ON "classes" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "idx_pg_events_inst_id" ON "events" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_pg_events_dept_id" ON "events" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_pg_student_attendance_marked_by" ON "student_attendance_logs" USING btree ("marked_by_id");--> statement-breakpoint
CREATE INDEX "idx_pg_tasks_assigned_by" ON "tasks" USING btree ("assigned_by_id");