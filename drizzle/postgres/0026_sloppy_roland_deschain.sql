ALTER TABLE "expense_claims" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_expense_claims_institution" ON "expense_claims" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_requests_institution" ON "purchase_requests" USING btree ("institution_id");