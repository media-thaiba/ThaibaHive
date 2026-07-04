import { defineConfig } from "drizzle-kit";

const isDev = process.env.NODE_ENV !== "production";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: isDev ? "sqlite" : "postgresql",
  ...(isDev
    ? { dbCredentials: { url: process.env.DATABASE_URL || "file:./dev.db" } }
    : {
        dbCredentials: {
          url: process.env.DATABASE_URL!,
          ssl: true,
        },
      }),
});
