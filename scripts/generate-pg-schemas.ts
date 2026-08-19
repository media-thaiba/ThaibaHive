import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

function convertSchema(inputPath: string, outputPath: string) {
  console.log(`Converting ${inputPath} -> ${outputPath}...`);
  let content = readFileSync(inputPath, "utf8");

  // 1. Replace the import from sqlite-core to pg-core, adding jsonb
  const sqliteImportRegex = /import\s+\{\s*sqliteTable,\s*text,\s*integer,\s*real,\s*uniqueIndex\s*\}\s*from\s*"drizzle-orm\/sqlite-core";/g;
  const pgImport = `import { pgTable as sqliteTable, text, integer, doublePrecision as real, boolean, uniqueIndex, jsonb } from "drizzle-orm/pg-core";`;
  content = content.replace(sqliteImportRegex, pgImport);

  // 2. Convert integer(..., { mode: "boolean" }) to boolean(...)
  const booleanRegex = /integer\(\s*(".*?"|'.*?')\s*,\s*\{\s*mode:\s*["']boolean["']\s*\}\s*\)/g;
  content = content.replace(booleanRegex, 'boolean($1)');

  // 3. Convert text(..., { mode: "json" }) to jsonb(...)
  const jsonRegex = /text\(\s*(".*?"|'.*?')\s*,\s*\{\s*mode:\s*["']json["']\s*\}\s*\)/g;
  content = content.replace(jsonRegex, 'jsonb($1)');

  // 4. Save the converted file
  writeFileSync(outputPath, content, "utf8");
  console.log(`Successfully generated PostgreSQL schema at: ${outputPath}`);
}

// Convert shared packages/db/schema.ts
const sharedInput = join(process.cwd(), "packages", "db", "schema.ts");
const sharedOutput = join(process.cwd(), "packages", "db", "schema.pg.ts");
convertSchema(sharedInput, sharedOutput);

// Convert mobile api src/db/schema.ts
const mobileInput = join(process.cwd(), "thaibahive_mobile_app", "api", "src", "db", "schema.ts");
const mobileOutput = join(process.cwd(), "thaibahive_mobile_app", "api", "src", "db", "schema.pg.ts");
convertSchema(mobileInput, mobileOutput);
