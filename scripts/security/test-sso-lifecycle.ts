import { POST } from "../../src/app/api/auth/google/route";
import { db, staff } from "../../src/db";
import { eq } from "drizzle-orm";

async function testSsoLifecycle() {
  console.log("===============================================================");
  console.log("   TEST: AUTHORIZED STAFF SSO LIFECYCLE & IDENTITY BINDING    ");
  console.log("===============================================================\n");

  const mediaEmail = "media@thaibagarden.com";
  const mediaSub = "google_sub_media_official_12345";
  const hijackerSub = "google_sub_attacker_99999";
  const clientId = "test-client-id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_IDS = clientId;
  process.env.AUTH_JWT_SECRET = "test-secret-at-least-32-chars-long-security-key";

  // 1. Seed media@thaibagarden.com as super_admin without googleSub (Day 0 state)
  await db.delete(staff).where(eq(staff.email, mediaEmail));
  await db.insert(staff).values({
    id: "staff_root_media_admin",
    email: mediaEmail,
    employeeId: "ROOT-DIR-001",
    firstName: "Media",
    lastName: "Admin",
    role: "super_admin",
    isActive: true,
    isFirstLogin: false,
    googleSub: null, // Day 0: unlinked until first SSO
  });

  console.log("1. Seeded root admin 'media@thaibagarden.com' (googleSub: null)");

  let currentSubToMock = mediaSub;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    if (String(input).includes("googleapis.com/tokeninfo")) {
      return new Response(
        JSON.stringify({
          email: mediaEmail,
          email_verified: "true",
          name: "Media Admin",
          sub: currentSubToMock,
          aud: clientId,
          exp: String(Math.floor(Date.now() / 1000) + 3600),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return originalFetch(input);
  };

  try {
    // 2. First SSO login -> should atomically bind googleSub
    console.log("2. Simulating First SSO login for media@thaibagarden.com...");
    const req1 = new Request("https://thaiba-hive.vercel.app/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "valid_first_token" }),
    });

    const res1 = await POST(req1);
    const data1 = await res1.json();
    console.log("  Status:", res1.status, "| Role:", data1.user?.role, "| Has Token:", Boolean(data1.token));

    const updatedRow = await db.select().from(staff).where(eq(staff.email, mediaEmail)).get();
    console.log("  Bound googleSub in DB:", updatedRow?.googleSub);
    const passBind = res1.status === 200 && updatedRow?.googleSub === mediaSub;

    // 3. Second SSO login with same sub -> should authenticate smoothly
    console.log("3. Simulating Subsequent SSO login with same verified sub...");
    const req2 = new Request("https://thaiba-hive.vercel.app/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "valid_second_token" }),
    });
    const res2 = await POST(req2);
    console.log("  Status:", res2.status, "| Re-authenticated successfully");
    const passReauth = res2.status === 200;

    // 4. Hijacking simulation: Different Google account tries to present media@ email with different sub
    console.log("4. Simulating Hijacking attempt: different Google sub presenting media@ email...");
    currentSubToMock = hijackerSub;
    const req3 = new Request("https://thaiba-hive.vercel.app/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "hijacker_token" }),
    });
    const res3 = await POST(req3);
    const data3 = await res3.json();
    console.log("  Status:", res3.status, "| Code:", data3.code, "| Error:", data3.error);
    const passHijackBlock = res3.status === 403 && data3.code === "ACCOUNT_IDENTITY_MISMATCH";

    // 5. Deactivation simulation: admin deactivates staff member
    console.log("5. Simulating Deactivated staff login...");
    await db.update(staff).set({ isActive: false }).where(eq(staff.email, mediaEmail));
    currentSubToMock = mediaSub; // Restore valid sub
    const req4 = new Request("https://thaiba-hive.vercel.app/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "valid_token_after_deactivation" }),
    });
    const res4 = await POST(req4);
    const data4 = await res4.json();
    console.log("  Status:", res4.status, "| Code:", data4.code, "| Error:", data4.error);
    const passDeactivatedBlock = res4.status === 403 && data4.code === "ACCOUNT_DEACTIVATED";

    console.log("\n---------------------------------------------------------------");
    console.log("VERIFICATION CRITERIA:");
    console.log("  1. Atomic Google Sub Binding on First Login: ", passBind ? "✅ PASS" : "❌ FAIL");
    console.log("  2. Subsequent Verified SSO Login:            ", passReauth ? "✅ PASS" : "❌ FAIL");
    console.log("  3. Hijacking / Sub Mismatch Blocked:         ", passHijackBlock ? "✅ PASS" : "❌ FAIL");
    console.log("  4. Deactivated Account Blocked:              ", passDeactivatedBlock ? "✅ PASS" : "❌ FAIL");
    console.log("---------------------------------------------------------------\n");

    if (!passBind || !passReauth || !passHijackBlock || !passDeactivatedBlock) {
      process.exit(1);
    }
  } finally {
    globalThis.fetch = originalFetch;
    // Restore media@thaibagarden.com to active super_admin
    await db.update(staff).set({ isActive: true, googleSub: null }).where(eq(staff.email, mediaEmail));
  }
}

testSsoLifecycle().catch(console.error);
