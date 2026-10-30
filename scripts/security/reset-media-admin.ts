import { db, staff } from "../../src/db";
import { eq } from "drizzle-orm";

async function main() {
  await db
    .update(staff)
    .set({ googleSub: null, isFirstLogin: false })
    .where(eq(staff.email, "media@thaibagarden.com"))
    .run();

  const admin = await db
    .select({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      employeeId: staff.employeeId,
      isFirstLogin: staff.isFirstLogin,
      googleSub: staff.googleSub,
    })
    .from(staff)
    .where(eq(staff.email, "media@thaibagarden.com"))
    .get();

  console.log("Reset media@thaibagarden.com state:", admin);
}

main().catch(console.error);
