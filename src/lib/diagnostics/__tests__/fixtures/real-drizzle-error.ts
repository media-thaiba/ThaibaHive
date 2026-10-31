import { db, sql } from "../../../../db";

async function run() {
  try {
    await db.run(sql`CREATE TABLE IF NOT EXISTS test_uniq (id TEXT PRIMARY KEY, email TEXT UNIQUE)`);
    await db.run(sql`INSERT INTO test_uniq (id, email) VALUES ('1', 'user@example.com')`);
    await db.run(sql`INSERT INTO test_uniq (id, email) VALUES ('2', 'user@example.com')`);
  } catch (err: any) {
    console.log("--- REAL DRIZZLE ERROR CAPTURE ---");
    console.log("err.message:\n" + err.message);
    console.log("Object.keys(err):", Object.keys(err));
    console.log("err.code:", err.code);
    console.log("err.cause?.code:", err.cause?.code);
    console.log("err.cause keys:", err.cause ? Object.keys(err.cause) : null);
    if (err.cause) {
      console.log("err.cause.rawCode:", (err.cause as any).rawCode);
      console.log("err.cause.message:", (err.cause as any).message);
    }
  } finally {
    try {
      await db.run(sql`DROP TABLE IF EXISTS test_uniq`);
    } catch {}
  }
}

run();
