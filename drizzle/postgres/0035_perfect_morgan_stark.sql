CREATE TABLE "surveillance_consents" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text DEFAULT 'global' NOT NULL,
	"user_id" text NOT NULL,
	"user_type" text DEFAULT 'student' NOT NULL,
	"has_consented_surveillance" boolean DEFAULT false NOT NULL,
	"has_consented_facial_auth" boolean DEFAULT false NOT NULL,
	"parental_consent_verified" boolean DEFAULT false NOT NULL,
	"parental_guardian_id" text,
	"parental_consent_at" text,
	"parental_consent_method" text,
	"opted_out_zone_ids" jsonb,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_surveillance_consents_tenant_user" ON "surveillance_consents" USING btree ("institution_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_pg_surveillance_consents_user_type" ON "surveillance_consents" USING btree ("user_type");