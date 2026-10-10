CREATE TABLE "ai_copilot_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"channel_type" text DEFAULT 'text' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"context_json" text,
	"total_turns" integer DEFAULT 0 NOT NULL,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"last_interaction_at" text DEFAULT (current_timestamp) NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"ended_at" text
);
--> statement-breakpoint
CREATE TABLE "ai_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"mime_type" text NOT NULL,
	"document_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"confidence_score" double precision,
	"extracted_data_json" text,
	"validation_errors_json" text,
	"confirmed_by_id" text,
	"confirmed_at" text,
	"target_entity_type" text,
	"target_entity_id" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_rag_corpus" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"title" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text,
	"chunk_index" integer NOT NULL,
	"chunk_content" text NOT NULL,
	"parent_section" text,
	"embedding" text,
	"metadata_json" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_token_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"monthly_token_limit" integer DEFAULT 1000000 NOT NULL,
	"used_input_tokens" integer DEFAULT 0 NOT NULL,
	"used_output_tokens" integer DEFAULT 0 NOT NULL,
	"used_cached_tokens" integer DEFAULT 0 NOT NULL,
	"billing_cycle_start" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_copilot_sessions" ADD CONSTRAINT "ai_copilot_sessions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_copilot_sessions" ADD CONSTRAINT "ai_copilot_sessions_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_documents" ADD CONSTRAINT "ai_documents_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_documents" ADD CONSTRAINT "ai_documents_uploaded_by_id_staff_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_documents" ADD CONSTRAINT "ai_documents_confirmed_by_id_staff_id_fk" FOREIGN KEY ("confirmed_by_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_rag_corpus" ADD CONSTRAINT "ai_rag_corpus_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_token_budgets" ADD CONSTRAINT "ai_token_budgets_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pg_ai_sessions_inst_staff" ON "ai_copilot_sessions" USING btree ("institution_id","staff_id");--> statement-breakpoint
CREATE INDEX "idx_pg_ai_sessions_inst_status" ON "ai_copilot_sessions" USING btree ("institution_id","status");--> statement-breakpoint
CREATE INDEX "idx_pg_ai_documents_inst_status" ON "ai_documents" USING btree ("institution_id","status");--> statement-breakpoint
CREATE INDEX "idx_pg_ai_documents_inst_type" ON "ai_documents" USING btree ("institution_id","document_type");--> statement-breakpoint
CREATE INDEX "idx_pg_ai_documents_inst_created" ON "ai_documents" USING btree ("institution_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_pg_ai_rag_inst_source" ON "ai_rag_corpus" USING btree ("institution_id","source_type");--> statement-breakpoint
CREATE INDEX "idx_pg_ai_rag_inst_chunk" ON "ai_rag_corpus" USING btree ("institution_id","chunk_index");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_ai_token_budgets_inst" ON "ai_token_budgets" USING btree ("institution_id");