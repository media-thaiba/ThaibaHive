ALTER TABLE `redis_circuit_breaker_states` ADD `failure_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `redis_circuit_breaker_states` ADD `last_tripped_at` text;--> statement-breakpoint
ALTER TABLE `redis_circuit_breaker_states` ADD `expires_at` text;