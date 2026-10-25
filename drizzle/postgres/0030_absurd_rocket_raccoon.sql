CREATE TABLE "step_up_used" (
	"jti" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"action" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"used_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"institution_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"client_ip" text,
	"user_agent" text,
	"device_type" text,
	"login_at" bigint NOT NULL,
	"last_active_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL,
	"logout_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "step_up_used" ADD CONSTRAINT "step_up_used_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pg_user_sessions_staff_status" ON "user_sessions" USING btree ("staff_id","status");--> statement-breakpoint
CREATE INDEX "idx_pg_user_sessions_status" ON "user_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pg_user_sessions_expires_at" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_pg_user_sessions_last_active_at" ON "user_sessions" USING btree ("last_active_at");--> statement-breakpoint
ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "step_up_used" ENABLE ROW LEVEL SECURITY;
