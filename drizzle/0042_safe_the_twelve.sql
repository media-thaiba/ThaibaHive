ALTER TABLE `expense_claims` ADD `institution_id` text REFERENCES institutions(id);--> statement-breakpoint
CREATE INDEX `idx_expense_claims_institution` ON `expense_claims` (`institution_id`);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `institution_id` text REFERENCES institutions(id);--> statement-breakpoint
CREATE INDEX `idx_purchase_requests_institution` ON `purchase_requests` (`institution_id`);