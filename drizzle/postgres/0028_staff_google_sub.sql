ALTER TABLE "staff" ADD COLUMN "google_sub" text;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_google_sub_unique" UNIQUE("google_sub");
