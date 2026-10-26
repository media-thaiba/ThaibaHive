import { db } from "../../src/db";
import { staff } from "../../src/db/schema";

async function run() {
  const all = await db
    .select({
      id: staff.id,
      email: staff.email,
      role: staff.role,
      isFirstLogin: staff.isFirstLogin,
      googleSub: staff.googleSub,
    })
    .from(staff)
    .all();

  console.log("Total staff count:", all.length);
  const firstLogins = all.filter((s) => s.isFirstLogin);
  console.log("Staff with isFirstLogin=true:", firstLogins.length);
  console.log("Sample:", firstLogins.slice(0, 3));

  const superAdmins = all.filter((s) => s.role === "super_admin");
  console.log("Super admins:", superAdmins);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
