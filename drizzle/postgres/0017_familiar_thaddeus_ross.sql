CREATE TABLE "chat_channel_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"client_message_id" text,
	"content" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"reply_to_id" text,
	"attachment_url" text,
	"edited_at" text,
	"deleted_at" text,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'group' NOT NULL,
	"created_by_id" text NOT NULL,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT (current_timestamp) NOT NULL,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_members" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" text DEFAULT (current_timestamp) NOT NULL,
	"last_read_at" text,
	"muted_until" text
);
--> statement-breakpoint
CREATE TABLE "chat_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"staff_id" text NOT NULL,
	"status" text DEFAULT 'delivered' NOT NULL,
	"delivered_at" text DEFAULT (current_timestamp) NOT NULL,
	"read_at" text
);
--> statement-breakpoint
ALTER TABLE "chat_channel_messages" ADD CONSTRAINT "chat_channel_messages_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_channel_messages" ADD CONSTRAINT "chat_channel_messages_channel_id_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."chat_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_channel_messages" ADD CONSTRAINT "chat_channel_messages_sender_id_staff_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_created_by_id_staff_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_channel_id_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."chat_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_receipts" ADD CONSTRAINT "chat_receipts_message_id_chat_channel_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_channel_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_receipts" ADD CONSTRAINT "chat_receipts_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pg_chat_channel_msg_channel_created" ON "chat_channel_messages" USING btree ("channel_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_pg_chat_channel_msg_inst_channel" ON "chat_channel_messages" USING btree ("institution_id","channel_id");--> statement-breakpoint
CREATE INDEX "idx_pg_chat_channel_msg_sender_client" ON "chat_channel_messages" USING btree ("sender_id","client_message_id");--> statement-breakpoint
CREATE INDEX "idx_pg_chat_channels_inst_type" ON "chat_channels" USING btree ("institution_id","type","is_active");--> statement-breakpoint
CREATE INDEX "idx_pg_chat_channels_inst" ON "chat_channels" USING btree ("institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_chat_members_channel_staff" ON "chat_members" USING btree ("channel_id","staff_id");--> statement-breakpoint
CREATE INDEX "idx_pg_chat_members_staff" ON "chat_members" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_pg_chat_members_channel" ON "chat_members" USING btree ("channel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pg_chat_receipts_msg_staff" ON "chat_receipts" USING btree ("message_id","staff_id");--> statement-breakpoint
CREATE INDEX "idx_pg_chat_receipts_staff" ON "chat_receipts" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_announcements_title" ON "announcements" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_events_title" ON "events" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_staff_name" ON "staff" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_students_name" ON "students" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_students_email" ON "students" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pg_tasks_title" ON "tasks" USING btree ("title");