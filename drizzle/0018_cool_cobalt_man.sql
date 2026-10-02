CREATE TABLE `sync_tuning_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`network_type` text NOT NULL,
	`min_bandwidth_kbps` integer DEFAULT 0 NOT NULL,
	`max_latency_ms` integer DEFAULT 0 NOT NULL,
	`batch_size` integer DEFAULT 50 NOT NULL,
	`compression_level` integer DEFAULT 1 NOT NULL,
	`retry_backoff_ms` integer DEFAULT 5000 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_tuning_policies_network_type_unique` ON `sync_tuning_policies` (`network_type`);