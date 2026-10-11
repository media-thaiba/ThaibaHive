CREATE TABLE `agent_workflow_graph_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`graph_id` text NOT NULL,
	`version` integer NOT NULL,
	`graph_name` text NOT NULL,
	`description` text,
	`canvas_state_json` text NOT NULL,
	`dsl_payload_json` text NOT NULL,
	`dsl_hash` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`change_kind` text DEFAULT 'manual' NOT NULL,
	`restored_from_version` integer,
	`created_by` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`graph_id`) REFERENCES `agent_workflow_graphs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_agent_graph_versions_graph_ver` ON `agent_workflow_graph_versions` (`graph_id`,`version`);--> statement-breakpoint
CREATE INDEX `idx_agent_graph_versions_inst_created` ON `agent_workflow_graph_versions` (`institution_id`,`created_at`);