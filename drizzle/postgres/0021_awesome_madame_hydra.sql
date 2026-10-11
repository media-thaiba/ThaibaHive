CREATE TABLE "agent_workflow_graph_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"graph_id" text NOT NULL,
	"version" integer NOT NULL,
	"graph_name" text NOT NULL,
	"description" text,
	"canvas_state_json" text NOT NULL,
	"dsl_payload_json" text NOT NULL,
	"dsl_hash" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"change_kind" text DEFAULT 'manual' NOT NULL,
	"restored_from_version" integer,
	"created_by" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_workflow_graph_versions" ADD CONSTRAINT "agent_workflow_graph_versions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflow_graph_versions" ADD CONSTRAINT "agent_workflow_graph_versions_graph_id_agent_workflow_graphs_id_fk" FOREIGN KEY ("graph_id") REFERENCES "public"."agent_workflow_graphs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_workflow_graph_versions" ADD CONSTRAINT "agent_workflow_graph_versions_created_by_staff_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_agent_graph_versions_graph_ver" ON "agent_workflow_graph_versions" USING btree ("graph_id","version");--> statement-breakpoint
CREATE INDEX "idx_pg_agent_graph_versions_inst_created" ON "agent_workflow_graph_versions" USING btree ("institution_id","created_at");