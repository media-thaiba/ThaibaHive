UPDATE "visitors" SET "institution_id" = COALESCE((SELECT "id" FROM "institutions" ORDER BY "created_at" ASC LIMIT 1), 'inst_default') WHERE "institution_id" IS NULL;--> statement-breakpoint
ALTER TABLE "visitors" ALTER COLUMN "institution_id" SET NOT NULL;
