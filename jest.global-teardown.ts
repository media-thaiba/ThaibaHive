import fs from "node:fs";
import path from "node:path";

const SNAPSHOT_MARKER = "__JEST_DB_SNAPSHOT";

export default async function globalTeardown(): Promise<void> {
  if (process.env[SNAPSHOT_MARKER] !== "1") {
    return;
  }

  const target = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/^file:/, "") : path.join(process.cwd(), "test.db");
  for (const p of [target, `${target}-wal`, `${target}-shm`]) {
    try {
      // Windows can keep the snapshot locked until worker handles fully close;
      // retry briefly, and otherwise leave it for the next setup pass to remove.
      fs.rmSync(p, { force: true, maxRetries: 25, retryDelay: 200 });
    } catch {
      // see above — next globalSetup removes it before snapshotting
    }
  }
}
