DROP INDEX IF EXISTS "idx_leave_requests_staff_created";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_leave_requests_status";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_tasks_assigned_to_status";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_tasks_department";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_academic_years_inst_id" ON "academic_years" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_bookings_institution" ON "bookings" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_bookings_resource_id" ON "bookings" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_classes_inst_id" ON "classes" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_classes_dept_id" ON "classes" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_departments_inst_id" ON "departments" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_help_desk_tickets_institution" ON "help_desk_tickets" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_help_desk_tickets_status" ON "help_desk_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_leave_requests_staff_created" ON "leave_requests" USING btree ("staff_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_leave_requests_status" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_leave_requests_institution" ON "leave_requests" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_meal_notifications_institution" ON "meal_notifications" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_meal_notifications_date_meal" ON "meal_notifications" USING btree ("date","meal_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_media_assets_institution" ON "media_assets" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_media_folders_institution" ON "media_folders" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_media_folders_parent_id" ON "media_folders" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pg_staff_institutions_staff_inst_unique" ON "staff_institutions" USING btree ("staff_id","institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_tasks_assigned_to_status" ON "tasks" USING btree ("assigned_to_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_tasks_department" ON "tasks" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_tasks_institution" ON "tasks" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_visitors_institution" ON "visitors" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_visitors_status" ON "visitors" USING btree ("status");