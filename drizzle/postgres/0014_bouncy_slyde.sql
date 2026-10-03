ALTER TABLE "bookings" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "help_desk_tickets" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "meal_notifications" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "media_folders" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "visitors" ADD COLUMN "institution_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_desk_tickets" ADD CONSTRAINT "help_desk_tickets_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_notifications" ADD CONSTRAINT "meal_notifications_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;