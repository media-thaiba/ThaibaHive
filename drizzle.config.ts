import { defineConfig } from "drizzle-kit";

const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL || "file:./dev.db";
  const token = process.env.DATABASE_AUTH_TOKEN;
  if (token && baseUrl.startsWith("libsql://")) {
    return `${baseUrl}?authToken=${token}`;
  }
  return baseUrl;
};

export default defineConfig({
  schema: "./packages/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
