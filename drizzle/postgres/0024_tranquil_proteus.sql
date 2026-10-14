CREATE TABLE "conference_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"room_id" text NOT NULL,
	"sender_peer_id" text NOT NULL,
	"recipient_peer_id" text NOT NULL,
	"signal_type" text NOT NULL,
	"payload_json" text NOT NULL,
	"sequence_num" integer DEFAULT 1 NOT NULL,
	"delivered" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sso_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"provider_id" text,
	"provider_type" text NOT NULL,
	"event_type" text NOT NULL,
	"subject_id" text,
	"ip_address" text,
	"user_agent" text,
	"prev_hash" text,
	"merkle_hash" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "federated_identity_mappings" ADD COLUMN "institution_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "federated_identity_mappings" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "federated_identity_mappings" ADD COLUMN "external_email" text;--> statement-breakpoint
ALTER TABLE "federated_identity_mappings" ADD COLUMN "external_groups_json" text;--> statement-breakpoint
ALTER TABLE "federated_identity_mappings" ADD COLUMN "jit_provisioned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "oidc_providers" ADD COLUMN "institution_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "oidc_providers" ADD COLUMN "authorization_endpoint" text;--> statement-breakpoint
ALTER TABLE "oidc_providers" ADD COLUMN "token_endpoint" text;--> statement-breakpoint
ALTER TABLE "oidc_providers" ADD COLUMN "userinfo_endpoint" text;--> statement-breakpoint
ALTER TABLE "oidc_providers" ADD COLUMN "jwks_uri" text;--> statement-breakpoint
ALTER TABLE "oidc_providers" ADD COLUMN "scopes" text DEFAULT 'openid email profile' NOT NULL;--> statement-breakpoint
ALTER TABLE "oidc_providers" ADD COLUMN "discovery_cache_json" text;--> statement-breakpoint
ALTER TABLE "oidc_providers" ADD COLUMN "jwks_cache_json" text;--> statement-breakpoint
ALTER TABLE "oidc_providers" ADD COLUMN "cache_expires_at" text;--> statement-breakpoint
ALTER TABLE "saml_providers" ADD COLUMN "institution_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "saml_providers" ADD COLUMN "slo_url" text;--> statement-breakpoint
ALTER TABLE "saml_providers" ADD COLUMN "cert_expires_at" text;--> statement-breakpoint
ALTER TABLE "saml_providers" ADD COLUMN "binding" text DEFAULT 'HTTP-POST' NOT NULL;--> statement-breakpoint
ALTER TABLE "saml_providers" ADD COLUMN "want_assertions_signed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "saml_providers" ADD COLUMN "attribute_mapping_json" text;--> statement-breakpoint
ALTER TABLE "stream_recordings" ADD COLUMN "institution_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "stream_recordings" ADD COLUMN "checksum_sha256" text;--> statement-breakpoint
ALTER TABLE "stream_recordings" ADD COLUMN "is_encrypted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stream_recordings" ADD COLUMN "retention_days" integer DEFAULT 90 NOT NULL;--> statement-breakpoint
ALTER TABLE "streaming_rooms" ADD COLUMN "institution_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "streaming_rooms" ADD COLUMN "passcode_hash" text;--> statement-breakpoint
ALTER TABLE "streaming_rooms" ADD COLUMN "is_e2ee_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "streaming_rooms" ADD COLUMN "room_type" text DEFAULT 'conference' NOT NULL;--> statement-breakpoint
ALTER TABLE "streaming_rooms" ADD COLUMN "recording_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "streaming_rooms" ADD COLUMN "expires_at" text;--> statement-breakpoint
ALTER TABLE "streaming_sessions" ADD COLUMN "institution_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "streaming_sessions" ADD COLUMN "peer_id" text;--> statement-breakpoint
ALTER TABLE "streaming_sessions" ADD COLUMN "e2ee_public_key" text;--> statement-breakpoint
ALTER TABLE "streaming_sessions" ADD COLUMN "connection_quality" text DEFAULT 'good';--> statement-breakpoint
ALTER TABLE "streaming_sessions" ADD COLUMN "is_screen_sharing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conference_signals" ADD CONSTRAINT "conference_signals_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conference_signals" ADD CONSTRAINT "conference_signals_room_id_streaming_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."streaming_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_audit_logs" ADD CONSTRAINT "sso_audit_logs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conference_signals_inst_id" ON "conference_signals" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_conference_signals_room_recip" ON "conference_signals" USING btree ("room_id","recipient_peer_id");--> statement-breakpoint
CREATE INDEX "idx_conference_signals_created" ON "conference_signals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_sso_audit_inst_id" ON "sso_audit_logs" USING btree ("institution_id");--> statement-breakpoint
ALTER TABLE "federated_identity_mappings" ADD CONSTRAINT "federated_identity_mappings_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "federated_identity_mappings" ADD CONSTRAINT "federated_identity_mappings_user_id_staff_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oidc_providers" ADD CONSTRAINT "oidc_providers_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saml_providers" ADD CONSTRAINT "saml_providers_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_recordings" ADD CONSTRAINT "stream_recordings_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_recordings" ADD CONSTRAINT "stream_recordings_room_id_streaming_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."streaming_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_rooms" ADD CONSTRAINT "streaming_rooms_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_sessions" ADD CONSTRAINT "streaming_sessions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_sessions" ADD CONSTRAINT "streaming_sessions_room_id_streaming_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."streaming_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fim_inst_id" ON "federated_identity_mappings" USING btree ("institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_fim_unique_sub" ON "federated_identity_mappings" USING btree ("institution_id","provider_type","external_subject_id");--> statement-breakpoint
CREATE INDEX "idx_oidc_providers_inst_id" ON "oidc_providers" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_saml_providers_inst_id" ON "saml_providers" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_stream_recordings_inst_id" ON "stream_recordings" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_streaming_rooms_inst_id" ON "streaming_rooms" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_streaming_sessions_inst_id" ON "streaming_sessions" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "idx_streaming_sessions_room_peer" ON "streaming_sessions" USING btree ("room_id","peer_id");