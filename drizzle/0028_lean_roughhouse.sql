CREATE TABLE `financial_reconciliation_items` (
	`id` text PRIMARY KEY NOT NULL,
	`reconciliation_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_reference_id` text NOT NULL,
	`transaction_date` text NOT NULL,
	`amount` real NOT NULL,
	`match_status` text DEFAULT 'unmatched' NOT NULL,
	`matched_with_id` text,
	`variance_amount` real DEFAULT 0 NOT NULL,
	`resolution_notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`reconciliation_id`) REFERENCES `financial_reconciliations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_recon_item_rec_status` ON `financial_reconciliation_items` (`reconciliation_id`,`match_status`);--> statement-breakpoint
CREATE INDEX `idx_recon_item_source` ON `financial_reconciliation_items` (`source_type`,`source_reference_id`);--> statement-breakpoint
CREATE TABLE `financial_reconciliations` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`total_fee_ledger_amount` real DEFAULT 0 NOT NULL,
	`total_expense_ledger_amount` real DEFAULT 0 NOT NULL,
	`total_bank_statement_amount` real DEFAULT 0 NOT NULL,
	`unreconciled_variance` real DEFAULT 0 NOT NULL,
	`matched_item_count` integer DEFAULT 0 NOT NULL,
	`unmatched_item_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`reconciled_by_id` text,
	`audit_hash` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reconciled_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_recon_inst_period` ON `financial_reconciliations` (`institution_id`,`period_start`,`period_end`);--> statement-breakpoint
CREATE INDEX `idx_recon_status` ON `financial_reconciliations` (`status`);--> statement-breakpoint
CREATE TABLE `payroll_deductions` (
	`id` text PRIMARY KEY NOT NULL,
	`payroll_record_id` text NOT NULL,
	`deduction_type` text NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`payroll_record_id`) REFERENCES `payroll_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_payroll_deduction_rec` ON `payroll_deductions` (`payroll_record_id`);--> statement-breakpoint
CREATE TABLE `payroll_records` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`pay_period_month` integer NOT NULL,
	`pay_period_year` integer NOT NULL,
	`gross_earnings` real NOT NULL,
	`total_deductions` real NOT NULL,
	`tax_deduction` real DEFAULT 0 NOT NULL,
	`net_payable` real NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`payment_reference` text,
	`disbursed_at` text,
	`approved_by_id` text,
	`audit_hash` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payroll_rec_staff_period` ON `payroll_records` (`staff_id`,`pay_period_year`,`pay_period_month`);--> statement-breakpoint
CREATE INDEX `idx_payroll_rec_inst_status` ON `payroll_records` (`institution_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_payroll_rec_period` ON `payroll_records` (`pay_period_year`,`pay_period_month`);--> statement-breakpoint
CREATE TABLE `payroll_salary_structures` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`staff_id` text NOT NULL,
	`base_salary` real NOT NULL,
	`hra_allowance` real DEFAULT 0 NOT NULL,
	`da_allowance` real DEFAULT 0 NOT NULL,
	`special_allowance` real DEFAULT 0 NOT NULL,
	`pf_deduction_rate` real DEFAULT 0.12 NOT NULL,
	`tax_bracket_code` text DEFAULT 'STANDARD' NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`effective_date` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payroll_salary_staff_date` ON `payroll_salary_structures` (`staff_id`,`effective_date`);--> statement-breakpoint
CREATE INDEX `idx_payroll_salary_inst` ON `payroll_salary_structures` (`institution_id`);--> statement-breakpoint
CREATE TABLE `purchase_approval_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`purchase_request_id` text NOT NULL,
	`tier_level` integer NOT NULL,
	`approver_id` text NOT NULL,
	`action` text NOT NULL,
	`comments` text,
	`merkle_audit_hash` text NOT NULL,
	`prev_audit_hash` text,
	`action_timestamp` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`purchase_request_id`) REFERENCES `purchase_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approver_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_purchase_log_req` ON `purchase_approval_logs` (`purchase_request_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_log_approver` ON `purchase_approval_logs` (`approver_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_log_inst_time` ON `purchase_approval_logs` (`institution_id`,`action_timestamp`);--> statement-breakpoint
CREATE TABLE `purchase_approval_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`tier_level` integer NOT NULL,
	`name` text NOT NULL,
	`min_amount` real DEFAULT 0 NOT NULL,
	`max_amount` real,
	`required_role` text NOT NULL,
	`requires_sequential_approval` integer DEFAULT true NOT NULL,
	`auto_escalate_hours` integer DEFAULT 48 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_purchase_tier_inst_level` ON `purchase_approval_tiers` (`institution_id`,`tier_level`);--> statement-breakpoint
CREATE TABLE `tax_jurisdictions` (
	`id` text PRIMARY KEY NOT NULL,
	`country_code` text NOT NULL,
	`region_code` text NOT NULL,
	`jurisdiction_name` text NOT NULL,
	`default_tax_rate` real DEFAULT 0 NOT NULL,
	`tax_code` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tax_jur_country_region` ON `tax_jurisdictions` (`country_code`,`region_code`,`tax_code`);--> statement-breakpoint
CREATE INDEX `idx_tax_jur_active` ON `tax_jurisdictions` (`is_active`);--> statement-breakpoint
CREATE TABLE `tax_rate_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`jurisdiction_id` text NOT NULL,
	`category` text NOT NULL,
	`override_rate` real NOT NULL,
	`exemption_reason` text,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`approved_by_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`jurisdiction_id`) REFERENCES `tax_jurisdictions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_tax_override_inst_cat` ON `tax_rate_overrides` (`institution_id`,`category`,`is_active`);--> statement-breakpoint
CREATE INDEX `idx_tax_override_jur` ON `tax_rate_overrides` (`jurisdiction_id`);--> statement-breakpoint
CREATE INDEX `idx_tax_override_dates` ON `tax_rate_overrides` (`effective_from`,`effective_to`);