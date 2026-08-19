CREATE TABLE "workspace_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"staff_id" text,
	"guardian_id" text,
	"workspace_type" text NOT NULL,
	"layout_config" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_preferences" ADD CONSTRAINT "workspace_preferences_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_preferences" ADD CONSTRAINT "workspace_preferences_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_preferences" ADD CONSTRAINT "workspace_preferences_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pg_workspace_prefs_staff_id" ON "workspace_preferences" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_pg_workspace_prefs_guardian_id" ON "workspace_preferences" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "idx_pg_workspace_prefs_inst_id" ON "workspace_preferences" USING btree ("institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_workspace_prefs_staff_ws_uniq" ON "workspace_preferences" USING btree ("staff_id","workspace_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_workspace_prefs_guard_ws_uniq" ON "workspace_preferences" USING btree ("guardian_id","workspace_type");