CREATE TABLE "mobile_sync_processed" (
	"client_event_id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"action" text NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mobile_sync_processed" ADD CONSTRAINT "mobile_sync_processed_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mobile_sync_processed_staff" ON "mobile_sync_processed" USING btree ("staff_id");