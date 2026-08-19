CREATE INDEX CONCURRENTLY "idx_pg_attendance_date" ON "attendance_logs" USING btree ("date");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_pg_attendance_status" ON "attendance_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_pg_attendance_method" ON "attendance_logs" USING btree ("method");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_pg_financial_tx_inst_date" ON "financial_transactions" USING btree ("institution_id","transaction_date");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_pg_financial_tx_recorded_by" ON "financial_transactions" USING btree ("recorded_by_id");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_pg_financial_tx_type" ON "financial_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_pg_financial_tx_category" ON "financial_transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_pg_mark_entries_exam_schedule" ON "mark_entries" USING btree ("exam_schedule_id");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_pg_mark_entries_student" ON "mark_entries" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "idx_pg_mark_entries_schedule_student_uniq" ON "mark_entries" USING btree ("exam_schedule_id","student_id");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_pg_pref_audit_inst_id" ON "preference_audit_log" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_pg_pref_audit_timestamp" ON "preference_audit_log" USING btree ("timestamp");