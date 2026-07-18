import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./packages/db/schema.pg.ts",
  out: "./drizzle/postgres",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
