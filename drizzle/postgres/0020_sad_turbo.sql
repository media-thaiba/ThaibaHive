CREATE TABLE "agent_live_session_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"session_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"segment_type" text NOT NULL,
	"payload_json" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_live_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"session_type" text NOT NULL,
	"camera_zone_id" text,
	"model_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"keyframe_interval_seconds" integer DEFAULT 1 NOT NULL,
	"max_duration_seconds" integer DEFAULT 900 NOT NULL,
	"total_seconds" integer DEFAULT 0 NOT NULL,
	"total_frames" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"started_by" text,
	"started_at" text DEFAULT (current_timestamp) NOT NULL,
	"ended_at" text
);
--> statement-breakpoint
CREATE TABLE "agent_plugin_installations" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"plugin_id" text NOT NULL,
	"installed_version" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"granted_tool_permissions_json" text NOT NULL,
	"config_json" text,
	"installed_by" text,
	"last_run_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_plugin_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"plugin_id" text NOT NULL,
	"reviewer_staff_id" text NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_plugins" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text,
	"scope" text DEFAULT 'global' NOT NULL,
	"plugin_key" text NOT NULL,
	"display_name" text NOT NULL,
	"summary" text NOT NULL,
	"description" text,
	"version" text NOT NULL,
	"author_staff_id" text,
	"author_verified" boolean DEFAULT false NOT NULL,
	"category" text NOT NULL,
	"capabilities_json" text NOT NULL,
	"manifest_json" text NOT NULL,
	"manifest_hash" text NOT NULL,
	"approval_status" text DEFAULT 'draft' NOT NULL,
	"installed_count" integer DEFAULT 0 NOT NULL,
	"rating_avg" double precision DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_workflow_graphs" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"graph_name" text NOT NULL,
	"description" text,
	"canvas_state_json" text NOT NULL,
	"dsl_payload_json" text NOT NULL,
	"dsl_hash" text NOT NULL,
	"workflow_id" text,
	"graph_version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_live_session_segments" ADD CONSTRAINT "agent_live_session_segments_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_live_session_segments" ADD CONSTRAINT "agent_live_session_segments_session_id_agent_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_live_sessions" ADD CONSTRAINT "agent_live_sessions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_live_sessions" ADD CONSTRAINT "agent_live_sessions_camera_zone_id_hardware_zones_id_fk" FOREIGN KEY ("camera_zone_id") REFERENCES "public"."hardware_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_live_sessions" ADD CONSTRAINT "agent_live_sessions_started_by_staff_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_plugin_installations" ADD CONSTRAINT "agent_plugin_installations_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_plugin_installations" ADD CONSTRAINT "agent_plugin_installations_plugin_id_agent_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."agent_plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_plugin_installations" ADD CONSTRAINT "agent_plugin_installations_installed_by_staff_id_fk" FOREIGN KEY ("installed_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_plugin_reviews" ADD CONSTRAINT "agent_plugin_reviews_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_plugin_reviews" ADD CONSTRAINT "agent_plugin_reviews_plugin_id_agent_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."agent_plugins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_plugin_reviews" ADD CONSTRAINT "agent_plugin_reviews_reviewer_staff_id_staff_id_fk" FOREIGN KEY ("reviewer_staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_plugins" ADD CONSTRAINT "agent_plugins_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_plugins" ADD CONSTRAINT "agent_plugins_author_staff_id_staff_id_fk" FOREIGN KEY ("author_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflow_graphs" ADD CONSTRAINT "agent_workflow_graphs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflow_graphs" ADD CONSTRAINT "agent_workflow_graphs_workflow_id_agentic_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."agentic_workflows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflow_graphs" ADD CONSTRAINT "agent_workflow_graphs_created_by_staff_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_agent_live_segments_seq" ON "agent_live_session_segments" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_pg_agent_live_segments_inst_time" ON "agent_live_session_segments" USING btree ("institution_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_pg_agent_live_inst_status" ON "agent_live_sessions" USING btree ("institution_id","status","started_at");--> statement-breakpoint
CREATE INDEX "idx_pg_agent_live_zone" ON "agent_live_sessions" USING btree ("camera_zone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_agent_plugin_inst_tenant_plugin" ON "agent_plugin_installations" USING btree ("institution_id","plugin_id");--> statement-breakpoint
CREATE INDEX "idx_pg_agent_plugin_inst_enabled" ON "agent_plugin_installations" USING btree ("institution_id","enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_agent_reviews_inst_user_plugin" ON "agent_plugin_reviews" USING btree ("institution_id","plugin_id","reviewer_staff_id");--> statement-breakpoint
CREATE INDEX "idx_pg_agent_reviews_plugin" ON "agent_plugin_reviews" USING btree ("plugin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_agent_plugins_key_ver" ON "agent_plugins" USING btree ("plugin_key","version");--> statement-breakpoint
CREATE INDEX "idx_pg_agent_plugins_inst_scope" ON "agent_plugins" USING btree ("institution_id","scope","approval_status");--> statement-breakpoint
CREATE INDEX "idx_pg_agent_plugins_category" ON "agent_plugins" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_pg_agent_plugins_manifest" ON "agent_plugins" USING btree ("manifest_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_agent_graphs_inst_name_ver" ON "agent_workflow_graphs" USING btree ("institution_id","graph_name","graph_version");--> statement-breakpoint
CREATE INDEX "idx_pg_agent_graphs_inst_status" ON "agent_workflow_graphs" USING btree ("institution_id","status");