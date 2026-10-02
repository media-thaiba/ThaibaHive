CREATE TABLE `swarm_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_source` text NOT NULL,
	`severity` text NOT NULL,
	`message` text NOT NULL,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `swarm_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`metric_name` text NOT NULL,
	`metric_value` real NOT NULL,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `remediation_history` (
	`id` text PRIMARY KEY NOT NULL,
	`compliance_finding_id` text NOT NULL,
	`action_triggered` text NOT NULL,
	`approval_key` text,
	`approval_status` text NOT NULL,
	`outcome` text NOT NULL,
	`rollback_status` text NOT NULL,
	`created_at` text NOT NULL,
	`institution_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_swarm_events_timestamp` ON `swarm_events` (`timestamp`);
--> statement-breakpoint
CREATE INDEX `idx_swarm_metrics_node_metric` ON `swarm_metrics` (`node_id`,`metric_name`);
--> statement-breakpoint
CREATE INDEX `idx_swarm_metrics_timestamp` ON `swarm_metrics` (`timestamp`);
--> statement-breakpoint
CREATE INDEX `idx_remediation_history_inst` ON `remediation_history` (`institution_id`);