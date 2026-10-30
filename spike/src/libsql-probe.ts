import { createClient, Client } from "@libsql/client";
import * as fs from "node:fs";

export async function runLibsqlSequentialTransactionProbe(dbFilePath: string): Promise<{
  tx1Pragma: number;
  tx1OrphanRejected: boolean;
  tx2Pragma: number;
  tx2OrphanRejected: boolean;
  nonTxOrphanRejected: boolean;
}> {
  // Clean file if exists
  if (fs.existsSync(dbFilePath)) {
    try { fs.unlinkSync(dbFilePath); } catch (_) {}
  }

  const client: Client = createClient({ url: `file:${dbFilePath}` });

  try {
    // Setup test tables
    await client.execute("CREATE TABLE _probe_parent (id TEXT PRIMARY KEY);");
    await client.execute(
      "CREATE TABLE _probe_child (id TEXT PRIMARY KEY, parent_id TEXT NOT NULL REFERENCES _probe_parent(id) ON DELETE RESTRICT);"
    );

    // Initial activation
    await client.execute("PRAGMA foreign_keys = ON;");

    // --- TX 1 (mode: "write") ---
    const tx1 = await client.transaction("write");
    let tx1Pragma = 0;
    let tx1OrphanRejected = false;
    try {
      const p1 = await tx1.execute("PRAGMA foreign_keys;");
      tx1Pragma = Number(p1.rows[0]?.[0] ?? p1.rows[0]?.foreign_keys);

      try {
        await tx1.execute({
          sql: "INSERT INTO _probe_child (id, parent_id) VALUES (?, ?);",
          args: ["child-1", "non-existent-parent"],
        });
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (msg.includes("FOREIGN KEY") || msg.includes("SQLITE_CONSTRAINT")) {
          tx1OrphanRejected = true;
        }
      }
      await tx1.rollback();
    } catch (err) {
      try { await tx1.rollback(); } catch (_) {}
      throw err;
    }

    // --- TX 2 (sequential transaction) ---
    const tx2 = await client.transaction("write");
    let tx2Pragma = 0;
    let tx2OrphanRejected = false;
    try {
      const p2 = await tx2.execute("PRAGMA foreign_keys;");
      tx2Pragma = Number(p2.rows[0]?.[0] ?? p2.rows[0]?.foreign_keys);

      try {
        await tx2.execute({
          sql: "INSERT INTO _probe_child (id, parent_id) VALUES (?, ?);",
          args: ["child-2", "non-existent-parent"],
        });
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (msg.includes("FOREIGN KEY") || msg.includes("SQLITE_CONSTRAINT")) {
          tx2OrphanRejected = true;
        }
      }
      await tx2.rollback();
    } catch (err) {
      try { await tx2.rollback(); } catch (_) {}
      throw err;
    }

    // --- Non-transactional query ---
    let nonTxOrphanRejected = false;
    try {
      await client.execute({
        sql: "INSERT INTO _probe_child (id, parent_id) VALUES (?, ?);",
        args: ["child-3", "non-existent-parent"],
      });
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("FOREIGN KEY") || msg.includes("SQLITE_CONSTRAINT")) {
        nonTxOrphanRejected = true;
      }
    }

    return {
      tx1Pragma,
      tx1OrphanRejected,
      tx2Pragma,
      tx2OrphanRejected,
      nonTxOrphanRejected,
    };
  } finally {
    client.close();
  }
}
