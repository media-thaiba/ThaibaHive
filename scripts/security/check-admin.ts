import { db, staff } from "../../src/db";
import { eq } from "drizzle-orm";

async function main() {
  const admin = await db.select().from(staff).where(eq(staff.email, "media@thaibagarden.com")).get();
  console.log("media@thaibagarden.com in DB:", admin ? { id: admin.id, email: admin.email, role: admin.role, employeeId: admin.employeeId } : "NOT FOUND");

  const asnk = await db.select().from(staff).where(eq(staff.email, "asnk633@gmail.com")).get();
  console.log("asnk633@gmail.com in DB:", asnk ? { id: asnk.id, email: asnk.email, role: asnk.role } : "NOT FOUND");
}

main().catch(console.error);
