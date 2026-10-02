CREATE TABLE `agent_approval_gates` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`step_id` text,
	`institution_id` text NOT NULL,
	`required_permission` text DEFAULT 'agent:workflows:approve' NOT NULL,
	`severity` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approver_id` text,
	`decision_reason` text,
	`expires_at` text,
	`decided_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `agentic_workflow_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`step_id`) REFERENCES `agentic_workflow_steps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approver_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_gate_run` ON `agent_approval_gates` (`run_id`);--> statement-breakpoint
CREATE INDEX `idx_gate_inst` ON `agent_approval_gates` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_gate_status` ON `agent_approval_gates` (`status`);--> statement-breakpoint
CREATE INDEX `idx_gate_expires` ON `agent_approval_gates` (`expires_at`);--> statement-breakpoint
CREATE TABLE `agent_memory_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`scope` text DEFAULT 'episodic' NOT NULL,
	`content_json` text NOT NULL,
	`importance` real DEFAULT 1 NOT NULL,
	`source_ref` text,
	`embedding` text,
	`last_accessed_at` text,
	`expires_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_mem_agent` ON `agent_memory_entries` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_mem_inst` ON `agent_memory_entries` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_mem_scope` ON `agent_memory_entries` (`scope`);--> statement-breakpoint
CREATE INDEX `idx_mem_expires` ON `agent_memory_entries` (`expires_at`);--> statement-breakpoint
CREATE TABLE `agent_outbox_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`topic` text NOT NULL,
	`sender_agent_id` text NOT NULL,
	`recipient_agent_id` text,
	`payload_json` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`last_error` text,
	`scheduled_for` text,
	`delivered_at` text,
	`trace_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_outbox_inst_status` ON `agent_outbox_messages` (`institution_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_outbox_topic` ON `agent_outbox_messages` (`topic`);--> statement-breakpoint
CREATE INDEX `idx_outbox_priority` ON `agent_outbox_messages` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_outbox_sched` ON `agent_outbox_messages` (`scheduled_for`);--> statement-breakpoint
CREATE TABLE `agent_tool_invocations` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`tool_name` text NOT NULL,
	`institution_id` text NOT NULL,
	`status` text NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`input_hash` text NOT NULL,
	`output_hash` text,
	`error` text,
	`audit_hash` text NOT NULL,
	`prev_audit_hash` text NOT NULL,
	`trace_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tool_inv_inst_time` ON `agent_tool_invocations` (`institution_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_tool_inv_prev_hash` ON `agent_tool_invocations` (`prev_audit_hash`);--> statement-breakpoint
CREATE INDEX `idx_tool_inv_agent` ON `agent_tool_invocations` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_tool_inv_tool` ON `agent_tool_invocations` (`tool_name`);--> statement-breakpoint
CREATE INDEX `idx_tool_inv_trace` ON `agent_tool_invocations` (`trace_id`);--> statement-breakpoint
CREATE TABLE `agentic_workflow_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`trigger_type` text DEFAULT 'manual' NOT NULL,
	`triggered_by` text DEFAULT 'system' NOT NULL,
	`context_json` text,
	`error` text,
	`trace_id` text,
	`started_at` text,
	`finished_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `agentic_workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_wf_run_wf` ON `agentic_workflow_runs` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `idx_wf_run_inst` ON `agentic_workflow_runs` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_wf_run_status` ON `agentic_workflow_runs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_wf_run_trace` ON `agentic_workflow_runs` (`trace_id`);--> statement-breakpoint
CREATE TABLE `agentic_workflow_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`institution_id` text NOT NULL,
	`step_key` text NOT NULL,
	`agent_id` text NOT NULL,
	`tool_name` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`input_json` text,
	`output_json` text,
	`compensation_json` text,
	`attempt` integer DEFAULT 0 NOT NULL,
	`error` text,
	`started_at` text,
	`finished_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `agentic_workflow_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_wf_step_run` ON `agentic_workflow_steps` (`run_id`);--> statement-breakpoint
CREATE INDEX `idx_wf_step_key` ON `agentic_workflow_steps` (`run_id`,`step_key`);--> statement-breakpoint
CREATE INDEX `idx_wf_step_status` ON `agentic_workflow_steps` (`status`);--> statement-breakpoint
CREATE TABLE `agentic_workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`definition_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_wf_inst` ON `agentic_workflows` (`institution_id`);--> statement-breakpoint
CREATE INDEX `idx_wf_status` ON `agentic_workflows` (`status`);