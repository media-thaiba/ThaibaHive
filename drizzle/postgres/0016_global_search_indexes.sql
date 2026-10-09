CREATE INDEX IF NOT EXISTS "idx_pg_staff_name" ON "staff" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_students_name" ON "students" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_students_email" ON "students" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_tasks_title" ON "tasks" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_announcements_title" ON "announcements" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_events_title" ON "events" USING btree ("title");
