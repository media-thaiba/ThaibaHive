const { db } = require("../packages/db");
const { staff } = require("../packages/db/schema");
const { eq } = require("drizzle-orm");

async function main() {
  console.log("[Test Query] Executing SELECT on staff...");
  try {
    const user = await db
      .select({ isActive: staff.isActive, tokenVersion: staff.tokenVersion })
      .from(staff)
      .where(eq(staff.id, "34c45253-9416-4512-9fb6-179e257e346b"))
      .get();
    console.log("[Test Query] Success, User:", user);
  } catch (e) {
    console.error("[Test Query] Error:", e);
  }
}

main().then(() => process.exit(0));
