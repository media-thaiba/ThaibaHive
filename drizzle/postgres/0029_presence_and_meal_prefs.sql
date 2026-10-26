CREATE TABLE "staff_meal_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"default_breakfast" text DEFAULT 'eating' NOT NULL,
	"default_lunch" text DEFAULT 'eating' NOT NULL,
	"default_dinner" text DEFAULT 'eating' NOT NULL,
	"skip_start_date" text,
	"skip_end_date" text,
	"recurring_skip_days" text,
	"updated_at" text DEFAULT (current_timestamp) NOT NULL,
	CONSTRAINT "staff_meal_preferences_staff_id_unique" UNIQUE("staff_id")
);
--> statement-breakpoint
ALTER TABLE "presence" ADD COLUMN "expires_at" text;--> statement-breakpoint
ALTER TABLE "staff_availability" ADD COLUMN "expires_at" text;--> statement-breakpoint
ALTER TABLE "staff_meal_preferences" ADD CONSTRAINT "staff_meal_preferences_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;
