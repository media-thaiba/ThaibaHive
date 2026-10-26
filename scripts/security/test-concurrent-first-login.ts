import { db, staff } from "../../src/db";
import { eq, and, sql } from "drizzle-orm";

async function simulateFirstLoginBind(staffId: string, email: string, sub: string) {
  const staffMember = await db
    .select()
    .from(staff)
    .where(eq(staff.id, staffId))
    .get();

  if (!staffMember) throw new Error("Staff not found");

  const now = new Date().toISOString();

  if (!staffMember.googleSub) {
    const updatedRows = await db
      .update(staff)
      .set({
        googleSub: sub,
        emailVerifiedAt: staffMember.emailVerifiedAt || now,
        updatedAt: now,
      })
      .where(and(eq(staff.id, staffMember.id), sql`${staff.googleSub} is null`))
      .returning();

    if (!updatedRows || updatedRows.length === 0) {
      const recheck = await db
        .select()
        .from(staff)
        .where(eq(staff.id, staffMember.id))
        .get();

      if (!recheck || recheck.googleSub !== sub) {
        return { status: 403, code: "ACCOUNT_IDENTITY_MISMATCH" };
      }
      return { status: 200, code: "BOUND_VIA_RACE_SAME_SUB" };
    }
    return { status: 200, code: "BOUND_FIRST_WINNER" };
  } else if (staffMember.googleSub !== sub) {
    return { status: 403, code: "ACCOUNT_IDENTITY_MISMATCH" };
  }

  return { status: 200, code: "EXISTING_SUB_MATCH" };
}

async function run() {
  console.log("=== Testing Concurrent First-Login Races ===");

  // Reset media admin sub to null
  await db.update(staff).set({ googleSub: null }).where(eq(staff.email, "media@thaibagarden.com")).run();

  const target = await db.select().from(staff).where(eq(staff.email, "media@thaibagarden.com")).get();
  if (!target) throw new Error("media@thaibagarden.com not found");

  // 1. Two concurrent requests with the SAME sub (e.g. mobile app double-tap)
  console.log("\n[Test 1] Simulating 2 concurrent logins with SAME Google sub...");
  const [res1, res2] = await Promise.all([
    simulateFirstLoginBind(target.id, target.email, "google-sub-legit-12345"),
    simulateFirstLoginBind(target.id, target.email, "google-sub-legit-12345"),
  ]);
  console.log("Result 1:", res1);
  console.log("Result 2:", res2);
  const bothSucceeded = (res1.status === 200) && (res2.status === 200);
  console.log("Both concurrent identical-identity requests got sessions:", bothSucceeded);

  // 2. Repeat login with the bound sub
  console.log("\n[Test 2] Repeat login with same bound sub...");
  const repeat = await simulateFirstLoginBind(target.id, target.email, "google-sub-legit-12345");
  console.log("Repeat login result:", repeat);

  // 3. Impersonation / Race with a DIFFERENT sub (attacker racing at the exact same moment)
  console.log("\n[Test 3] Attempt login with DIFFERENT sub (attacker)...");
  const attacker = await simulateFirstLoginBind(target.id, target.email, "google-sub-attacker-99999");
  console.log("Attacker result:", attacker);

  // Reset back to null for production readiness
  await db.update(staff).set({ googleSub: null }).where(eq(staff.email, "media@thaibagarden.com")).run();
  console.log("\nCleaned up media@thaibagarden.com (googleSub reset to null).");

  if (bothSucceeded && repeat.status === 200 && attacker.status === 403) {
    console.log("\n✅ ALL CONCURRENT FIRST-LOGIN RACE TESTS PASSED!");
  } else {
    throw new Error("Concurrent first login test failed");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
