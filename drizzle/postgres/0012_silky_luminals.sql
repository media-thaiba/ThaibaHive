CREATE TABLE "agent_approval_gates" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"step_id" text,
	"institution_id" text NOT NULL,
	"required_permission" text DEFAULT 'agent:workflows:approve' NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approver_id" text,
	"decision_reason" text,
	"expires_at" text,
	"decided_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_memory_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"scope" text DEFAULT 'episodic' NOT NULL,
	"content_json" text NOT NULL,
	"importance" double precision DEFAULT 1 NOT NULL,
	"source_ref" text,
	"embedding" text,
	"last_accessed_at" text,
	"expires_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_outbox_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"topic" text NOT NULL,
	"sender_agent_id" text NOT NULL,
	"recipient_agent_id" text,
	"payload_json" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"scheduled_for" text,
	"delivered_at" text,
	"trace_id" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_tool_invocations" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"tool_name" text NOT NULL,
	"institution_id" text NOT NULL,
	"status" text NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"input_hash" text NOT NULL,
	"output_hash" text,
	"error" text,
	"audit_hash" text NOT NULL,
	"prev_audit_hash" text NOT NULL,
	"trace_id" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agentic_workflow_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"trigger_type" text DEFAULT 'manual' NOT NULL,
	"triggered_by" text DEFAULT 'system' NOT NULL,
	"context_json" text,
	"error" text,
	"trace_id" text,
	"started_at" text,
	"finished_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agentic_workflow_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"step_key" text NOT NULL,
	"agent_id" text NOT NULL,
	"tool_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"input_json" text,
	"output_json" text,
	"compensation_json" text,
	"attempt" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" text,
	"finished_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agentic_workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"definition_json" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_reconciliation_items" (
	"id" text PRIMARY KEY NOT NULL,
	"reconciliation_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_reference_id" text NOT NULL,
	"transaction_date" text NOT NULL,
	"amount" double precision NOT NULL,
	"match_status" text DEFAULT 'unmatched' NOT NULL,
	"matched_with_id" text,
	"variance_amount" double precision DEFAULT 0 NOT NULL,
	"resolution_notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_reconciliations" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"total_fee_ledger_amount" double precision DEFAULT 0 NOT NULL,
	"total_expense_ledger_amount" double precision DEFAULT 0 NOT NULL,
	"total_bank_statement_amount" double precision DEFAULT 0 NOT NULL,
	"unreconciled_variance" double precision DEFAULT 0 NOT NULL,
	"matched_item_count" integer DEFAULT 0 NOT NULL,
	"unmatched_item_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"reconciled_by_id" text,
	"audit_hash" text NOT NULL,
	"notes" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_deductions" (
	"id" text PRIMARY KEY NOT NULL,
	"payroll_record_id" text NOT NULL,
	"deduction_type" text NOT NULL,
	"amount" double precision NOT NULL,
	"description" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_records" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"pay_period_month" integer NOT NULL,
	"pay_period_year" integer NOT NULL,
	"gross_earnings" double precision NOT NULL,
	"total_deductions" double precision NOT NULL,
	"tax_deduction" double precision DEFAULT 0 NOT NULL,
	"net_payable" double precision NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"payment_reference" text,
	"disbursed_at" text,
	"approved_by_id" text,
	"audit_hash" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_salary_structures" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"base_salary" double precision NOT NULL,
	"hra_allowance" double precision DEFAULT 0 NOT NULL,
	"da_allowance" double precision DEFAULT 0 NOT NULL,
	"special_allowance" double precision DEFAULT 0 NOT NULL,
	"pf_deduction_rate" double precision DEFAULT 0.12 NOT NULL,
	"tax_bracket_code" text DEFAULT 'STANDARD' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"effective_date" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_approval_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"purchase_request_id" text NOT NULL,
	"tier_level" integer NOT NULL,
	"approver_id" text NOT NULL,
	"action" text NOT NULL,
	"comments" text,
	"merkle_audit_hash" text NOT NULL,
	"prev_audit_hash" text,
	"action_timestamp" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_approval_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"tier_level" integer NOT NULL,
	"name" text NOT NULL,
	"min_amount" double precision DEFAULT 0 NOT NULL,
	"max_amount" double precision,
	"required_role" text NOT NULL,
	"requires_sequential_approval" boolean DEFAULT true NOT NULL,
	"auto_escalate_hours" integer DEFAULT 48 NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_jurisdictions" (
	"id" text PRIMARY KEY NOT NULL,
	"country_code" text NOT NULL,
	"region_code" text NOT NULL,
	"jurisdiction_name" text NOT NULL,
	"default_tax_rate" double precision DEFAULT 0 NOT NULL,
	"tax_code" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rate_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"jurisdiction_id" text NOT NULL,
	"category" text NOT NULL,
	"override_rate" double precision NOT NULL,
	"exemption_reason" text,
	"effective_from" text NOT NULL,
	"effective_to" text,
	"approved_by_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_approval_gates" ADD CONSTRAINT "agent_approval_gates_run_id_agentic_workflow_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agentic_workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_approval_gates" ADD CONSTRAINT "agent_approval_gates_step_id_agentic_workflow_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."agentic_workflow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_approval_gates" ADD CONSTRAINT "agent_approval_gates_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_approval_gates" ADD CONSTRAINT "agent_approval_gates_approver_id_staff_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_memory_entries" ADD CONSTRAINT "agent_memory_entries_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_outbox_messages" ADD CONSTRAINT "agent_outbox_messages_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tool_invocations" ADD CONSTRAINT "agent_tool_invocations_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentic_workflow_runs" ADD CONSTRAINT "agentic_workflow_runs_workflow_id_agentic_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."agentic_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentic_workflow_runs" ADD CONSTRAINT "agentic_workflow_runs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentic_workflow_steps" ADD CONSTRAINT "agentic_workflow_steps_run_id_agentic_workflow_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agentic_workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentic_workflow_steps" ADD CONSTRAINT "agentic_workflow_steps_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentic_workflows" ADD CONSTRAINT "agentic_workflows_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentic_workflows" ADD CONSTRAINT "agentic_workflows_created_by_staff_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_reconciliation_items" ADD CONSTRAINT "financial_reconciliation_items_reconciliation_id_financial_reconciliations_id_fk" FOREIGN KEY ("reconciliation_id") REFERENCES "public"."financial_reconciliations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_reconciliations" ADD CONSTRAINT "financial_reconciliations_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_reconciliations" ADD CONSTRAINT "financial_reconciliations_reconciled_by_id_staff_id_fk" FOREIGN KEY ("reconciled_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_payroll_record_id_payroll_records_id_fk" FOREIGN KEY ("payroll_record_id") REFERENCES "public"."payroll_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_approved_by_id_staff_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_salary_structures" ADD CONSTRAINT "payroll_salary_structures_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_salary_structures" ADD CONSTRAINT "payroll_salary_structures_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_approval_logs" ADD CONSTRAINT "purchase_approval_logs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_approval_logs" ADD CONSTRAINT "purchase_approval_logs_purchase_request_id_purchase_requests_id_fk" FOREIGN KEY ("purchase_request_id") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_approval_logs" ADD CONSTRAINT "purchase_approval_logs_approver_id_staff_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_approval_tiers" ADD CONSTRAINT "purchase_approval_tiers_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rate_overrides" ADD CONSTRAINT "tax_rate_overrides_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rate_overrides" ADD CONSTRAINT "tax_rate_overrides_jurisdiction_id_tax_jurisdictions_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."tax_jurisdictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rate_overrides" ADD CONSTRAINT "tax_rate_overrides_approved_by_id_staff_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pg_gate_run" ON "agent_approval_gates" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_pg_gate_inst" ON "agent_approval_gates" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_pg_gate_status" ON "agent_approval_gates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pg_gate_expires" ON "agent_approval_gates" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_pg_mem_agent" ON "agent_memory_entries" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_pg_mem_inst" ON "agent_memory_entries" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_pg_mem_scope" ON "agent_memory_entries" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "idx_pg_mem_expires" ON "agent_memory_entries" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_pg_outbox_inst_status" ON "agent_outbox_messages" USING btree ("institution_id","status");--> statement-breakpoint
CREATE INDEX "idx_pg_outbox_topic" ON "agent_outbox_messages" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "idx_pg_outbox_priority" ON "agent_outbox_messages" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_pg_outbox_sched" ON "agent_outbox_messages" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_pg_tool_inv_inst_time" ON "agent_tool_invocations" USING btree ("institution_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_pg_tool_inv_prev_hash" ON "agent_tool_invocations" USING btree ("prev_audit_hash");--> statement-breakpoint
CREATE INDEX "idx_pg_tool_inv_agent" ON "agent_tool_invocations" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_pg_tool_inv_tool" ON "agent_tool_invocations" USING btree ("tool_name");--> statement-breakpoint
CREATE INDEX "idx_pg_tool_inv_trace" ON "agent_tool_invocations" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "idx_pg_wf_run_wf" ON "agentic_workflow_runs" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "idx_pg_wf_run_inst" ON "agentic_workflow_runs" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_pg_wf_run_status" ON "agentic_workflow_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pg_wf_run_trace" ON "agentic_workflow_runs" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "idx_pg_wf_step_run" ON "agentic_workflow_steps" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_pg_wf_step_key" ON "agentic_workflow_steps" USING btree ("run_id","step_key");--> statement-breakpoint
CREATE INDEX "idx_pg_wf_step_status" ON "agentic_workflow_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pg_wf_inst" ON "agentic_workflows" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_pg_wf_status" ON "agentic_workflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pg_recon_item_rec_status" ON "financial_reconciliation_items" USING btree ("reconciliation_id","match_status");--> statement-breakpoint
CREATE INDEX "idx_pg_recon_item_source" ON "financial_reconciliation_items" USING btree ("source_type","source_reference_id");--> statement-breakpoint
CREATE INDEX "idx_pg_recon_inst_period" ON "financial_reconciliations" USING btree ("institution_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_pg_recon_status" ON "financial_reconciliations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pg_payroll_deduction_rec" ON "payroll_deductions" USING btree ("payroll_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_payroll_rec_staff_period" ON "payroll_records" USING btree ("staff_id","pay_period_year","pay_period_month");--> statement-breakpoint
CREATE INDEX "idx_pg_payroll_rec_inst_status" ON "payroll_records" USING btree ("institution_id","status");--> statement-breakpoint
CREATE INDEX "idx_pg_payroll_rec_period" ON "payroll_records" USING btree ("pay_period_year","pay_period_month");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_payroll_salary_staff_date" ON "payroll_salary_structures" USING btree ("staff_id","effective_date");--> statement-breakpoint
CREATE INDEX "idx_pg_payroll_salary_inst" ON "payroll_salary_structures" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_pg_purchase_log_req" ON "purchase_approval_logs" USING btree ("purchase_request_id");--> statement-breakpoint
CREATE INDEX "idx_pg_purchase_log_approver" ON "purchase_approval_logs" USING btree ("approver_id");--> statement-breakpoint
CREATE INDEX "idx_pg_purchase_log_inst_time" ON "purchase_approval_logs" USING btree ("institution_id","action_timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_purchase_tier_inst_level" ON "purchase_approval_tiers" USING btree ("institution_id","tier_level");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_tax_jur_country_region" ON "tax_jurisdictions" USING btree ("country_code","region_code","tax_code");--> statement-breakpoint
CREATE INDEX "idx_pg_tax_jur_active" ON "tax_jurisdictions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_pg_tax_override_inst_cat" ON "tax_rate_overrides" USING btree ("institution_id","category","is_active");--> statement-breakpoint
CREATE INDEX "idx_pg_tax_override_jur" ON "tax_rate_overrides" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "idx_pg_tax_override_dates" ON "tax_rate_overrides" USING btree ("effective_from","effective_to");