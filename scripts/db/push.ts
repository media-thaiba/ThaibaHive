import { execSync } from "child_process";
import fs from "fs";

function getEnvUrl(): string {
  let url = process.env.DATABASE_URL || "";
  if (!url && fs.existsSync(".env")) {
    for (const l of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
      if (l.startsWith("DATABASE_URL=")) {
        url = l.split("=")[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
  return url || "file:./dev.db";
}

const targetUrl = getEnvUrl();
const isRemote =
  targetUrl.startsWith("libsql://") ||
  targetUrl.startsWith("postgres://") ||
  targetUrl.startsWith("postgresql://");
const args = process.argv.slice(2);
const hasExplicitConfirm = args.includes("--accept-remote-mutation") || args.includes("--force");

if (isRemote && !hasExplicitConfirm) {
  console.error("\n==========================================================================");
  console.error("🛑 [db:push] REFUSING TO PUSH TO REMOTE DATABASE DIRECTLY");
  console.error(`   Target URL detected : ${targetUrl.split("@").pop()}`);
  console.error("==========================================================================");
  console.error("   Running 'db:push' against a remote database bypasses versioned migrations");
  console.error("   and can lead to non-transactional partial mutations on failure.");
  console.error("\n   👉 To push to your local SQLite dev database (recommended for prototyping):");
  console.error('      pnpm exec cross-env DATABASE_URL="file:./dev.db" pnpm db:push');
  console.error("\n   👉 To apply versioned migrations safely to remote:");
  console.error("      pnpm db:migrate");
  console.error("\n   👉 If you genuinely intend to push to remote, re-run with confirmation:");
  console.error("      pnpm db:push --accept-remote-mutation\n");
  process.exit(1);
}

const filteredArgs = args.filter(a => a !== "--accept-remote-mutation").join(" ");
const cmd = `drizzle-kit push ${filteredArgs}`.trim();
console.log(`[db:push] Executing '${cmd}' against ${targetUrl.split("@").pop()}...`);
execSync(cmd, { stdio: "inherit", env: process.env });
