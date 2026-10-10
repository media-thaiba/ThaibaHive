CREATE TABLE `ai_copilot_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`channel_type` text DEFAULT 'text' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`context_json` text,
	`total_turns` integer DEFAULT 0 NOT NULL,
	`total_input_tokens` integer DEFAULT 0 NOT NULL,
	`total_output_tokens` integer DEFAULT 0 NOT NULL,
	`last_interaction_at` text DEFAULT (current_timestamp) NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`ended_at` text,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ai_sessions_inst_staff` ON `ai_copilot_sessions` (`institution_id`,`staff_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_sessions_inst_status` ON `ai_copilot_sessions` (`institution_id`,`status`);--> statement-breakpoint
CREATE TABLE `ai_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`uploaded_by_id` text NOT NULL,
	`file_url` text NOT NULL,
	`file_name` text NOT NULL,
	`file_size_bytes` integer NOT NULL,
	`mime_type` text NOT NULL,
	`document_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`confidence_score` real,
	`extracted_data_json` text,
	`validation_errors_json` text,
	`confirmed_by_id` text,
	`confirmed_at` text,
	`target_entity_type` text,
	`target_entity_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`confirmed_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_ai_documents_inst_status` ON `ai_documents` (`institution_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_ai_documents_inst_type` ON `ai_documents` (`institution_id`,`document_type`);--> statement-breakpoint
CREATE INDEX `idx_ai_documents_inst_created` ON `ai_documents` (`institution_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `ai_rag_corpus` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`title` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`chunk_index` integer NOT NULL,
	`chunk_content` text NOT NULL,
	`parent_section` text,
	`embedding` text,
	`metadata_json` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ai_rag_inst_source` ON `ai_rag_corpus` (`institution_id`,`source_type`);--> statement-breakpoint
CREATE INDEX `idx_ai_rag_inst_chunk` ON `ai_rag_corpus` (`institution_id`,`chunk_index`);--> statement-breakpoint
CREATE TABLE `ai_token_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`monthly_token_limit` integer DEFAULT 1000000 NOT NULL,
	`used_input_tokens` integer DEFAULT 0 NOT NULL,
	`used_output_tokens` integer DEFAULT 0 NOT NULL,
	`used_cached_tokens` integer DEFAULT 0 NOT NULL,
	`billing_cycle_start` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ai_token_budgets_inst` ON `ai_token_budgets` (`institution_id`);