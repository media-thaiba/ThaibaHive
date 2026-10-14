import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const SNAPSHOT_MARKER = "__JEST_DB_SNAPSHOT";

export default async function globalSetup(): Promise<void> {
  const configured = process.env.DATABASE_URL;

  // CI and postgres jobs already point at ephemeral databases (file:./test.db
  // provisioned by db:migrate, or postgres://...). Only the persistent local
  // dev.db (explicit or default fallback) needs a per-run snapshot.
  if (configured && !configured.includes("dev.db")) {
    return;
  }

  const root = process.cwd();
  const source = path.join(root, "dev.db");
  const target = path.join(root, "test.db");

  if (!fs.existsSync(source)) {
    throw new Error(
      "dev.db not found — run `pnpm db:migrate` before `pnpm test` so the test snapshot has a schema to copy."
    );
  }

  for (const p of [target, `${target}-wal`, `${target}-shm`]) {
    fs.rmSync(p, { force: true });
  }

  // VACUUM INTO produces a consistent snapshot even when WAL sidecars exist.
  const client = createClient({ url: `file:${source}` });
  await client.execute({
    sql: "VACUUM INTO ?",
    args: [target.replaceAll("\\", "/")],
  });
  client.close();

  process.env[SNAPSHOT_MARKER] = "1";
  process.env.DATABASE_URL = `file:${target}`;
}
